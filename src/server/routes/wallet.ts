import express from "express";
import { getSupabase, getPlatformSettings } from "../db";
import { logAudit } from "../audit";
import {  sendTelegram, getSuperAdminUsername, deductFromWallet , getServicePrices } from "../helpers";

const router = express.Router();

// Deposit request to wallet
router.post("/api/wallet/balance", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Fetch wallet balance and bonus
    let balance = 0;
    let bonus = 0;
    let total = 0;
    
    if (auth.role === "accountant") {
       const { data: userData, error: uErr } = await supabase
        .from("zobon_main")
        .select("wallet_balance")
        .eq("main_id", auth.mainId);
       if (uErr) throw uErr;
       balance = userData && userData.length > 0 ? parseFloat(userData[0].wallet_balance || 0) : 0;
       bonus = 0;
       total = balance;
    } else {
       const { data: userData, error: uErr } = await supabase
        .from("zobon_main")
        .select("wallet_balance, wallet_bonus")
        .eq("main_id", auth.mainId);
        
       if (uErr) throw uErr;
       balance = userData && userData.length > 0 ? parseFloat(userData[0].wallet_balance || 0) : 0;
       bonus = userData && userData.length > 0 ? parseFloat(userData[0].wallet_bonus || 0) : 0;
       total = balance + bonus;
    }

    // Fetch history
    const historyQuery = supabase
      .from("wallet_transactions")
      .select("*")
      .eq("main_id", auth.mainId)
      .order("created_at", { ascending: false })
      .limit(1000);

    const { data: historyData } = await historyQuery;
    const computedHistory = historyData || [];

    return res.json({ 
      success: true, 
      balance,
      bonus,
      total,
      history: computedHistory 
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Deposit request to wallet
router.post("/api/wallet/deposit", async (req, res) => {
  const { auth, amount, notes, receiptUrl } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const depAmount = parseFloat(amount);
  if (isNaN(depAmount) || depAmount <= 0) {
    return res.json({ success: false, message: "مبلغ الإيداع غير صالح." });
  }

  try {
    const supabase = getSupabase();
    const payload = {
      main_id: auth.mainId,
      amount: depAmount,
      notes: notes || "",
      receipt_url: receiptUrl || "",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("wallet_deposits").insert([payload]);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "DEPOSIT_REQUESTED", "wallet_deposits", null, null, payload);

    // Telegram notification
    const { data: mgr } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", auth.mainId);
    const mgrName = mgr && mgr.length > 0 ? mgr[0].full_name : "مدير مالي";
    sendTelegram(`💰 <b>طلب شحن محفظة جديد قيد الانتظار!</b>\n\n▪️ <b>المرسل:</b> ${mgrName} (@${auth.username})\n▪️ <b>المبلغ:</b> ${depAmount}$\n▪️ <b>الملاحظات:</b> ${notes || "لا يوجد"}`);

    return res.json({ success: true, message: "تم إرسال طلب الشحن بنجاح وهو قيد التدقيق والمراجعة من قبل الإدارة العليا حالياً." });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Approve deposit (Super Admin Only)
router.post("/api/wallet/approve-deposit", async (req, res) => {
  const { auth, depositId } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    // Fetch deposit details
    const { data: deposit } = await supabase.from("wallet_deposits").select("*").eq("deposit_id", depositId);
    if (!deposit || deposit.length === 0) return res.json({ success: false, message: "طلب الإيداع غير موجود." });

    const dep = deposit[0];
    if (dep.status !== "pending") return res.json({ success: false, message: "هذا الطلب تمت معالجته مسبقاً." });

    // Fetch user current wallet
    const { data: manager } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", dep.main_id);
    if (!manager || manager.length === 0) throw new Error("المدير صاحب المحفظة غير موجود.");

    const currentBalance = parseFloat(manager[0].wallet_balance || 0);
    const currentBonus = parseFloat(manager[0].wallet_bonus || 0);
    const depAmt = parseFloat(dep.amount);

    // Calculate Bonus percent based on tiers from settings
    const settings = await getPlatformSettings();
    const t1Amt = parseFloat(settings.wallet_bonus_tier1_amount || "50");
    const t1Pct = parseFloat(settings.wallet_bonus_tier1_percent || "10");
    const t2Amt = parseFloat(settings.wallet_bonus_tier2_amount || "100");
    const t2Pct = parseFloat(settings.wallet_bonus_tier2_percent || "20");
    const t3Amt = parseFloat(settings.wallet_bonus_tier3_amount || "200");
    const t3Pct = parseFloat(settings.wallet_bonus_tier3_percent || "30");

    let bonusPercent = 0;
    if (depAmt >= t3Amt) bonusPercent = t3Pct;
    else if (depAmt >= t2Amt) bonusPercent = t2Pct;
    else if (depAmt >= t1Amt) bonusPercent = t1Pct;

    const bonusAdded = (depAmt * bonusPercent) / 100;

    const newBalance = currentBalance + depAmt;
    const newBonus = currentBonus + bonusAdded;

    // 1. Update deposit status
    await supabase.from("wallet_deposits").update({ status: "approved" }).eq("deposit_id", depositId);

    // 2. Update manager wallet
    await supabase.from("zobon_main").update({
      wallet_balance: newBalance,
      wallet_bonus: newBonus,
    }).eq("main_id", dep.main_id);
    
    // Also increase owner's wallet by the deposit amount
    const superAdminUsername2 = await getSuperAdminUsername();
    const { data: ownerData2 } = await supabase.from("zobon_main").select("main_id, wallet_balance").eq("username", superAdminUsername2).single();
    if (ownerData2 && ownerData2.main_id !== dep.main_id) {
       const newOwnerBalance = parseFloat(ownerData2.wallet_balance || 0) + depAmt;
       await supabase.from("zobon_main").update({ wallet_balance: newOwnerBalance }).eq("main_id", ownerData2.main_id);
       
       // Log transaction for the owner
       const { data: mgrInfoForOwner } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", dep.main_id).single();
       const mgrName = mgrInfoForOwner ? `${mgrInfoForOwner.full_name} (@${mgrInfoForOwner.username})` : `المدير المالي`;
       await supabase.from("wallet_transactions").insert([{
         main_id: ownerData2.main_id,
         amount: depAmt,
         type: "charge",
         description: `شحن رصيد للمدير: ${mgrName} (موافقة على طلب رقم #${depositId})`,
         target_type: "charge",
         target_id: depositId,
         balance_after: newOwnerBalance,
         created_at: new Date().toISOString()
       }]);
    }

    // 3. Log main deposit transaction
    await supabase.from("wallet_transactions").insert([
      {
        main_id: dep.main_id,
        amount: depAmt,
        type: "charge",
        description: `شحن رصيد المحفظة رقم الطلب #${depositId}`,
        target_type: "charge",
        target_id: depositId,
        balance_after: newBalance,
        created_at: new Date().toISOString(),
      },
    ]);

    // 4. Log bonus transaction if applied
    if (bonusAdded > 0) {
      await supabase.from("wallet_transactions").insert([
        {
          main_id: dep.main_id,
          amount: bonusAdded,
          type: "bonus",
          description: `مكافأة شحن شريحة الإيداع (${bonusPercent}%) رقم الطلب #${depositId}`,
          target_type: "charge",
          target_id: depositId,
          balance_after: newBalance, // remains relative to main balance
          created_at: new Date().toISOString(),
        },
      ]);
    }

    await logAudit(auth.userId, auth.role, "DEPOSIT_APPROVED", "wallet_deposits", depositId, dep, {
      status: "approved",
      bonusAdded,
      newBalance,
      newBonus,
    });

    // Telegram notification
    const { data: destMgr } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", dep.main_id);
    const destName = destMgr && destMgr.length > 0 ? destMgr[0].full_name : "المدير المالي";
    sendTelegram(`✅ <b>تم الموافقة على شحن المحفظة وتثبيت الرصيد!</b>\n\n▪️ <b>المرسل إليه:</b> ${destName} (@${destMgr ? destMgr[0].username : ""})\n▪️ <b>المبلغ الأساسي:</b> ${depAmt}$\n▪️ <b>بونص مكافأة الشحن:</b> ${bonusAdded}$ (${bonusPercent}%)\n▪️ <b>الحالة الجديدة للمحفظة:</b> الرصيد الإجمالي تم شحنه بنجاح.`);

    return res.json({ success: true, message: `تم الموافقة بنجاح وشحن المحفظة بمبلغ ${depAmt}$ وبونص ترويجي ${bonusAdded}$!` });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Decline deposit (Super Admin Only)
router.post("/api/wallet/decline-deposit", async (req, res) => {
  const { auth, depositId } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const { data: deposit } = await supabase.from("wallet_deposits").select("*").eq("deposit_id", depositId);
    if (!deposit || deposit.length === 0) return res.json({ success: false, message: "طلب الإيداع غير موجود." });

    const dep = deposit[0];
    if (dep.status !== "pending") return res.json({ success: false, message: "الطلب تمت معالجته مسبقاً." });

    await supabase.from("wallet_deposits").update({ status: "declined" }).eq("deposit_id", depositId);

    await logAudit(auth.userId, auth.role, "DEPOSIT_DECLINED", "wallet_deposits", depositId, dep, { status: "declined" });
    return res.json({ success: true, message: "تم رفض وإلغاء طلب الشحن بنجاح." });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Pending deposits list (Super Admin Only)
router.get("/api/wallet/pending-deposits", async (req, res) => {
  const tokenUser = (req as any).body?.auth || {};

  if (!tokenUser || !tokenUser.isSuperAdmin) {
    return res.status(401).json({ success: false, message: "Super Admin only." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("wallet_deposits")
      .select("*, zobon_main(full_name, username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Add manual bonus/credit (Super Admin Only)
router.post("/api/wallet/add-bonus", async (req, res) => {
  const { auth, managerId, bonusAmount, targetMainId, amount, description } = req.body;
  const targetId = targetMainId || managerId;
  const addedAmt = amount || bonusAmount;
  
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const { data: target } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", targetId);
    if (!target || target.length === 0) return res.json({ success: false, message: "المدير المستهدف غير موجود." });

    const currentBal = parseFloat(target[0].wallet_balance || 0);
    const currentBonus = parseFloat(target[0].wallet_bonus || 0);
    const added = parseFloat(addedAmt);
    if (isNaN(added) || added <= 0) return res.json({ success: false, message: "المبلغ المدخل غير صالح." });

    const newBonus = currentBonus + added;

    await supabase.from("zobon_main").update({ wallet_bonus: newBonus }).eq("main_id", targetId);

    await supabase.from("wallet_transactions").insert([
      {
        main_id: targetId,
        amount: added,
        type: "bonus",
        description: description || "هدية رصيد ترويجي يدوي من الإدارة العليا",
        target_type: "manual",
        target_id: null,
        balance_after: currentBal + newBonus,
        created_at: new Date().toISOString(),
      },
    ]);

    // Also update owner's bonus wallet if target is not the owner
    const superAdminUsername = await getSuperAdminUsername();
    const { data: ownerData } = await supabase.from("zobon_main").select("main_id, wallet_balance, wallet_bonus").eq("username", superAdminUsername).single();
    if (ownerData && ownerData.main_id !== targetId) {
       const newOwnerBonus = parseFloat(ownerData.wallet_bonus || 0) + added;
       await supabase.from("zobon_main").update({ wallet_bonus: newOwnerBonus }).eq("main_id", ownerData.main_id);

       const { data: targetMgrInfo } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", targetId).single();
       const mgrName = targetMgrInfo ? `${targetMgrInfo.full_name} (@${targetMgrInfo.username})` : `المدير المالي`;
       await supabase.from("wallet_transactions").insert([{
         main_id: ownerData.main_id,
         amount: added,
         type: "bonus",
         description: `شحن بونص للمدير: ${mgrName} (${description || "هدية رصيد ترويجي يدوي"})`,
         target_type: "manual",
         target_id: null,
         balance_after: parseFloat(ownerData.wallet_balance || 0) + newOwnerBonus,
         created_at: new Date().toISOString()
       }]);
    }

    await logAudit(auth.userId, auth.role, "MANUAL_BONUS_ADDED", "zobon_main", targetId, { wallet_bonus: currentBonus }, { wallet_bonus: newBonus });

    return res.json({ success: true, message: `🎁 تم منح رصيد ترويجي ترحيبي بمقدار ${added}$ للمدير بنجاح!` });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Super Admin: Charge Wallet
router.post("/api/wallet/charge", async (req, res) => {
  const { auth, targetMainId, amount, description } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check if superadmin
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const val = parseFloat(amount);
    if (val <= 0 || isNaN(val)) return res.status(400).json({ success: false, message: "مبلغ غير صالح." });

    const { data: user } = await supabase.from("zobon_main").select("wallet_balance").eq("main_id", targetMainId);
    if (!user || user.length === 0) return res.status(404).json({ success: false, message: "المستلم غير موجود." });

    const newBalance = parseFloat(user[0].wallet_balance || 0) + val;
    const { error: updErr } = await supabase.from("zobon_main").update({ wallet_balance: newBalance }).eq("main_id", targetMainId);
    if (updErr) throw updErr;
    
    // Also increase owner's wallet by the same amount
    const superAdminUsername = await getSuperAdminUsername();
    const { data: ownerData } = await supabase.from("zobon_main").select("main_id, wallet_balance").eq("username", superAdminUsername).single();
    if (ownerData && ownerData.main_id !== targetMainId) {
       const newOwnerBalance = parseFloat(ownerData.wallet_balance || 0) + val;
       await supabase.from("zobon_main").update({ wallet_balance: newOwnerBalance }).eq("main_id", ownerData.main_id);
       
       // Log transaction for the owner
       const { data: targetMgrInfo } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", targetMainId).single();
       const mgrName = targetMgrInfo ? `${targetMgrInfo.full_name} (@${targetMgrInfo.username})` : `المدير المالي`;
       await supabase.from("wallet_transactions").insert([{
         main_id: ownerData.main_id,
         amount: val,
         type: "charge",
         description: `شحن رصيد للمدير: ${mgrName} (${description || "شحن رصيد إداري"})`,
         target_type: "manual",
         target_id: null,
         balance_after: newOwnerBalance,
         created_at: new Date().toISOString()
       }]);
    }

    await supabase.from("wallet_transactions").insert([{
      main_id: targetMainId,
      amount: val,
      type: "charge",
      description: description || "شحن رصيد إداري",
      target_type: "manual",
      target_id: null,
      balance_after: newBalance,
      created_at: new Date().toISOString()
    }]);

    await logAudit(auth.userId, auth.role, "WALLET_CHARGE", "zobon_main", targetMainId, { old_balance: user[0].wallet_balance }, { new_balance: newBalance });
    return res.json({ success: true, message: "تم شحن الرصيد بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Super Admin: Deduct Wallet or Bonus
router.post("/api/wallet/deduct", async (req, res) => {
  const { auth, targetMainId, amount, description, source } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const val = parseFloat(amount);
    if (val <= 0 || isNaN(val)) return res.status(400).json({ success: false, message: "مبلغ غير صالح." });

    const { data: user } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", targetMainId);
    if (!user || user.length === 0) return res.status(404).json({ success: false, message: "المستلم غير موجود." });

    let payload: any = {};
    let txType = "";

    if (source === "bonus") {
      const currentBonus = parseFloat(user[0].wallet_bonus || 0);
      if (currentBonus < val) return res.json({ success: false, message: "رصيد البونص غير كافٍ للخصم." });
      payload.wallet_bonus = currentBonus - val;
      txType = "Deduct Bonus";
    } else {
      const currentBalance = parseFloat(user[0].wallet_balance || 0);
      if (currentBalance < val) return res.json({ success: false, message: "الرصيد الأساسي غير كافٍ للخصم." });
      payload.wallet_balance = currentBalance - val;
      txType = "Deduct Balance";
    }

    const { error: updErr } = await supabase.from("zobon_main").update(payload).eq("main_id", targetMainId);
    if (updErr) throw updErr;

    // Also update owner's wallet (cash or bonus) if target is not the owner
    const superAdminUsername = await getSuperAdminUsername();
    const { data: ownerData } = await supabase.from("zobon_main").select("main_id, wallet_balance, wallet_bonus").eq("username", superAdminUsername).single();
    if (ownerData && ownerData.main_id !== targetMainId) {
       const { data: targetMgrInfo } = await supabase.from("zobon_main").select("full_name, username").eq("main_id", targetMainId).single();
       const mgrName = targetMgrInfo ? `${targetMgrInfo.full_name} (@${targetMgrInfo.username})` : `المدير المالي`;

       if (source === "bonus") {
          const newOwnerBonus = parseFloat(ownerData.wallet_bonus || 0) - val;
          await supabase.from("zobon_main").update({ wallet_bonus: newOwnerBonus }).eq("main_id", ownerData.main_id);

          await supabase.from("wallet_transactions").insert([{
            main_id: ownerData.main_id,
            amount: -val,
            type: "deduct",
            description: `خصم بونص من المدير: ${mgrName} (${description || "خصم إداري"})`,
            target_type: "manual",
            target_id: null,
            balance_after: parseFloat(ownerData.wallet_balance || 0) + newOwnerBonus,
            created_at: new Date().toISOString()
          }]);
       } else {
          const newOwnerBalance = parseFloat(ownerData.wallet_balance || 0) - val;
          await supabase.from("zobon_main").update({ wallet_balance: newOwnerBalance }).eq("main_id", ownerData.main_id);

          await supabase.from("wallet_transactions").insert([{
            main_id: ownerData.main_id,
            amount: -val,
            type: "deduct",
            description: `خصم رصيد من المدير: ${mgrName} (${description || "خصم إداري"})`,
            target_type: "manual",
            target_id: null,
            balance_after: newOwnerBalance + parseFloat(ownerData.wallet_bonus || 0),
            created_at: new Date().toISOString()
          }]);
       }
    }

    // Fetch manager balance to compute balance_after
    const { data: mgrData } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", targetMainId).single();
    const finalBalance = mgrData ? parseFloat(mgrData.wallet_balance || 0) : 0;
    const finalBonus = mgrData ? parseFloat(mgrData.wallet_bonus || 0) : 0;
    const balanceAfter = finalBalance + finalBonus;

    await supabase.from("wallet_transactions").insert([{
      main_id: targetMainId,
      amount: -val,
      type: "deduct",
      description: description || "خصم إداري",
      target_type: "manual",
      target_id: null,
      balance_after: balanceAfter,
      created_at: new Date().toISOString()
    }]);

    await logAudit(auth.userId, auth.role, "WALLET_DEDUCT", "zobon_main", targetMainId, null, payload);
    return res.json({ success: true, message: "تم الخصم بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Transfer funds between managers
router.post("/api/wallet/transfer", async (req, res) => {
  const { auth, recipientUsername, amount, notes } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return res.json({ success: false, message: "مبلغ التحويل غير صالح." });

  const cleanRecipientUsername = recipientUsername ? recipientUsername.trim() : "";
  if (!cleanRecipientUsername) {
    return res.json({ success: false, message: "يرجى أدخال اسم المستخدم المحول له." });
  }

  try {
    const supabase = getSupabase();

    // 1. Locate recipient by username (case-insensitive)
    const { data: rec } = await supabase
      .from("zobon_main")
      .select("main_id, full_name, username, wallet_balance")
      .ilike("username", cleanRecipientUsername);

    if (!rec || rec.length === 0) {
      return res.json({ success: false, message: "اسم المستخدم المحول له غير مسجل في الموقع." });
    }

    const recipient = rec[0];
    if (recipient.main_id === auth.mainId) {
      return res.json({ success: false, message: "لا يمكنك التحويل لنفس حسابك!" });
    }

    // 2. Fetch sender wallet details
    const { data: sender } = await supabase
      .from("zobon_main")
      .select("main_id, full_name, username, wallet_balance")
      .eq("main_id", auth.mainId);

    if (!sender || sender.length === 0) throw new Error("حساب المرسل غير موجود.");

    const senderInfo = sender[0];
    const senderBal = parseFloat(senderInfo.wallet_balance || 0);

    if (senderBal < val) {
      return res.json({ success: false, message: `رصيد الكاش في محفظتك غير كافٍ. المتوفر حالياً: ${senderBal}$` });
    }

    // 3. Deduct from sender
    const newSenderBal = senderBal - val;
    await supabase.from("zobon_main").update({ wallet_balance: newSenderBal }).eq("main_id", auth.mainId);

    // 4. Add to recipient
    const recipientBal = parseFloat(recipient.wallet_balance || 0);
    const newRecBal = recipientBal + val;
    await supabase.from("zobon_main").update({ wallet_balance: newRecBal }).eq("main_id", recipient.main_id);

    const senderNameDisplay = senderInfo.full_name ? `${senderInfo.full_name} (@${senderInfo.username})` : `@${senderInfo.username}`;
    const recipientNameDisplay = recipient.full_name ? `${recipient.full_name} (@${recipient.username})` : `@${recipient.username}`;
    const reasonText = notes && notes.trim() ? notes.trim() : "تحويل مالي";
    const nowIso = new Date().toISOString();

    // 5. Log transaction for sender
    await supabase.from("wallet_transactions").insert([
      {
        main_id: auth.mainId,
        amount: -val,
        type: "deduct",
        description: `تحويل صادرة إلى: ${recipientNameDisplay} | السبب: ${reasonText}`,
        target_type: "manager",
        target_id: recipient.main_id,
        balance_after: newSenderBal,
        created_at: nowIso,
      },
    ]);

    // 6. Log transaction for recipient
    await supabase.from("wallet_transactions").insert([
      {
        main_id: recipient.main_id,
        amount: val,
        type: "charge",
        description: `تحويل واردة من: ${senderNameDisplay} | السبب: ${reasonText}`,
        target_type: "manager",
        target_id: auth.mainId,
        balance_after: newRecBal,
        created_at: nowIso,
      },
    ]);

    await logAudit(auth.userId, auth.role, "WALLET_TRANSFER", "zobon_main", recipient.main_id, { amount: val }, { from: auth.mainId, to: recipient.main_id });
    
    // Telegram notification
    sendTelegram(`💸 <b>حركة تحويل مالي بين المحافظ!</b>\n\n▪️ <b>المرسل:</b> ${senderNameDisplay}\n▪️ <b>المستقبل:</b> ${recipientNameDisplay}\n▪️ <b>المبلغ المحول:</b> ${val}$\n▪️ <b>السبب/البيان:</b> ${reasonText}`);

    return res.json({ 
      success: true, 
      message: `✅ تم تحويل مبلغ ${val}$ بنجاح إلى حساب ${recipientNameDisplay}!`,
      newBalance: newSenderBal
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});


// Transfer funds between Manager and Accountant
router.post("/api/wallet/transfer-accountant", async (req, res) => {
  const { auth, accountantId, action, amount, notes } = req.body;
  if (!auth || auth.role !== "admin") return res.status(401).json({ success: false, message: "غير مصرح." });

  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return res.json({ success: false, message: "المبلغ غير صالح." });

  try {
    const supabase = getSupabase();

    // 1. Locate accountant record
    const { data: rec } = await supabase.from("accountants").select("main_id, full_name, username, accountant_id").eq("accountant_id", accountantId);
    if (!rec || rec.length === 0) return res.json({ success: false, message: "المحاسب غير موجود." });

    const accountant = rec[0];
    if (accountant.main_id !== auth.mainId) return res.json({ success: false, message: "المحاسب غير تابع لك!" });

    // 2. Extract accountant's clean manager username
    const cleanUsername = accountant.username ? accountant.username.split("_m")[0] : accountant.username;

    // 3. Find assistant's manager account in zobon_main
    const { data: assistantZobon } = await supabase
      .from("zobon_main")
      .select("main_id, full_name, wallet_balance, username")
      .eq("username", cleanUsername);

    if (!assistantZobon || assistantZobon.length === 0) {
      return res.json({ success: false, message: `تعذر العثور على حساب المدير الخاص بالمساعد (@${cleanUsername}).` });
    }

    const assistantUser = assistantZobon[0];

    // 4. Fetch manager wallet details
    const { data: manager } = await supabase.from("zobon_main").select("wallet_balance").eq("main_id", auth.mainId);
    if (!manager || manager.length === 0) throw new Error("المدير غير موجود.");

    const managerBal = parseFloat(manager[0].wallet_balance || 0);
    const assistantBal = parseFloat(assistantUser.wallet_balance || 0);

    if (action === "pay") { // صرف للمحاسب
      if (managerBal < val) {
        return res.json({ success: false, message: `رصيدك غير كافٍ. المتوفر بمحفظتك الأساسية: ${managerBal}$ ولا يشمل البونص.` });
      }
      const newManagerBal = managerBal - val;
      const newAssistantBal = assistantBal + val;

      // Update manager balance
      const { data: updatedManager } = await supabase
        .from("zobon_main")
        .update({ wallet_balance: newManagerBal })
        .eq("main_id", auth.mainId)
        .eq("wallet_balance", managerBal)
        .select();

      if (!updatedManager || updatedManager.length === 0) {
        return res.json({ success: false, message: "حدث تعارض بتحديث الرصيد للمدير، حاول مجددًا." });
      }

      // Update assistant's manager wallet in zobon_main
      const { data: updatedAssistant, error: aErr } = await supabase
        .from("zobon_main")
        .update({ wallet_balance: newAssistantBal })
        .eq("main_id", assistantUser.main_id)
        .select();

      if (aErr || !updatedAssistant || updatedAssistant.length === 0) {
        // Rollback manager balance
        await supabase.from("zobon_main").update({ wallet_balance: managerBal }).eq("main_id", auth.mainId);
        return res.json({ success: false, message: "حدث تعارض بتحديث الرصيد في محفظة المساعد، حاول مجددًا." });
      }

      const nowStr = new Date().toISOString();

      // Log transaction for Manager
      await supabase.from("wallet_transactions").insert([
        {
          main_id: auth.mainId,
          amount: -val,
          type: "deduct",
          description: `صرف دفعة للمحاسب المساعد ${accountant.full_name} (@${cleanUsername}) | ${notes || ""}`,
          target_type: "accountant",
          target_id: accountantId,
          balance_after: newManagerBal,
          created_at: nowStr,
        },
      ]);

      // Log transaction for Assistant in their own zobon_main wallet history
      await supabase.from("wallet_transactions").insert([
        {
          main_id: assistantUser.main_id,
          amount: val,
          type: "charge",
          description: `دفعة محولة من المدير @${auth.username || "المدير"} | ${notes || ""}`,
          target_type: "manager",
          target_id: auth.mainId,
          balance_after: newAssistantBal,
          created_at: nowStr,
        },
      ]);

      await logAudit(auth.userId, auth.role, "WALLET_TRANSFER_ACCOUNTANT", "zobon_main", assistantUser.main_id, { amount: val }, { from: auth.mainId, to: assistantUser.main_id });

      sendTelegram(`💸 <b>حركة تحويل رصيد للمحاسب المساعد!</b>\n\n▪️ <b>المدير:</b> @${auth.username}\n▪️ <b>المحاسب المساعد:</b> ${accountant.full_name} (@${cleanUsername})\n▪️ <b>المبلغ المحول:</b> ${val}$\n▪️ <b>البيان:</b> ${notes || "لا يوجد"}`);

      return res.json({ success: true, message: `✅ تم تحويل مبلغ ${val}$ بنجاح إلى محفظة المساعد كمدير (@${cleanUsername})!` });
    } else {
      return res.json({ success: false, message: "نوع العملية غير صالح." });
    }
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Get wallet history
router.get("/api/wallet/history", async (req, res) => {
  const tokenUser = (req as any).body?.auth || {};
  if (!tokenUser.userId) return res.status(401).json({ success: false, message: "Unauthorized." });

  try {
    const supabase = getSupabase();
    
    // Fetch wallet transaction logs
    let logs = [];
    if (tokenUser.role === "accountant") {
      const { data: accLogs, error: lErr } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("target_type", "accountant")
        .eq("target_id", tokenUser.userId)
        .order("created_at", { ascending: false });
      if (lErr) throw lErr;
      
      // Reverse the amount and type for the accountant's perspective
      logs = (accLogs || []).map(t => {
        const amt = -parseFloat(t.amount);
        return {
          ...t,
          amount: amt,
          type: amt > 0 ? "charge" : "deduct"
        };
      });
    } else {
      const { data: mgrLogs, error: lErr } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("main_id", tokenUser.mainId)
        .order("created_at", { ascending: false });
      if (lErr) throw lErr;
      logs = mgrLogs || [];
    }

    // Fetch pending and approved deposit receipts
    const { data: deposits, error: dErr } = await supabase
      .from("wallet_deposits")
      .select("*")
      .eq("main_id", tokenUser.mainId)
      .order("created_at", { ascending: false });

    if (dErr) throw dErr;

    return res.json({
      success: true,
      transactions: logs || [],
      deposits: deposits || [],
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Renew Client/Merchant Subscription using Wallet
router.post("/api/wallet/can-add-client", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });
  
  try {
    const supabase = getSupabase();
    const { clientPrice: price } = await getServicePrices();

    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isOwner = myData && myData.length > 0 && myData[0].username === await getSuperAdminUsername();
    
    if (auth.isSuperAdmin || isOwner || price <= 0) {
      return res.json({ success: true, canAdd: true, isFree: true, isOwner });
    }

    const { data: user } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", auth.mainId);
    const balance = user && user.length > 0 ? parseFloat(user[0].wallet_balance || 0) : 0;
    const bonus = user && user.length > 0 ? parseFloat(user[0].wallet_bonus || 0) : 0;
    if ((balance + bonus) >= price) {
      return res.json({ success: true, canAdd: true, isFree: false, cost: price });
    } else {
      return res.json({ success: true, canAdd: false });
    }
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

router.post("/api/wallet/can-add-accountant", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });
  
  try {
    const supabase = getSupabase();
    const { accountantPrice: price } = await getServicePrices();

    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isOwner = myData && myData.length > 0 && myData[0].username === await getSuperAdminUsername();
    
    if (auth.isSuperAdmin || isOwner || price <= 0) {
      return res.json({ success: true, canAdd: true, isFree: true, isOwner });
    }

    const { data: user } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", auth.mainId);
    const balance = user && user.length > 0 ? parseFloat(user[0].wallet_balance || 0) : 0;
    const bonus = user && user.length > 0 ? parseFloat(user[0].wallet_bonus || 0) : 0;
    if ((balance + bonus) >= price) {
      return res.json({ success: true, canAdd: true, isFree: false, cost: price });
    } else {
      return res.json({ success: true, canAdd: false });
    }
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Renew Client/Merchant Subscription using Wallet
router.post("/api/subscription/renew-client", async (req, res) => {
  const { auth, clientId } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  try {
    const supabase = getSupabase();
    
    const { data: client } = await supabase.from("clients").select("*").eq("client_id", clientId);
    if (!client || client.length === 0) return res.json({ success: false, message: "التاجر المستهدف غير موجود." });

    const cl = client[0];
    if (cl.main_id !== auth.mainId && !auth.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "غير مصرح بتجديد اشتراك هذا التاجر." });
    }

    const { clientPrice: price } = await getServicePrices();

    // Deduct cost from wallet
    await deductFromWallet(auth.mainId, price, `تجديد اشتراك تاجر شهري: ${cl.company_name}`, "client_renewal", clientId);

    // Calculate new end_date (add 1 year to existing end_date if active, or from today if expired)
    const today = new Date();
    let currentEndDate = cl.end_date ? new Date(cl.end_date) : today;
    if (currentEndDate < today) currentEndDate = today;

    currentEndDate.setFullYear(currentEndDate.getFullYear() + 1);
    const newEndDateStr = currentEndDate.toISOString().split("T")[0];

    const { error } = await supabase
      .from("clients")
      .update({
        status: "Active",
        end_date: newEndDateStr,
      })
      .eq("client_id", clientId);

    if (error) throw error;

    // Log transaction so merchant sees it in statement
    await supabase.from("transactions").insert([{
      client_id: clientId,
      main_id: cl.main_id,
      tx_type: "صرف",
      currency: "دولار أمريكي",
      amount: price,
      notes: "خصم دفعة اشتراك: تجديد اشتراك شهري تلقائي",
      status: "مرحل",
      receipt_url: "لا يوجد مرفق",
      created_at: new Date().toISOString()
    }]);

    await logAudit(auth.userId, auth.role, "RENEW_CLIENT", "clients", clientId, { end_date: cl.end_date }, { end_date: newEndDateStr });
    return res.json({ success: true, message: `✅ تم تجديد اشتراك التاجر وتفعيله لغاية: ${newEndDateStr} بنجاح خصماً من المحفظة!` });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل التجديد: " + err.message });
  }
});

// Renew Manager/User Subscription (Super Admin Only)
router.post("/api/subscription/renew-manager", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const { data: target } = await supabase.from("zobon_main").select("end_date, full_name").eq("main_id", id);
    if (!target || target.length === 0) return res.json({ success: false, message: "المدير المستهدف غير موجود." });

    const user = target[0];
    const today = new Date();
    let currentEndDate = user.end_date ? new Date(user.end_date) : today;
    if (currentEndDate < today) currentEndDate = today;

    currentEndDate.setFullYear(currentEndDate.getFullYear() + 1);
    const newEndDateStr = currentEndDate.toISOString().split("T")[0];

    const { error } = await supabase
      .from("zobon_main")
      .update({
        status: "Active",
        end_date: newEndDateStr,
      })
      .eq("main_id", id);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "RENEW_MANAGER", "zobon_main", id, { end_date: user.end_date }, { end_date: newEndDateStr });
    
    // Telegram notification
    sendTelegram(`👑 <b>تم تمديد اشتراك مدير مالي سحابي!</b>\n\n▪️ <b>المدير المالي:</b> ${user.full_name}\n▪️ <b>الصلاحية الجديدة:</b> 📆 ${newEndDateStr}\n▪️ <b>بواسطة:</b> الإدارة العليا.`);

    return res.json({ success: true, message: `✅ تم تمديد وتفعيل اشتراك المدير المالي بنجاح لغاية: ${newEndDateStr}!` });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

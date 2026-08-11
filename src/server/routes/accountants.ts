import express from "express";
import { getSupabase, getPlatformSettings } from "../db";
import { logAudit } from "../audit";
import {  sendTelegram, getSuperAdminUsername, deductFromWallet , getServicePrices } from "../helpers";
import { hashPassword } from "../auth";

const router = express.Router();

// Add Accountant with instant activation and auto wallet deduction
router.post("/api/accountants/add", async (req, res) => {
  const { auth, accountant } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  const { username, salary, selectedClients, startDate, address, telegramId } = accountant;

  try {
    const supabase = getSupabase();

    if (username === auth.username) {
      return res.json({ success: false, message: "❌ لا يمكنك إضافة نفسك كمحاسب مساعد لنفسك!" });
    }

    if (selectedClients && selectedClients.length > 0) {
      const { data: validClients, error: vErr } = await supabase
        .from("clients")
        .select("client_id")
        .eq("main_id", auth.mainId)
        .in("client_id", selectedClients);
      
      if (vErr || !validClients || validClients.length < selectedClients.length) {
        return res.status(403).json({ success: false, message: "بعض العملاء المحددين غير تابعين لحسابك." });
      }
    }

    // 1. Verify that the accountant exists as an existing manager in zobon_main
    const { data: targetManager, error: tmErr } = await supabase
      .from("zobon_main")
      .select("*")
      .eq("username", username);

    if (tmErr || !targetManager || targetManager.length === 0) {
      return res.json({
        success: false,
        message: `❌ خطأ: اسم المستخدم "${username}" غير مسجل كمدير في الموقع! يجب على المحاسب أولاً إنشاء حساب (مدير) في الموقع ليكون لديه اسم مستخدم مسجل وجاهز للربط.`
      });
    }

    const mgrInfo = targetManager[0];

    // 2. Prevent adding the same accountant username multiple times under the SAME manager
    const uniqueUsername = `${username}_m${auth.mainId}`;
    const { data: duplicate } = await supabase
      .from("accountants")
      .select("accountant_id")
      .or(`username.eq.${username},username.eq.${uniqueUsername}`)
      .eq("main_id", auth.mainId);

    if (duplicate && duplicate.length > 0) {
      return res.json({ success: false, message: "❌ هذا المحاسب مضاف مسبقاً لديك بالفعل كمسؤول عن حساباتك!" });
    }

    // 3. Precheck free tier accountant eligibility
    
    const { accountantPrice: price } = await getServicePrices();

    const { data: mgr } = await supabase
      .from("zobon_main")
      .select("first_accountant_free_used, full_name, username")
      .eq("main_id", auth.mainId);

    if (!mgr || mgr.length === 0) throw new Error("المدير غير موجود.");

    const isSuper = auth.isSuperAdmin || mgr[0].username === await getSuperAdminUsername();
    const isFree = isSuper ? true : false;
    const cost = isFree ? 0 : price;

    // 4. Deduct from wallet if not free
    if (!isFree) {
      const deductResult = await deductFromWallet(auth.mainId, cost, `إضافة محاسب مساعد: ${mgrInfo.full_name}`, "accountant", null);
      if (!deductResult.ok) {
        return res.json({ success: false, message: deductResult.message });
      }
    }

    // 5. Create Accountant record copying their registered manager credentials
    const payload = {
      main_id: auth.mainId,
      full_name: mgrInfo.full_name,
      username: uniqueUsername,
      password_hash: mgrInfo.password_hash, // copy the password hash so they use their own password
      phone: mgrInfo.phone,
      address: address || "",
      salary: parseFloat(salary || 0),
      telegram_id: telegramId || "",
      status: "Active",
      sys_status: "Active",
      employment_date: startDate || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("accountants")
      .insert([payload])
      .select();

    if (insErr) throw insErr;

    const accountantId = inserted[0].accountant_id;

    // 6. Update first_accountant_free_used if free and NOT super admin
    if (isFree && !isSuper) {
      await supabase
        .from("zobon_main")
        .update({ first_accountant_free_used: true })
        .eq("main_id", auth.mainId);
    }

    // 7. Connect assigned clients
    if (selectedClients && selectedClients.length > 0) {
      const linkPayload = selectedClients.map((cid: any) => ({
        accountant_id: accountantId,
        client_id: parseInt(cid),
        status: "Active",
        created_at: new Date().toISOString(),
      }));

      await supabase.from("accountant_clients").insert(linkPayload);
    }

    // 8. Grant bonus if enabled
    const settings = await getPlatformSettings();
    if (settings.accountant_bonus_enabled === "true") {
      const bonusAmount = parseFloat(settings.accountant_bonus_amount || "10");
      if (bonusAmount > 0) {
        // Grant bonus to the manager
        const { data: currentMgr } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", auth.mainId);
        if (currentMgr && currentMgr.length > 0) {
          const currentCash = parseFloat(currentMgr[0].wallet_balance || "0");
          const currentBonus = parseFloat(currentMgr[0].wallet_bonus || "0");
          await supabase.from("zobon_main").update({ wallet_bonus: currentBonus + bonusAmount }).eq("main_id", auth.mainId);
          // Log wallet transaction for bonus
          await supabase.from("wallet_transactions").insert([{
            main_id: auth.mainId,
            amount: bonusAmount,
            type: "bonus",
            description: `بونص إضافة محاسب مساعد (@${mgrInfo.username})`,
            target_type: "accountant",
            target_id: accountantId,
            balance_after: currentCash + currentBonus + bonusAmount,
            created_at: new Date().toISOString()
          }]);
        }
      }
    }

    await logAudit(auth.userId, auth.role, "ADD_ACCOUNTANT", "accountants", accountantId, null, payload);

    // Telegram notification
    sendTelegram(`👨‍💼 <b>تم إضافة محاسب مساعد وتفعيله!</b>\n\n▪️ <b>المدير المالي الأول:</b> ${mgr[0].full_name} (@${mgr[0].username})\n▪️ <b>المحاسب المساعد:</b> ${mgrInfo.full_name} (@${mgrInfo.username})\n▪️ <b>الهاتف:</b> ${mgrInfo.phone}\n▪️ <b>النوع:</b> ${isFree ? "مجاني (أول محاسب)" : `مدفوع (خصم ${cost}$)`}`);

    return res.json({
      success: true,
      message: isFree
        ? "✅ تم ربط وإضافة المحاسب المساعد بنجاح وتفعيله فورياً مجاناً!"
        : `✅ تم ربط وإضافة المحاسب المساعد وتفعيله فورياً وخصم ${cost}$ من محفظتك!`,
    });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل إضافة المحاسب: " + err.message });
  }
});

// Toggle Accountant Status (clickable in UI)
router.post("/api/accountants/update-status", async (req, res) => {
  const { auth, id, status } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  try {
    const supabase = getSupabase();

    const { data: acc } = await supabase.from("accountants").select("main_id").eq("accountant_id", id);
    if (!acc || acc.length === 0) return res.json({ success: false, message: "المحاسب غير موجود." });

    if (acc[0].main_id !== auth.mainId && !auth.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "غير مصرح بتعديل هذا المحاسب." });
    }

    const { error } = await supabase.from("accountants").update({ status }).eq("accountant_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "TOGGLE_ACCOUNTANT_STATUS", "accountants", id, null, { status });
    return res.json({ success: true, message: `تم تحديث حالة تفعيل المحاسب إلى: ${status === "Active" ? "نشط" : "معطل"}` });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Edit Accountant Details
router.post("/api/accountants/edit", async (req, res) => {
  const { auth, id, accountant } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  const { fullName, username, password, phone, address, salary, telegramId, status } = accountant;

  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase.from("accountants").select("main_id, full_name").eq("accountant_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "المحاسب غير موجود." });

    if (existing[0].main_id !== auth.mainId && !auth.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "غير مصرح بتعديل هذا المحاسب." });
    }

    const cleanUsername = username ? username.split("_m")[0] : "";
    const uniqueUsername = cleanUsername ? `${cleanUsername}_m${existing[0].main_id}` : username;

    const payload: any = {
      full_name: fullName,
      username: uniqueUsername,
      phone,
      address,
      salary: parseFloat(salary || 0),
      telegram_id: telegramId,
      status: status || "Active",
    };

    if (password && password.trim() !== "") {
      payload.password_hash = hashPassword(password);
    }

    const { error } = await supabase.from("accountants").update(payload).eq("accountant_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "EDIT_ACCOUNTANT", "accountants", id, existing[0], payload);
    return res.json({ success: true, message: "تم تحديث بيانات المحاسب بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Toggle Accountant Client Access
router.post("/api/accountants/toggle-client-access", async (req, res) => {
  const { auth, aid, cid, status } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();


    // Get manager ids to verify ownership and white-label authority
    const { data: acc } = await supabase.from("accountants").select("main_id").eq("accountant_id", aid);
    const { data: cl } = await supabase.from("clients").select("main_id").eq("client_id", cid);

    if (!acc || acc.length === 0 || !cl || cl.length === 0) {
      return res.json({ success: false, message: "المحاسب أو التاجر غير موجود." });
    }

    if (acc[0].main_id !== cl[0].main_id) {
      return res.status(403).json({ success: false, message: "المحاسب والعميل يتبعون مديرين مختلفين." });
    }

    if (auth.role !== "admin" || (acc[0].main_id !== auth.mainId && !auth.isSuperAdmin)) {
      return res.status(403).json({ success: false, message: "غير مصرح لك." });
    }

    // Check if link exists
    const { data: existingLink } = await supabase
      .from("accountant_clients")
      .select("*")
      .eq("accountant_id", aid)
      .eq("client_id", cid);

    if (existingLink && existingLink.length > 0) {
      await supabase
        .from("accountant_clients")
        .update({ status })
        .eq("accountant_id", aid)
        .eq("client_id", cid);
    } else {
      await supabase.from("accountant_clients").insert([
        { accountant_id: aid, client_id: cid, status, created_at: new Date().toISOString() },
      ]);
    }

    await logAudit(auth.userId, auth.role, "TOGGLE_CLIENT_ACCESS", "accountant_clients", null, { accountant_id: aid, client_id: cid }, { status });
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Assign multiple clients to accountant
router.post("/api/accountants/assign-clients", async (req, res) => {
  const { auth, accId, clientIds } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  try {
    const supabase = getSupabase();

    const { data: acc } = await supabase.from("accountants").select("main_id").eq("accountant_id", accId);
    if (!acc || acc.length === 0) return res.json({ success: false, message: "المحاسب غير موجود." });

    if (acc[0].main_id !== auth.mainId && !auth.isSuperAdmin) {
      return res.status(403).json({ success: false, message: "غير مصرح بتعيين عملاء لهذا المحاسب." });
    }

    // Delete all existing assignments first
    await supabase.from("accountant_clients").delete().eq("accountant_id", accId);

    if (!clientIds || clientIds.length === 0) {
      await logAudit(auth.userId, auth.role, "ADD_CLIENTS_TO_ACCOUNTANT", "accountant_clients", null, { accountant_id: accId }, { clientIds: [] });
      return res.json({ success: true, message: "✅ تم تحديث الصلاحيات وإلغاء ربط كافة المنشآت بنجاح!" });
    }

    const targetMainId = auth.isSuperAdmin ? acc[0].main_id : auth.mainId;

    // Validate clients belong to same manager
    const { data: validClients } = await supabase
      .from("clients")
      .select("client_id")
      .eq("main_id", targetMainId)
      .in("client_id", clientIds);

    const validIds = (validClients || []).map((c) => c.client_id);
    if (validIds.length === 0) return res.json({ success: false, message: "لا يوجد عملاء صالحين لربطهم." });

    // Build insert payload
    const payload = validIds.map((cid) => ({
      accountant_id: accId,
      client_id: cid,
      status: "Active",
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("accountant_clients").insert(payload);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "ADD_CLIENTS_TO_ACCOUNTANT", "accountant_clients", null, { accountant_id: accId }, { clientIds: validIds });
    return res.json({ success: true, message: "✅ تم إضافة الصلاحيات للمحاسب بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Delete Accountant (Super Admin Only)
router.post("/api/accountants/delete", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();

    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية. هذه الميزة للإدارة العليا فقط." });
    }

    // Delete associated links
    await supabase.from("accountant_clients").delete().eq("accountant_id", id);
    // Delete accountant
    const { error } = await supabase.from("accountants").delete().eq("accountant_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "DELETE_ACCOUNTANT", "accountants", id, null, null);
    return res.json({ success: true, message: "🗑️ تم حذف حساب المحاسب بنجاح من قاعدة البيانات!" });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل الحذف: " + err.message });
  }
});

export default router;

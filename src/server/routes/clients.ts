import express from "express";
import { getSupabase, getPlatformSettings } from "../db";
import { logAudit } from "../audit";
import {  sendTelegram, getSuperAdminUsername, checkAndDeactivateExpiredSubscriptions, deductFromWallet , getServicePrices } from "../helpers";

const router = express.Router();

// Add Merchant with instant activation and auto wallet deduction
router.post("/api/clients/add", async (req, res) => {
  const { auth, client } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  const { companyName, phone, address, notes, startDate, endDate, subValue, paidAmount } = client;

  try {
    const supabase = getSupabase();

    // 1. Prevent duplicate names under the same manager
    const { data: duplicate } = await supabase
      .from("clients")
      .select("client_id")
      .eq("main_id", auth.mainId)
      .eq("company_name", companyName);

    if (duplicate && duplicate.length > 0) {
      return res.json({ success: false, message: "❌ لديك تاجر بنفس الاسم مسبقاً!" });
    }

    // 2. Precheck free tier eligibility or wallet balance
    const { clientPrice: price } = await getServicePrices();

    const { data: mgr } = await supabase
      .from("zobon_main")
      .select("first_client_free_used, full_name, username")
      .eq("main_id", auth.mainId);

    if (!mgr || mgr.length === 0) throw new Error("المدير غير موجود.");

    const isSuper = auth.isSuperAdmin || mgr[0].username === await getSuperAdminUsername();
    const isFree = isSuper ? true : false;
    const cost = isFree ? 0 : price;

    // 3. Deduct from wallet if not free
    if (!isFree) {
      const deductResult = await deductFromWallet(auth.mainId, cost, `إضافة تاجر: ${companyName}`, "client", null);
      if (!deductResult.ok) {
        return res.json({ success: false, message: deductResult.message });
      }
    }

    // 4. Create client record - active immediately!
    const monthlySub = parseFloat(subValue || 0);
    const payload = {
      main_id: auth.mainId,
      company_name: companyName,
      phone,
      address,
      notes,
      start_date: startDate || null,
      end_date: endDate || null,
      subscription_value: monthlySub,
      paid_amount: 0,
      status: "Active",
      sys_status: "Active", // Instant Activation!
      is_free_tier: isFree,
      tx_limit: isFree ? 50 : 999999,
      monthly_tx_count: 0,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("clients")
      .insert([payload])
      .select();

    if (insErr) throw insErr;

    const clientRecord = inserted[0];

    // Automatically post initial monthly subscription due transaction (صرف)
    if (monthlySub > 0) {
      await supabase.from("transactions").insert([{
        client_id: clientRecord.client_id,
        main_id: auth.mainId,
        tx_type: "صرف",
        currency: "$",
        amount: monthlySub,
        notes: "استحقاق الاشتراك الشهري للمنشأة",
        receipt_url: "لا يوجد مرفق",
        status: "مرحل",
        created_at: new Date().toISOString(),
      }]);
    }
    if (isFree && !isSuper) {
      await supabase
        .from("zobon_main")
        .update({ first_client_free_used: true })
        .eq("main_id", auth.mainId);
    }

    await logAudit(auth.userId, auth.role, "ADD_CLIENT", "clients", clientRecord.client_id, null, payload);

    // Telegram notification
    sendTelegram(`🏪 <b>تاجر جديد مفعل فورياً!</b>\n\n▪️ <b>المدير المالي:</b> ${mgr[0].full_name} (@${mgr[0].username})\n▪️ <b>اسم المنشأة:</b> ${companyName}\n▪️ <b>النوع:</b> ${isFree ? "مجاني (أول منشأة)" : `مدفوع (خصم ${cost}$)`}\n▪️ <b>الحالة:</b> ✅ مفعل فوري ونشط.`);

    return res.json({
      success: true,
      message: isFree 
        ? "✅ تم إضافة التاجر وتفعيله فورياً مجاناً كباقة ترحيبية!" 
        : `✅ تم إضافة التاجر وتفعيله فورياً وخصم ${cost}$ من محفظتك!`,
      client: clientRecord,
    });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل إضافة التاجر: " + err.message });
  }
});

// Edit Client Details
router.post("/api/clients/edit", async (req, res) => {
  const { auth, id, client } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const { companyName, phone, address, notes, startDate, endDate, subValue, paidAmount, status } = client;

  try {
    const supabase = getSupabase();

    // Check ownership
    const { data: existing } = await supabase.from("clients").select("main_id, company_name, subscription_value").eq("client_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "العميل غير موجود." });

    if (auth.role !== "admin" || (existing[0].main_id !== auth.mainId && !auth.isSuperAdmin)) {
      return res.status(403).json({ success: false, message: "غير مصرح بتعديل هذا العميل." });
    }

    const payload = {
      company_name: companyName,
      phone,
      address,
      notes,
      start_date: startDate || null,
      end_date: endDate || null,
      subscription_value: existing[0].subscription_value ?? 0, // Unchangeable subscription value
      paid_amount: parseFloat(paidAmount || 0),
      status: status || "Active",
    };

    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("client_id", id);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "EDIT_CLIENT", "clients", id, existing[0], payload);
    return res.json({ success: true, message: "تم تحديث بيانات التاجر بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update Client Status (Suspend/Activate by Manager)
router.post("/api/clients/update-status", async (req, res) => {
  const { auth, id, status } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from("clients").select("main_id, status").eq("client_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "العميل غير موجود." });

    if (auth.role !== "admin" || (existing[0].main_id !== auth.mainId && !auth.isSuperAdmin)) {
      return res.status(403).json({ success: false, message: "غير مصرح لك." });
    }

    const { error } = await supabase.from("clients").update({ status }).eq("client_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_CLIENT_STATUS", "clients", id, { status: existing[0].status }, { status });
    return res.json({ success: true, message: "تم تحديث حالة التاجر بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});


// Update Client Payment Received
router.post("/api/clients/update-payment", async (req, res) => {
  const { auth, id, paidAmount } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from("clients").select("main_id, paid_amount").eq("client_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "العميل غير موجود." });

    if (auth.role !== "admin" || (existing[0].main_id !== auth.mainId && !auth.isSuperAdmin)) {
      return res.status(403).json({ success: false, message: "غير مصرح لك." });
    }

    const { error } = await supabase.from("clients").update({ paid_amount: parseFloat(paidAmount) }).eq("client_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_CLIENT_PAYMENT", "clients", id, { paid_amount: existing[0].paid_amount }, { paid_amount: paidAmount });
    return res.json({ success: true, message: "تم تسجيل الدفعة بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Record payment or deduction with description in clients and transactions tables
router.post("/api/clients/record-payment-transaction", async (req, res) => {
  const { auth, id, type, amount, description } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) {
    return res.json({ success: false, message: "المبلغ المدخل غير صالح." });
  }

  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from("clients").select("*").eq("client_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "العميل غير موجود." });

    const client = existing[0];
    if (auth.role !== "admin" || (client.main_id !== auth.mainId && !auth.isSuperAdmin)) {
      return res.status(403).json({ success: false, message: "غير مصرح لك بتنفيذ هذه العملية." });
    }

    const currentPaid = parseFloat(client.paid_amount || 0);
    let newPaid = currentPaid;
    let txType = "قبض";
    let txNotes = "";

    if (type === "add") {
      newPaid = currentPaid + val;
      txType = "قبض";
      txNotes = `دفعة اشتراك شهري: ${description || "شحن رصيد يدوي"}`;
    } else if (type === "deduct") {
      newPaid = currentPaid - val;
      txType = "صرف";
      txNotes = `خصم دفعة اشتراك: ${description || "خصم/مسترجع يدوي"}`;
    } else {
      return res.json({ success: false, message: "نوع العملية غير مدعوم." });
    }

    // 1. Update client paid_amount
    const { error: clientErr } = await supabase
      .from("clients")
      .update({ paid_amount: newPaid })
      .eq("client_id", id);

    if (clientErr) throw clientErr;

    // 2. Insert transaction record to show in both client statement & manager reports
    const txPayload = {
      client_id: id,
      main_id: client.main_id,
      tx_type: txType,
      currency: "دولار أمريكي",
      amount: val,
      notes: txNotes,
      status: "مرحل", // Finalized & Approved
      receipt_url: "لا يوجد مرفق",
      created_at: new Date().toISOString(),
    };

    const { error: txErr } = await supabase.from("transactions").insert([txPayload]);
    if (txErr) throw txErr;

    await logAudit(
      auth.userId,
      auth.role,
      type === "add" ? "ADD_CLIENT_SUBSCRIPTION_PAYMENT" : "DEDUCT_CLIENT_SUBSCRIPTION_PAYMENT",
      "clients",
      id,
      { paid_amount: currentPaid },
      { paid_amount: newPaid, txNotes }
    );

    return res.json({
      success: true,
      message: type === "add" ? "✅ تم إضافة الدفعة وتثبيتها في الحساب المالي كشف السندات بنجاح!" : "✅ تم خصم الدفعة وتثبيتها في الحساب المالي كشف السندات بنجاح!",
      newPaidAmount: newPaid,
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// CLIENT FORM GATEWAY (WHITE LABEL PORTAL)
router.get("/api/clients/details-form", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: "رابط غير صالح." });

  try {
    await checkAndDeactivateExpiredSubscriptions();
    const supabase = getSupabase();
    
    const { data: clientData, error } = await supabase
      .from("clients")
      .select("client_id, main_id, company_name, status, sys_status, end_date, sys_end_date, public_access_token")
      .eq("public_access_token", token);

    if (error || !clientData || clientData.length === 0) {
      return res.json({ success: false, message: "العميل غير موجود." });
    }

    const client = clientData[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // System suspension gate
    if (client.sys_status !== "Active") {
      return res.json({ success: false, message: "🔒 الحساب معلق ومقفل من قبل الإدارة العليا." });
    }
    if (client.sys_end_date && new Date(client.sys_end_date) < today) {
      return res.json({ success: false, message: "🔒 انتهت صلاحية اشتراك النظام. يرجى مراجعة الإدارة العليا للتعجيل بالتفعيل." });
    }
    if (client.status !== "Active") {
      return res.json({ success: false, message: "🔒 الحساب معطل مؤقتاً من قبل المدير المالي." });
    }
    if (client.end_date && new Date(client.end_date) < today) {
      return res.json({ success: false, message: "🔒 انتهت صلاحية الاشتراك. يرجى تسديد الدفعة للمدير المباشر للتفعيل." });
    }

    // Fetch manager details for White-Labeling!
    const { data: managerData } = await supabase
      .from("zobon_main")
      .select("full_name, bio, phone")
      .eq("main_id", client.main_id);

    const manager = (managerData && managerData.length > 0)
      ? managerData[0]
      : { full_name: "مكتب المحاسبة السحابية", bio: "نظام محاسبي متكامل", phone: "" };
      
    if (manager.bio && manager.bio.includes("|||META|||")) {
      manager.bio = manager.bio.split("|||META|||")[0];
    }

    // Calculate balance across 3 currencies (SYP, USD, EUR)
    const { data: txs } = await supabase
      .from("transactions")
      .select("tx_type, currency, amount")
      .eq("client_id", client.client_id);

    const balances: Record<string, number> = { SYP: 0, USD: 0, EUR: 0 };
    (txs || []).forEach((tx) => {
      const amt = parseFloat(tx.amount || 0);
      const curr = tx.currency;
      const key = curr === "ليرة سورية" ? "SYP" : curr === "دولار أمريكي" ? "USD" : "EUR";
      if (tx.tx_type === "قبض") balances[key] += amt;
      else if (tx.tx_type === "صرف") balances[key] -= amt;
    });

    // Calculate current month's transactions for Free packages
    const currentMonthStr = today.toISOString().substring(0, 7); // "YYYY-MM"
    const { data: monthlyTxs } = await supabase
      .from("transactions")
      .select("tx_id")
      .eq("client_id", client.client_id)
      .gte("created_at", `${currentMonthStr}-01T00:00:00`);

    const monthlyCount = monthlyTxs ? monthlyTxs.length : 0;

    // Calculate storage usage and limit
    const { data: attachments } = await supabase.from("attachments").select("size_mb").eq("client_id", client.client_id);
    const usedStorage = (attachments || []).reduce((acc: number, item: any) => acc + (item.size_mb || 0), 0);

    const { data: limitSetting } = await supabase.from("platform_settings").select("value").eq("key", `storage_limit_${client.client_id}`);
    const storageLimit = (limitSetting && limitSetting.length > 0) ? parseFloat(limitSetting[0].value) : 25;

    // Delete the public_access_token from the returned client object for security
    delete client.public_access_token;

    return res.json({
      success: true,
      client: { ...client, usedStorage, storageLimit },
      balances,
      manager,
      monthly_tx_count: monthlyCount,
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Delete Client Merchant (Super Admin Only)
router.post("/api/clients/delete", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check if superadmin or lookup
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية. هذه الميزة للإدارة العليا فقط." });
    }

    // Delete associated links
    await supabase.from("accountant_clients").delete().eq("client_id", id);
    // Delete transactions
    await supabase.from("transactions").delete().eq("client_id", id);
    // Delete client
    const { error } = await supabase.from("clients").delete().eq("client_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "DELETE_CLIENT", "clients", id, null, null);
    return res.json({ success: true, message: "🗑️ تم حذف التاجر وكافة السجلات والعمليات التابعة له بنجاح من قاعدة البيانات!" });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل الحذف: " + err.message });
  }
});

export default router;

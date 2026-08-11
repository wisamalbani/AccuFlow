import express from "express";
import { getSupabase } from "../db";
import { logAudit } from "../audit";
import { sendTelegram, editTelegramMessage, getTransactionChatIds, formatTransactionMessage, updateTelegramNotificationsForTx, validateFileSize } from "../helpers";

const publicSaveRateLimiter = new Map<string, { count: number, resetAt: number }>();

function checkPublicSaveRateLimit(ip: string): boolean {
  const now = Date.now();
  let record = publicSaveRateLimiter.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + 10 * 60 * 1000 };
    publicSaveRateLimiter.set(ip, record);
    return true;
  }
  if (record.count >= 100) return false;
  record.count++;
  return true;
}

const router = express.Router();

async function authorizeClientAccess(supabase: any, auth: any, publicToken: any, clientId: any) {
  const { data: clientRecord } = await supabase.from("clients")
    .select("client_id, main_id, status, sys_status, public_access_token, is_free_tier, tx_limit")
    .eq("client_id", clientId);
  if (!clientRecord || clientRecord.length === 0) return { ok: false, status: 404, message: "التاجر المستهدف غير موجود." };
  const client = clientRecord[0];

  if (auth && auth.userId) {
    if (auth.isSuperAdmin) return { ok: true, client };
    if (auth.role === "admin" && Number(auth.mainId) === Number(client.main_id)) return { ok: true, client };
    if (auth.role === "accountant") {
      const { data: link } = await supabase.from("accountant_clients").select("*")
        .eq("accountant_id", auth.userId).eq("client_id", clientId).eq("status", "Active");
      if (link && link.length > 0) return { ok: true, client };
    }
    return { ok: false, status: 403, message: "غير مصرح لك بالوصول لبيانات هذا التاجر." };
  }

  // زائر عام: يجب تطابق توكن البوابة
  if (publicToken && client.public_access_token && String(publicToken) === String(client.public_access_token)) {
    return { ok: true, client };
  }
  return { ok: false, status: 403, message: "رابط الوصول غير صالح أو منتهي." };
}

// Add transaction (voucher)
router.post("/api/transactions/add", async (req, res) => {
  const { auth, transaction } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const { clientId, txType, currency, amount, notes, receiptUrl, fileData, fileName } = transaction;

  if (!clientId || !txType || !currency || !amount) {
    return res.status(400).json({ success: false, message: "جميع الحقول الأساسية للسند مطلوبة." });
  }

  const parsedAmount = parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: "المبلغ غير صالح." });
  }
  if (txType !== "قبض" && txType !== "صرف") {
    return res.status(400).json({ success: false, message: "النوع غير صالح." });
  }
  if (currency !== "ليرة سورية" && currency !== "دولار أمريكي" && currency !== "يورو أوروبي") {
    return res.status(400).json({ success: false, message: "العملة غير صالحة." });
  }

  // Validate file size limit
  if (!validateFileSize(fileData)) {
    return res.status(400).json({ success: false, message: "حجم الملف يتجاوز الحد المسموح (10MB)" });
  }

  try {
    const supabase = getSupabase();

    // 1. Verify client is Active and checks
    const { data: clientRecord } = await supabase.from("clients").select("*").eq("client_id", clientId);
    if (!clientRecord || clientRecord.length === 0) return res.json({ success: false, message: "التاجر المستهدف غير موجود." });

    const client = clientRecord[0];
    if (client.status !== "Active" || client.sys_status !== "Active") {
      return res.json({ success: false, message: "هذا الحساب معطل حالياً ولا يستقبل أي عمليات ترحيل محاسبي." });
    }

    if (client.is_free_tier) {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", firstDay.toISOString());
      if ((count || 0) >= (client.tx_limit || 50)) {
        return res.status(403).json({ success: false, message: "🔒 وصلت للحد الأقصى للباقة المجانية (50 حركة شهرياً). يرجى الترقية للباقة المدفوعة عبر المدير المالي." });
      }
    }

    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(client.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بإضافة سندات لهذا العميل." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", clientId)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بإضافة سندات لهذا العميل." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك بإضافة سندات لهذا العميل." });
      }
    }

    // 2. Insert transaction
    const payload = {
      client_id: parseInt(clientId),
      main_id: client.main_id,
      tx_type: txType,
      currency,
      amount: parseFloat(amount),
      notes: notes || "",
      receipt_url: receiptUrl || "لا يوجد مرفق",
      status: "مرحل", // Finalized and Approved
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: txErr } = await supabase.from("transactions").insert([payload]).select();
    if (txErr) throw txErr;

    const txId = inserted[0].tx_id;

    // 3. Handle Attachment upload if provided as base64
    if (fileData && fileData.length > 0) {
      try {
        const base64Content = fileData.split(',')[1] || fileData;
        const sizeBytes = (base64Content.length * 3) / 4;
        const sizeMb = sizeBytes / (1024 * 1024);

        const { error: attErr } = await supabase.from("attachments").insert([{ 
            client_id: parseInt(clientId),
            tx_id: txId,
            file_name: fileName || "unnamed_attachment",
            file_url: fileData, // Store directly in DB column
            size_mb: sizeMb,
            created_at: new Date().toISOString(),
           }]);
        if (attErr) console.error("Attachment Insert Error:", attErr);
      } catch (attErr) {
        console.error("Failed to store attachment in DB:", attErr);
      }
    }

    await logAudit(auth.userId, auth.role, "ADD_TRANSACTION", "transactions", txId, null, payload);
    return res.json({ success: true, message: "✅ تم إضافة وترحيل السند بنجاح!", txId });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Edit transaction (voucher)
router.post("/api/transactions/edit", async (req, res) => {
  const { auth, id, transaction } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  const { txType, currency, amount, notes, receiptUrl, fileData, fileName } = transaction;

  const parsedAmount = parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: "المبلغ غير صالح." });
  }
  if (txType !== "قبض" && txType !== "صرف") {
    return res.status(400).json({ success: false, message: "النوع غير صالح." });
  }
  if (currency !== "ليرة سورية" && currency !== "دولار أمريكي" && currency !== "يورو أوروبي") {
    return res.status(400).json({ success: false, message: "العملة غير صالحة." });
  }

  // Validate file size limit
  if (!validateFileSize(fileData)) {
    return res.status(400).json({ success: false, message: "حجم الملف يتجاوز الحد المسموح (10MB)" });
  }

  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase.from("transactions").select("*").eq("tx_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "السند غير موجود." });

    const tx = existing[0];
    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(tx.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل سندات هذا العميل." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", tx.client_id)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل سندات هذا العميل." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل سندات هذا العميل." });
      }
    }

    const payload = {
      tx_type: txType,
      currency,
      amount: parseFloat(amount),
      notes: notes || "",
      receipt_url: receiptUrl || "لا يوجد مرفق",
    };

    const { error: txErr } = await supabase.from("transactions").update(payload).eq("tx_id", id);
    if (txErr) throw txErr;

    // Handle attachment updating or insertion
    if (fileData && fileData.length > 0) {
      try {
        const base64Content = fileData.split(',')[1] || fileData;
        const sizeBytes = (base64Content.length * 3) / 4;
        const sizeMb = sizeBytes / (1024 * 1024);

        // Delete any existing attachment for this transaction
        await supabase.from("attachments").delete().eq("tx_id", id);

        // Insert new attachment
        const { error: attErr } = await supabase.from("attachments").insert([{ 
            client_id: tx.client_id,
            tx_id: id,
            file_name: fileName || "updated_attachment",
            file_url: fileData,
            size_mb: sizeMb,
            created_at: new Date().toISOString(),
           }]);
        if (attErr) console.error("Attachment Insert Error:", attErr);
      } catch (attErr) {
        console.error("Failed to update attachment in DB:", attErr);
      }
    }

    await logAudit(auth.userId, auth.role, "EDIT_TRANSACTION", "transactions", id, tx, payload);
    
    // Update TG notification
    updateTelegramNotificationsForTx(supabase, id);

    return res.json({ success: true, message: "تم تعديل السند بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Delete transaction (voucher)
router.post("/api/transactions/delete", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();

    const { data: existing } = await supabase.from("transactions").select("*").eq("tx_id", id);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "السند غير موجود." });

    const tx = existing[0];
    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(tx.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بحذف سندات هذا العميل." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", tx.client_id)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بحذف سندات هذا العميل." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك بحذف سندات هذا العميل." });
      }
    }

    // Delete associated attachment first
    await supabase.from("attachments").delete().eq("tx_id", id);

    // Delete the transaction
    const { error: delErr } = await supabase.from("transactions").delete().eq("tx_id", id);
    if (delErr) throw delErr;

    await logAudit(auth.userId, auth.role, "DELETE_TRANSACTION", "transactions", id, tx, null);
    return res.json({ success: true, message: "🗑️ تم حذف وترحيل إلغاء السند بنجاح مالي!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Get manager-merchant specific subscription statement
router.post("/api/transactions/manager-statement", async (req, res) => {
  const { clientId, currency, auth } = req.body;
  const publicToken = req.body.publicToken || req.body.token;
  if (!clientId) return res.status(400).json({ success: false, message: "معرف العميل مطلوب." });
  
  try {
    const supabase = getSupabase();
    
    const authResult = await authorizeClientAccess(supabase, auth, publicToken, clientId);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }
    const client = authResult.client;

    // Fetch only subscription/payment logs between manager and merchant
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("client_id", clientId)
      .or('notes.ilike.%اشتراك%,notes.ilike.%دفعة%,notes.ilike.%استحقاق%');
      
    if (currency) query = query.eq("currency", currency);
    
    const { data, error } = await query.order("created_at", { ascending: true });
    
    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Get client statement (Kashf Hisab)
router.post("/api/transactions/client", async (req, res) => {
  const { auth, cid } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check access
    const { data: clientRecord } = await supabase.from("clients").select("main_id").eq("client_id", cid);
    if (!clientRecord || clientRecord.length === 0) return res.status(404).json({ success: false, message: "العميل غير موجود." });
    const client = clientRecord[0];

    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(client.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", cid)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك." });
      }
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("client_id", cid)
      .not("notes", "ilike", "%دفعة اشتراك%")
      .not("notes", "ilike", "%خصم دفعة اشتراك%")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      const txIds = data.map((t: any) => t.tx_id);
      const { data: attData } = await supabase.from("attachments").select("attachment_id:id, tx_id, file_name, file_data:file_url, size_mb").in("tx_id", txIds);
      data.forEach((tx: any) => {
        tx.attachments = (attData || []).filter(a => a.tx_id === tx.tx_id);
      });
      console.log("Found attachments for txIds:", txIds.length, "attData length:", attData ? attData.length : 0);
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update transaction status & voucher number
router.post("/api/transactions/update-status", async (req, res) => {
  const { auth, tid, status, voucherNum } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: existing } = await supabase.from("transactions").select("*").eq("tx_id", tid);
    if (!existing || existing.length === 0) return res.json({ success: false, message: "السند غير موجود." });
    
    const tx = existing[0];

    // Check access
    if (!auth.isSuperAdmin) {
      if (auth.role === "admin") {
        if (Number(auth.mainId) !== Number(tx.main_id)) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل حالة هذا السند." });
        }
      } else if (auth.role === "accountant") {
        const { data: link } = await supabase
          .from("accountant_clients")
          .select("*")
          .eq("accountant_id", auth.userId)
          .eq("client_id", tx.client_id)
          .eq("status", "Active");
        if (!link || link.length === 0) {
          return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل حالة هذا السند." });
        }
      } else {
        return res.status(403).json({ success: false, message: "غير مصرح لك بتعديل حالة هذا السند." });
      }
    }

    const payload = { status, voucher_num: voucherNum };
    const { error } = await supabase.from("transactions").update(payload).eq("tx_id", tid);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_TX_STATUS", "transactions", tid, { status: tx.status, voucher_num: tx.voucher_num }, payload);
    
    // Update TG notification
    updateTelegramNotificationsForTx(supabase, tid);

    return res.json({ success: true, message: "تم تحديث السند بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Get client statement (Kashf Hisab)
router.post("/api/transactions/statement", async (req, res) => {
  const { clientId, currency, startDate, endDate, auth } = req.body;
  const publicToken = req.body.publicToken || req.body.token;
  if (!clientId) return res.status(400).json({ success: false, message: "معرف العميل مطلوب." });

  try {
    const supabase = getSupabase();
    
    const authResult = await authorizeClientAccess(supabase, auth, publicToken, clientId);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }
    const client = authResult.client;

    // Fetch transaction logs with attachments
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("client_id", clientId);
      
    if (currency) query = query.eq("currency", currency);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59.999Z");

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) throw error;
    
    let previousBalance = 0;
    if (startDate && currency) {
       const { data: prevData } = await supabase.from("transactions")
         .select("tx_type, amount")
         .eq("client_id", clientId)
         .eq("currency", currency)
         .lt("created_at", startDate);
       
       if (prevData && prevData.length > 0) {
          prevData.forEach(tx => {
             if (tx.tx_type === "قبض") previousBalance += parseFloat(tx.amount || 0);
             else previousBalance -= parseFloat(tx.amount || 0);
          });
       }
    }

    if (data && data.length > 0) {
      const txIds = data.map((t: any) => t.tx_id);
      const { data: attData } = await supabase.from("attachments").select("attachment_id:id, tx_id, file_name, file_data:file_url, size_mb").in("tx_id", txIds);
      data.forEach((tx: any) => {
        tx.attachments = (attData || []).filter(a => a.tx_id === tx.tx_id);
      });
      console.log("Found attachments for txIds:", txIds.length, "attData length:", attData ? attData.length : 0);
    }
    return res.json({ success: true, previousBalance, transactions: data || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Save Merchant Transaction (Single) - unauthenticated via portal
router.post("/api/transactions/save", async (req, res) => {
  const { clientId, txType, currency, amount, notes, fileData, fileName, mimeType, auth } = req.body;
  const publicToken = req.body.publicToken || req.body.token;

  if (!clientId || !txType || !currency || !amount) {
    return res.status(400).json({ success: false, message: "بيانات السند غير مكتملة." });
  }

  const parsedAmount = parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, message: "المبلغ غير صالح." });
  }
  if (txType !== "قبض" && txType !== "صرف") {
    return res.status(400).json({ success: false, message: "النوع غير صالح." });
  }
  if (currency !== "ليرة سورية" && currency !== "دولار أمريكي" && currency !== "يورو أوروبي") {
    return res.status(400).json({ success: false, message: "العملة غير صالحة." });
  }

  // Validate file size limit
  if (!validateFileSize(fileData)) {
    return res.status(400).json({ success: false, message: "حجم الملف يتجاوز الحد المسموح (10MB)" });
  }

  if (!auth) {
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
    if (!checkPublicSaveRateLimit(ip)) {
      return res.status(429).json({ success: false, message: "طلبات كثيرة، حاول لاحقاً" });
    }
  }

  try {
    const supabase = getSupabase();

    const authResult = await authorizeClientAccess(supabase, auth, publicToken, clientId);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }
    const client = authResult.client;

    if (client.status !== "Active" || client.sys_status !== "Active") {
      return res.json({ success: false, message: "هذا الحساب معطل حالياً ولا يستقبل أي عمليات." });
    }

    if (client.is_free_tier) {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", firstDay.toISOString());
      if ((count || 0) >= (client.tx_limit || 50)) {
        return res.status(403).json({ success: false, message: "🔒 وصلت للحد الأقصى للباقة المجانية (50 حركة شهرياً). يرجى الترقية للباقة المدفوعة عبر المدير المالي." });
      }
    }

    const payload = {
      client_id: parseInt(clientId),
      main_id: client.main_id,
      tx_type: txType,
      currency,
      amount: parseFloat(amount),
      notes: notes || "",
      receipt_url: "لا يوجد مرفق", // Fallback
      status: "غير مرحل",
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: txErr } = await supabase.from("transactions").insert([payload]).select();
    if (txErr) throw txErr;

    const txId = inserted[0].tx_id;

    if (fileData && fileData.length > 0) {
      try {
        const base64Content = fileData.split(',')[1] || fileData;
        const sizeBytes = (base64Content.length * 3) / 4;
        const sizeMb = sizeBytes / (1024 * 1024);

        const { error: attErr } = await supabase.from("attachments").insert([{ 
            client_id: parseInt(clientId),
            tx_id: txId,
            file_name: fileName || "unnamed_attachment",
            file_url: fileData,
            size_mb: sizeMb,
            created_at: new Date().toISOString(),
           }]);
        if (attErr) console.error("Attachment Insert Error:", attErr);
      } catch (attErr) {
        console.error("Failed to store attachment in DB:", attErr);
      }
    }

    // Dynamic Telegram Notification
    try {
      const chatIds = await getTransactionChatIds(supabase, client.main_id, clientId);
      if (chatIds.length > 0) {
        const msgText = formatTransactionMessage({ ...payload, tx_id: txId, status: "غير مرحل" }, client.company_name);
        const sentMsgs = await sendTelegram(msgText, chatIds, fileData, fileName);
        if (sentMsgs.length > 0) {
          // Store mapping in audit_log
          await supabase.from("audit_log").insert([{
            user_role: "system",
            action: "TELEGRAM_NOTIFICATIONS",
            table_name: "transactions",
            record_id: txId,
            new_values: JSON.stringify({ messageIds: sentMsgs }),
            created_at: new Date().toISOString()
          }]);
        }
      } else {
        // Fallback to default
        sendTelegram(`📝 <b>سند جديد قيد التدقيق عبر بوابة التاجر!</b>\n\n▪️ <b>المنشأة:</b> ${client.company_name}\n▪️ <b>النوع:</b> ${txType}\n▪️ <b>المبلغ:</b> ${amount} ${currency}`);
      }
    } catch (tgErr) {
      console.error("TG notification error:", tgErr);
    }

    return res.json({ success: true, message: "تم تسجيل السند بنجاح وهو قيد المراجعة.", txId });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Save Complex Transactions (Multiple)
router.post("/api/transactions/save-complex", async (req, res) => {
  const { clientId, txArray, notes, fileData, fileName, auth } = req.body;
  const publicToken = req.body.publicToken || req.body.token;
  const transactions = txArray || req.body.transactions; // Support both
  if (!clientId || !transactions || transactions.length === 0) {
    return res.status(400).json({ success: false, message: "لا توجد سندات للحفظ." });
  }

  for (const tx of transactions) {
    const parsedAmount = parseFloat(tx.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "المبلغ غير صالح." });
    }
    if (tx.type !== "قبض" && tx.type !== "صرف") {
      return res.status(400).json({ success: false, message: "النوع غير صالح." });
    }
    if (tx.currency !== "ليرة سورية" && tx.currency !== "دولار أمريكي" && tx.currency !== "يورو أوروبي") {
      return res.status(400).json({ success: false, message: "العملة غير صالحة." });
    }
  }

  if (!auth) {
    const ip = req.ip || req.connection?.remoteAddress || "0.0.0.0";
    if (!checkPublicSaveRateLimit(ip)) {
      return res.status(429).json({ success: false, message: "طلبات كثيرة، حاول لاحقاً" });
    }
  }

  try {
    const supabase = getSupabase();

    const authResult = await authorizeClientAccess(supabase, auth, publicToken, clientId);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ success: false, message: authResult.message });
    }
    const client = authResult.client;

    if (client.status !== "Active" || client.sys_status !== "Active") {
      return res.json({ success: false, message: "هذا الحساب معطل حالياً." });
    }

    if (client.is_free_tier) {
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("transactions").select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", firstDay.toISOString());
      if ((count || 0) + transactions.length > (client.tx_limit || 50)) {
        return res.status(400).json({ success: false, message: "🔒 وصلت للحد الأقصى للباقة المجانية (50 حركة شهرياً). يرجى الترقية للباقة المدفوعة عبر المدير المالي." });
      }
    }

    let insertedCount = 0;
    
    for (const tx of transactions) {
      const txFileData = tx.fileData || fileData;
      const txFileName = tx.fileName || fileName;
      
      if (!validateFileSize(txFileData)) {
        continue; // Skip invalid files
      }

      const payload = {
        client_id: parseInt(clientId),
        main_id: client.main_id,
        tx_type: tx.type,
        currency: tx.currency,
        amount: parseFloat(tx.amount),
        notes: tx.notes || notes || "",
        status: "غير مرحل",
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: txErr } = await supabase.from("transactions").insert([payload]).select();
      if (!txErr && inserted && inserted.length > 0) {
        insertedCount++;
        const txId = inserted[0].tx_id;

        if (txFileData) {
           const base64Content = txFileData.split(',')[1] || txFileData;
           const sizeBytes = (base64Content.length * 3) / 4;
           const sizeMb = sizeBytes / (1024 * 1024);
           const { error: attErr } = await supabase.from("attachments").insert([{ 
             client_id: parseInt(clientId),
             tx_id: txId,
             file_name: txFileName || "attachment",
             file_url: txFileData,
             size_mb: sizeMb,
             created_at: new Date().toISOString()
            }]);
        if (attErr) console.error("Attachment Insert Error:", attErr);
        }

        try {
          const chatIds = await getTransactionChatIds(supabase, client.main_id, clientId);
          if (chatIds.length > 0) {
            const msgText = formatTransactionMessage({ ...payload, tx_id: txId, status: "غير مرحل" }, client.company_name);
            const sentMsgs = await sendTelegram(msgText, chatIds, txFileData, txFileName);
            if (sentMsgs.length > 0) {
              await supabase.from("audit_log").insert([{
                user_role: "system",
                action: "TELEGRAM_NOTIFICATIONS",
                table_name: "transactions",
                record_id: txId,
                new_values: JSON.stringify({ messageIds: sentMsgs }),
                created_at: new Date().toISOString()
              }]);
            }
          }
        } catch (tgErr) {
          console.error("TG complex notification error:", tgErr);
        }
      }
    }
    
    // sendTelegram(`📝 <b>قيود مركبة جديدة!</b>\n\n▪️ <b>المنشأة:</b> ${client.company_name}\n▪️ <b>عدد السندات:</b> ${insertedCount} قيد الانتظار.`);

    return res.json({ success: true, message: `تم تسجيل ${insertedCount} سندات مركبة بنجاح!` });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Get all approved transactions for manager
router.get("/api/transactions/all-approved", async (req, res) => {
  const tokenUser = (req as any).body?.auth || {};
  if (!tokenUser.mainId) return res.status(401).json({ success: false, message: "Unauthorized." });

  try {
    const supabase = getSupabase();
    
    // Fetch transactions belonging to manager's clients
    const { data, error } = await supabase
      .from("transactions")
      .select("*, clients(company_name)")
      .eq("main_id", tokenUser.mainId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const txIds = data.map((t: any) => t.tx_id);
      const { data: attData } = await supabase.from("attachments").select("attachment_id:id, tx_id, file_name, file_data:file_url, size_mb").in("tx_id", txIds);
      data.forEach((tx: any) => {
        tx.attachments = (attData || []).filter(a => a.tx_id === tx.tx_id);
      });
      console.log("Found attachments for txIds:", txIds.length, "attData length:", attData ? attData.length : 0);
    }

    // Map output to include client name
    const formatted = (data || []).map((row: any) => ({
      ...row,
      clientName: row.clients ? row.clients.company_name : "غير معروف",
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});



export default router;


// Accountant Statement (Wallet Transactions)
router.post("/api/transactions/accountant-statement", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check permission
    const { data: accountantData } = await supabase.from("accountants").select("main_id, full_name, wallet_balance").eq("accountant_id", id);
    if (!accountantData || accountantData.length === 0) return res.json({ success: false, message: "المحاسب غير موجود." });
    
    const acc = accountantData[0];
    if (auth.role === "admin" && acc.main_id !== auth.mainId && !auth.isSuperAdmin) {
       return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لبيانات هذا المحاسب." });
    }
    if (auth.role === "accountant" && auth.userId !== id) {
       return res.status(403).json({ success: false, message: "لا يمكنك رؤية بيانات محاسب آخر." });
    }
    
    const managerId = acc.main_id;

    const { data: transactions, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("main_id", managerId)
      .eq("target_type", "accountant")
      .eq("target_id", id)
      .order("created_at", { ascending: true }); // older first to compute running balance correctly

    if (error) throw error;

    let balance = 0;
    const items = (transactions || []).filter((t: any) => {
      const descStr = String(t.description || "");
      const typeStr = String(t.type || "").toLowerCase();
      const isActuallyBonus = typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية");
      return !isActuallyBonus; // exclude bonuses from the accountant statement
    }).map((t: any) => {
      const amountForAccountant = -parseFloat(t.amount); // reverse the sign
      balance += amountForAccountant;
      const tx_type = amountForAccountant > 0 ? "صرف" : "قبض";

      return {
        ...t,
        type: amountForAccountant > 0 ? "add" : "deduct",
        tx_type: tx_type,
        amountForAccountant: Math.abs(amountForAccountant),
        running_balance: balance
      };
    });

    return res.json({
      success: true,
      transactions: items,
      accountant: {
         id,
         name: acc.full_name,
         wallet_balance: acc.wallet_balance
      }
    });

  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

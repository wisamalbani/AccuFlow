import { getSupabase } from "./db";

let cachedSuperAdminUsername: string | null = null;
export async function getSuperAdminUsername(): Promise<string> {
  if (cachedSuperAdminUsername) return cachedSuperAdminUsername;
  const supabase = getSupabase();
  const { data } = await supabase.from("zobon_main").select("username").order("main_id", { ascending: true }).limit(1);
  if (data && data.length > 0) {
    cachedSuperAdminUsername = data[0].username;
    return cachedSuperAdminUsername;
  }
  
  // Fallback if DB is entirely empty, we use env var temporarily so auto-seeding can proceed
  const envUsername = process.env.SUPER_ADMIN_USERNAME || "admin_wisam";
  return envUsername;
}

let cachedSuperAdminTelegram: string | null = null;
export async function getSuperAdminTelegram(): Promise<string> {
  if (cachedSuperAdminTelegram) return cachedSuperAdminTelegram;
  const supabase = getSupabase();
  const { data } = await supabase.from("zobon_main").select("telegram_id").order("main_id", { ascending: true }).limit(1);
  if (data && data.length > 0 && data[0].telegram_id) {
    cachedSuperAdminTelegram = data[0].telegram_id;
    return cachedSuperAdminTelegram;
  }
  const envUsername = process.env.SUPER_ADMIN_USERNAME || "admin_wisam";
  return envUsername;
}

export function clearSuperAdminCache() {
  cachedSuperAdminUsername = null;
}

export async function sendTelegram(message: string, chatIds?: string[], fileData?: string, fileName?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || token === "your-bot-token") {
    console.log("[Telegram Notification Bypass]:", message);
    return [];
  }

  let targetChatIds = chatIds && chatIds.length > 0 ? chatIds : [];
  if (targetChatIds.length === 0 && defaultChatId && defaultChatId !== "your-chat-id") {
    targetChatIds = [defaultChatId];
  }

  if (targetChatIds.length === 0) {
    console.log("[Telegram Notification Bypass - No Chat IDs]:", message);
    return [];
  }

  const sentMessages = [];
  try {
    for (const chatId of targetChatIds) {
      if (!chatId) continue;
      
      let url = `https://api.telegram.org/bot${token}/sendMessage`;
      let body: any = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });
      let headers: any = { "Content-Type": "application/json" };
      
      // If there's fileData (base64) we can try to send it as document
      if (fileData && fileData.startsWith("data:")) {
         try {
           const base64Content = fileData.split(",")[1];
           const buffer = Buffer.from(base64Content, 'base64');
           const blob = new Blob([buffer], { type: 'application/octet-stream' });
           const formData = new FormData();
           formData.append('chat_id', chatId);
           formData.append('document', blob, fileName || "attachment.pdf");
           formData.append('caption', message);
           formData.append('parse_mode', 'HTML');
           url = `https://api.telegram.org/bot${token}/sendDocument`;
           body = formData;
           headers = {}; // Let fetch set boundary
         } catch (e) {
           console.error("Failed to parse file for Telegram, falling back to text:", e);
         }
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      const data = await res.json();
      if (data.ok) {
        sentMessages.push({ chat_id: chatId, message_id: data.result.message_id, isDocument: !!fileData });
      }
      console.log("[Telegram Notification Sent to " + chatId + "]:", data.ok ? "Success" : "Failed");
    }
  } catch (err) {
    console.error("[Telegram Notification Error]:", err);
  }
  return sentMessages;
}

export async function editTelegramMessage(chatId: string, messageId: number, message: string, isDocument?: boolean) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "your-bot-token") return false;

  async function attemptEdit(asDocument: boolean) {
    const method = asDocument ? "editMessageCaption" : "editMessageText";
    const url = `https://api.telegram.org/bot${token}/${method}`;
    
    const bodyPayload: any = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
    };
    
    if (asDocument) {
      bodyPayload.caption = message;
    } else {
      bodyPayload.text = message;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });
    return await res.json();
  }

  try {
    let data = await attemptEdit(!!isDocument);
    if (!data.ok && data.description && data.description.includes("there is no text in the message to edit")) {
      console.log("[TG Edit] Retrying as caption...");
      data = await attemptEdit(true);
    } else if (!data.ok && data.description && data.description.includes("there is no caption in the message to edit")) {
      console.log("[TG Edit] Retrying as text...");
      data = await attemptEdit(false);
    }
    
    if (!data.ok) {
      console.log("[TG Edit] API Error:", data.description);
    }
    return data.ok;
  } catch (err) {
    console.error("[Telegram Edit Error]:", err);
    return false;
  }
}

export async function getTransactionChatIds(supabase: any, mainId: any, clientId: any): Promise<string[]> {
  const chatIds = new Set<string>();

  // Get Manager Telegram ID
  if (mainId) {
    const { data: mainData } = await supabase.from("zobon_main").select("telegram_id").eq("main_id", mainId);
    if (mainData && mainData.length > 0 && mainData[0].telegram_id) {
      chatIds.add(mainData[0].telegram_id);
    }
  }

  // Get Linked Accountants Telegram IDs
  if (clientId) {
    const { data: links } = await supabase.from("accountant_clients").select("accountant_id").eq("client_id", clientId).eq("status", "Active");
    if (links && links.length > 0) {
      const accIds = links.map((l: any) => l.accountant_id);
      const { data: accs } = await supabase.from("accountants").select("telegram_id").in("accountant_id", accIds).eq("status", "Active");
      if (accs && accs.length > 0) {
        accs.forEach((a: any) => {
          if (a.telegram_id) chatIds.add(a.telegram_id);
        });
      }
    }
  }

  return Array.from(chatIds);
}

export function formatTransactionMessage(tx: any, clientName: string) {
  const statusEmoji = tx.status === "مرحل" ? "✅" : tx.status === "مرفوض" ? "❌" : "⏳";
  let msg = `${statusEmoji} <b>إشعار حركة: ${clientName}</b>

`;
  msg += `▪️ <b>رقم السند:</b> ${tx.tx_id}\n`;
  if (tx.voucher_num) msg += `▪️ <b>الرقم الدفتري (رقم الترحيل):</b> ${tx.voucher_num}\n`;
  msg += `▪️ <b>النوع:</b> ${tx.tx_type}
`;
  msg += `▪️ <b>المبلغ:</b> ${tx.amount} ${tx.currency}
`;
  msg += `▪️ <b>الحالة:</b> ${tx.status}
`;
  if (tx.notes) msg += `▪️ <b>البيان:</b> ${tx.notes}
`;
  const d = new Date(tx.created_at);
  const formattedDate = !isNaN(d.getTime()) 
    ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : tx.created_at;
  msg += `▪️ <b>التاريخ:</b> ${formattedDate}`;
  
  return msg;
}

export async function updateTelegramNotificationsForTx(supabase: any, txId: number) {
  try {
    // Get full tx data
    const { data: txData } = await supabase.from("transactions").select("*, clients(company_name, main_id)").eq("tx_id", txId).single();
    if (!txData) {
      console.log("[TG Edit] No txData for", txId);
      return;
    }
    
    // Find TG message mapping in audit_log
    const { data: logs } = await supabase.from("audit_log")
      .select("new_values")
      .eq("action", "TELEGRAM_NOTIFICATIONS")
      .eq("table_name", "transactions")
      .eq("record_id", txId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!logs || logs.length === 0) {
      console.log("[TG Edit] No tg logs for", txId);
      return;
    }

    let messageMappings = [];
    try {
      let parsedValue = logs[0].new_values;
      while (typeof parsedValue === 'string') {
        parsedValue = JSON.parse(parsedValue);
      }
      if (parsedValue && parsedValue.messageIds) {
        messageMappings = parsedValue.messageIds;
      }
    } catch (e) {
      console.error("[TG Edit] Parsing error:", e, logs[0].new_values);
    }

    if (messageMappings.length > 0) {
      const clientName = txData.clients && !Array.isArray(txData.clients) ? (txData.clients as any).company_name : "تاجر";
      const msgText = formatTransactionMessage(txData, clientName);
      console.log("[TG Edit] Editing TG msg:", txId, "mappings:", messageMappings);
      for (const mapping of messageMappings) {
        const ok = await editTelegramMessage(mapping.chat_id, mapping.message_id, msgText, mapping.isDocument);
        console.log("[TG Edit] TG edit result for chat", mapping.chat_id, "msg", mapping.message_id, ":", ok);
        if (!ok) {
           console.error("[TG Edit] Failed to edit telegram message:", mapping);
        }
      }
    } else {
       console.log("[TG Edit] No messageMappings found in", logs[0].new_values);
    }
  } catch (err) {
    console.error("Error updating TG notifications:", err);
  }
}



export function validateFileSize(fileData?: string | null): boolean {
  if (!fileData) return true;
  if (!fileData.startsWith("data:")) return true;
  const base64Content = fileData.split(',')[1] || fileData;
  const sizeBytes = (base64Content.length * 3) / 4;
  const sizeMb = sizeBytes / (1024 * 1024);
  return sizeMb <= 10;
}

export async function deductFromWallet(mainId: number, amount: number, notes: string, type: string, relatedId: any) {
  const supabase = getSupabase();
  const { data: manager } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus").eq("main_id", mainId).single();
  if (manager) {
    let currentBal = parseFloat(manager.wallet_balance || "0");
    let currentBonus = parseFloat(manager.wallet_bonus || "0");
    let remaining = amount;

    let bonusDeducted = 0;
    let cashDeducted = 0;

    if (currentBonus > 0) {
      if (currentBonus >= remaining) {
        bonusDeducted = remaining;
        remaining = 0;
      } else {
        bonusDeducted = currentBonus;
        remaining -= currentBonus;
      }
    }

    if (remaining > 0) {
      cashDeducted = remaining;
    }

    const newBonus = currentBonus - bonusDeducted;
    const newBal = currentBal - cashDeducted;

    await supabase.from("zobon_main").update({
      wallet_balance: newBal,
      wallet_bonus: newBonus
    }).eq("main_id", mainId);

    const now = new Date().toISOString();

    if (bonusDeducted > 0) {
      const bonusNote = cashDeducted > 0
        ? `${notes} (خصم جزئي من البونص: $${bonusDeducted})`
        : `${notes} (خصم من البونص)`;
      await supabase.from("wallet_transactions").insert([{
        main_id: mainId,
        amount: -bonusDeducted,
        type: "deduct",
        description: bonusNote,
        target_type: type,
        target_id: relatedId || null,
        balance_after: newBal + newBonus,
        created_at: now
      }]);
    }

    if (cashDeducted > 0) {
      const cashNote = bonusDeducted > 0
        ? `${notes} (خصم جزئي من الرصيد النقدي: $${cashDeducted})`
        : notes;
      await supabase.from("wallet_transactions").insert([{
        main_id: mainId,
        amount: -cashDeducted,
        type: "deduct",
        description: cashNote,
        target_type: type,
        target_id: relatedId || null,
        balance_after: newBal + newBonus,
        created_at: now
      }]);
    }
  }
}

export async function getServicePrices(): Promise<{ clientPrice: number; accountantPrice: number }> {
  const supabase = getSupabase();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "pricing_packages");
  let clientPrice = 10;
  let accountantPrice = 5;
  
  if (data && data.length > 0) {
    try {
      const pkgs = JSON.parse(data[0].value);
      if (pkgs && pkgs.basic && Array.isArray(pkgs.basic)) {
        const clientPkg = pkgs.basic.find((p: any) => p.title && p.title.includes("تاجر"));
        if (clientPkg) {
          const num = parseFloat(clientPkg.price.replace(/[^0-9.]/g, ""));
          if (!isNaN(num)) clientPrice = num;
        }
        const accPkg = pkgs.basic.find((p: any) => p.title && p.title.includes("محاسب"));
        if (accPkg) {
          const num = parseFloat(accPkg.price.replace(/[^0-9.]/g, ""));
          if (!isNaN(num)) accountantPrice = num;
        }
      }
    } catch (e) {}
  }
  return { clientPrice, accountantPrice };
}
export async function checkAndDeactivateExpiredSubscriptions() {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  
  await supabase.from("clients")
    .update({ sys_status: "Expired" })
    .lt("sys_end_date", now)
    .eq("sys_status", "Active");
    
  await supabase.from("accountants")
    .update({ sys_status: "Expired" })
    .lt("sys_end_date", now)
    .eq("sys_status", "Active");
    
  await supabase.from("zobon_main")
    .update({ is_featured: false })
    .lt("featured_until", now)
    .eq("is_featured", true);
}

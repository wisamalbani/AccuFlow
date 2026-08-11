import express from "express";
import { getSupabase } from "../db";
import { getSuperAdminUsername } from "../helpers";

const router = express.Router();

// Health check endpoint
router.post("/api/monitoring/health", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    let storageUsage = [];
    let auditLogs = [];
    let supabaseUsage = {
      databaseSize: { usedMB: 0 },
      egress: { usedMB: 0 },
      mau: { used: 0 },
      storage: { usedMB: 0 },
      realtimePeak: { used: 0 },
      realtimeMessages: { used: 0 }
    };

    if (auth.isSuperAdmin || auth.role === "admin") {
      // Calculate storage usage per client
      const { data: allClients, count: clientsCount } = await supabase.from("clients").select("client_id, company_name, main_id", { count: "exact" });
      const { data: allManagers, count: managersCount } = await supabase.from("zobon_main").select("main_id, username", { count: "exact" });
      const { data: attachments, count: attachmentsCount } = await supabase.from("attachments").select("client_id, size_mb", { count: "exact" });
      const { count: accountantsCount } = await supabase.from("accountants").select("*", { count: "exact", head: true });
      const { count: txCount } = await supabase.from("transactions").select("*", { count: "exact", head: true });
      
      let totalStorage = 0;
      if (attachments) {
        totalStorage = attachments.reduce((acc, att) => acc + parseFloat(att.size_mb || 0), 0);
      }
      
      const totalUsers = (clientsCount || 0) + (managersCount || 0) + (accountantsCount || 0);
      const totalRows = totalUsers + (attachmentsCount || 0) + (txCount || 0);
      const estimatedDbSizeMB = (totalRows * 2.5) / 1024; // approx 2.5KB per row

      supabaseUsage = {
        databaseSize: { usedMB: estimatedDbSizeMB },
        egress: { usedMB: 0 }, // Egress can't be fetched without Supabase Management API
        mau: { used: totalUsers },
        storage: { usedMB: totalStorage },
        realtimePeak: { used: 0 },
        realtimeMessages: { used: 0 }
      };
      
      const managerMap: Record<string, string> = {};
      if (allManagers) {
        allManagers.forEach((m: any) => {
          managerMap[m.main_id] = m.username;
        });
      }

      const clientStorage: Record<string, { companyName: string, managerUsername: string, usedMb: number }> = {};
      if (allClients) {
        allClients.forEach((c: any) => {
          clientStorage[c.client_id] = {
            companyName: c.company_name,
            managerUsername: managerMap[c.main_id] || "Unknown",
            usedMb: 0
          };
        });
      }
      
      if (attachments) {
        attachments.forEach((att: any) => {
          const clientId = att.client_id;
          if (clientStorage[clientId]) {
            clientStorage[clientId].usedMb += parseFloat(att.size_mb || 0);
          }
        });
      }

      // get platform settings for limits
      const { data: settingsData } = await supabase.from("platform_settings").select("*").like("key", "storage_limit_%");
      const limits: Record<string, number> = {};
      if (settingsData) {
        settingsData.forEach(s => {
          const cid = s.key.split("storage_limit_")[1];
          if (cid) limits[cid] = parseFloat(s.value);
        });
      }

      storageUsage = Object.keys(clientStorage).map(clientId => {
        const usedMb = clientStorage[clientId].usedMb;
        const limitMb = limits[clientId] || 25;
        const remainingMb = Math.max(limitMb - usedMb, 0);
        const percentage = Math.round(Math.min((usedMb / limitMb) * 100, 100));
        return {
          clientId,
          companyName: clientStorage[clientId].companyName,
          managerUsername: clientStorage[clientId].managerUsername,
          usedMb: usedMb.toFixed(2),
          limitMb,
          remainingMb: remainingMb.toFixed(2),
          percentage
        };
      });

      // Fetch audit logs
      const { data: logs } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (logs) auditLogs = logs;
    }

    return res.json({ 
      success: true, 
      storageUsage,
      supabaseUsage,
      auditLogs
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

router.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Audit log list (Super Admin Only)
router.get("/api/monitoring/audit-log", async (req, res) => {
  const tokenUser = (req as any).body?.auth || {};

  if (!tokenUser || !tokenUser.isSuperAdmin) {
    return res.status(401).json({ success: false, message: "Super Admin only." });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return res.json({ success: true, logs: data || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Export Data endpoint for Frontend
router.post("/api/monitoring/export-data", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check if superadmin
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    // Fetch all tables in parallel
    const [
      managersRes,
      clientsRes,
      accountantsRes,
      linkRes,
      txRes,
      walletTxRes,
      depositRes,
      auditRes,
      settingsRes,
      attachmentsRes,
    ] = await Promise.all([
      supabase.from("zobon_main").select("main_id, telegram_id, username, full_name, start_date, end_date, subscription_value, paid_amount, status, created_at, phone, wallet_balance, wallet_bonus, first_client_free_used, first_accountant_free_used, is_featured, featured_until, facebook_url, instagram_url, linkedin_url, bio, profile_image_url, total_earned, total_paid_to_platform"),
      supabase.from("clients").select("*"),
      supabase.from("accountants").select("accountant_id, main_id, telegram_id, username, full_name, phone, address, employment_date, salary, due_amounts, paid_amounts, status, created_at, sys_status, sys_start_date, sys_end_date, sys_sub_value, sys_paid_amount, total_paid_by_manager"),
      supabase.from("accountant_clients").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("wallet_transactions").select("*"),
      supabase.from("wallet_deposits").select("*"),
      supabase.from("audit_log").select("*"),
      supabase.from("platform_settings").select("*"),
      supabase.from("attachments").select("attachment_id, client_id, tx_id, file_name, size_mb, created_at"), // exclude raw blob content
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      version: "1.0.0",
      data: {
        zobon_main: managersRes.data || [],
        clients: clientsRes.data || [],
        accountants: accountantsRes.data || [],
        accountant_clients: linkRes.data || [],
        transactions: txRes.data || [],
        wallet_transactions: walletTxRes.data || [],
        wallet_deposits: depositRes.data || [],
        audit_log: auditRes.data || [],
        platform_settings: settingsRes.data || [],
        attachments: attachmentsRes.data || [],
      },
    };

    return res.json({
      success: true,
      data: backup,
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

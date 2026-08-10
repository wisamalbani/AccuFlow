import express from "express";
import { getSupabase } from "../db";
import { getSuperAdminUsername, getSuperAdminTelegram } from "../helpers";

const router = express.Router();

router.post("/api/dashboard/data", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    let clients = [];
    let accountants = [];
    let allAdmins = [];
    let myAdminData = null;
    let hasAccountantProfile = null;
    let accountantProfiles = [];

    // Fetch myAdminData
    const { data: adminData } = await supabase.from("zobon_main").select("*").eq("main_id", auth.mainId);
    if (adminData && adminData.length > 0) {
      myAdminData = adminData[0];
      
      // Calculate paid_amount and subscription_value dynamically from wallet_transactions
      const { data: txs } = await supabase.from("wallet_transactions").select("amount").eq("main_id", auth.mainId);
      if (txs) {
        let paid = 0;
        let consumed = 0;
        for (const tx of txs) {
          const amt = parseFloat(tx.amount || 0);
          if (amt > 0) {
            paid += amt;
          } else if (amt < 0) {
            consumed += Math.abs(amt);
          }
        }
        myAdminData.paid_amount = paid;
        myAdminData.subscription_value = consumed;
      }
    }

    if (auth.role === "admin") {
      // Admin sees their own clients and accountants
      let clientsData = [];
      if (auth.isSuperAdmin || (myAdminData && myAdminData.username === await getSuperAdminUsername())) {
        const { data: allClientsData } = await supabase.from("clients").select("*, manager:zobon_main!main_id(full_name, username, phone)");
        if (allClientsData) clientsData = allClientsData;
      } else {
        const { data: myClientsData } = await supabase.from("clients").select("*").eq("main_id", auth.mainId);
        if (myClientsData) clientsData = myClientsData;
      }
      clients = clientsData;

      const { data: accountantsData } = await supabase.from("accountants").select("*, assigned_clients:accountant_clients(client_id, link_status:status)").eq("main_id", auth.mainId);
      if (accountantsData) {
        accountants = accountantsData.map((acc: any) => ({
          ...acc,
          username: acc.username ? acc.username.split("_m")[0] : acc.username
        }));
      }

      // Super Admin sees all admins
      if (auth.isSuperAdmin || (myAdminData && myAdminData.username === await getSuperAdminUsername())) {
        const { data: adminsData } = await supabase.from("zobon_main").select("*");
        if (adminsData) {
          // calculate counts
          const { data: allClients } = await supabase.from("clients").select("main_id");
          const { data: allAccountants } = await supabase.from("accountants").select("main_id");
                    const { data: allTxs } = await supabase.from("wallet_transactions").select("main_id, amount");
          allAdmins = adminsData.map((adm: any) => {
            let paid = 0;
            let consumed = 0;
            if (allTxs) {
              const myTxs = allTxs.filter((tx: any) => tx.main_id === adm.main_id);
              for (const tx of myTxs) {
                const amt = parseFloat(tx.amount || 0);
                if (amt > 0) paid += amt;
                else if (amt < 0) consumed += Math.abs(amt);
              }
            }
            return {
              ...adm,
              client_count: (allClients || []).filter((c: any) => c.main_id === adm.main_id).length,
              accountant_count: (allAccountants || []).filter((a: any) => a.main_id === adm.main_id).length,
              paid_amount: paid,
              subscription_value: consumed
            };
          });
        }
      }
    } else if (auth.role === "accountant") {
      // Accountant sees assigned clients
      const { data: linkData } = await supabase.from("accountant_clients")
        .select("client_id")
        .eq("accountant_id", auth.userId)
        .eq("status", "Active");
      
      if (linkData && linkData.length > 0) {
        const clientIds = linkData.map(l => l.client_id);
        const { data: clientsData } = await supabase.from("clients").select("*, manager:zobon_main!main_id(full_name, username, phone)").in("client_id", clientIds);
        if (clientsData) clients = clientsData;
      }

      // Check if accountant has a profile in public directory
      const { data: accProfile } = await supabase.from("zobon_main").select("*").eq("username", auth.username);
      if (accProfile && accProfile.length > 0) {
        hasAccountantProfile = accProfile[0];
      }
    }

    // Fetch accountant profiles where this user is acting as an accountant for managers
    const { data: coopAccountants } = await supabase
      .from("accountants")
      .select("*, manager:zobon_main!main_id(full_name, username)")
      .or(`username.eq.${auth.username},username.like.${auth.username}_m%`)
      .eq("status", "Active");

    if (coopAccountants) {
      accountantProfiles = coopAccountants.map((acc: any) => ({
        ...acc,
        username: acc.username ? acc.username.split("_m")[0] : acc.username,
        manager_name: acc.manager?.full_name || "المدير المالي"
      }));
    }

    const superAdminUsername = await getSuperAdminUsername();
    const superAdminTelegram = await getSuperAdminTelegram();
    console.log("Dashboard fetch, superAdminUsername is:", superAdminUsername);
    return res.json({
      success: true,
      clients,
      accountants,
      allAdmins,
      myAdminData,
      hasAccountantProfile,
      accountantProfiles,
      superAdminUsername,
      superAdminTelegram
    });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

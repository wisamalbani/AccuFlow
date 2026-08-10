import express from "express";
import { getSupabase } from "../db";
import { logAudit } from "../audit";
import { getSuperAdminUsername, clearSuperAdminCache } from "../helpers";
import bcrypt from "bcryptjs";

const router = express.Router();

// Get Admin Details (Super Admin only)
router.post("/api/admins/get-details", async (req, res) => {
  const { auth, id } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const { data } = await supabase.from("zobon_main").select("*").eq("main_id", id);
    if (!data || data.length === 0) return res.json({ success: false, message: "المدير غير موجود." });

    const admin = data[0];
    const { data: transactions } = await supabase.from("wallet_transactions").select("*").eq("main_id", id).order("created_at", { ascending: false }).limit(500);

    return res.json({ success: true, admin, transactions: transactions || [] });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Edit Admin (Super Admin only)
router.post("/api/admins/edit", async (req, res) => {
  const { auth, id, admin } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const superAdminUsername = await getSuperAdminUsername();
    
    // Fetch the admin being edited to check if it's the owner
    const { data: targetAdminData } = await supabase.from("zobon_main").select("username").eq("main_id", id);
    const isTargetOwner = targetAdminData && targetAdminData.length > 0 && targetAdminData[0].username === superAdminUsername;
    
    let newStatus = admin.status || "Active";
    if (isTargetOwner && newStatus === "Inactive") {
       newStatus = "Active"; // Protect owner from deactivation
    }

    const payload: any = {
      full_name: admin.fullName,
      username: admin.username,
      phone: admin.phone || "",
      start_date: admin.startDate || new Date().toISOString(),
      end_date: admin.endDate || null,
      subscription_value: admin.subValue || 0,
      paid_amount: admin.paidAmount || 0,
      status: newStatus,
    };

    if (admin.password) {
      payload.password_hash = await bcrypt.hash(admin.password, 10);
    }

    // Check if wallet balance or bonus were updated directly in edit modal
    const { data: oldTargetData } = await supabase.from("zobon_main").select("wallet_balance, wallet_bonus, full_name, username").eq("main_id", id).single();
    if (oldTargetData) {
      const oldBal = parseFloat(oldTargetData.wallet_balance || 0);
      const oldBonus = parseFloat(oldTargetData.wallet_bonus || 0);

      if (admin.walletBalance !== undefined && !isNaN(admin.walletBalance)) {
        payload.wallet_balance = admin.walletBalance;
        const diffBal = admin.walletBalance - oldBal;
        if (diffBal !== 0 && !isTargetOwner) {
          const { data: ownerData } = await supabase.from("zobon_main").select("main_id, wallet_balance, wallet_bonus").eq("username", superAdminUsername).single();
          if (ownerData) {
            const newOwnerBal = parseFloat(ownerData.wallet_balance || 0) + diffBal;
            await supabase.from("zobon_main").update({ wallet_balance: newOwnerBal }).eq("main_id", ownerData.main_id);

            await supabase.from("wallet_transactions").insert([{
              main_id: ownerData.main_id,
              amount: diffBal,
              type: diffBal > 0 ? "charge" : "deduct",
              description: `تعديل رصيد كاش للمدير ${oldTargetData.full_name} (@${oldTargetData.username})`,
              target_type: "manual",
              target_id: null,
              balance_after: newOwnerBal + parseFloat(ownerData.wallet_bonus || 0),
              created_at: new Date().toISOString()
            }]);
          }
        }
      }

      if (admin.walletBonus !== undefined && !isNaN(admin.walletBonus)) {
        payload.wallet_bonus = admin.walletBonus;
        const diffBonus = admin.walletBonus - oldBonus;
        if (diffBonus !== 0 && !isTargetOwner) {
          const { data: ownerData } = await supabase.from("zobon_main").select("main_id, wallet_balance, wallet_bonus").eq("username", superAdminUsername).single();
          if (ownerData) {
            const newOwnerBonus = parseFloat(ownerData.wallet_bonus || 0) + diffBonus;
            await supabase.from("zobon_main").update({ wallet_bonus: newOwnerBonus }).eq("main_id", ownerData.main_id);

            await supabase.from("wallet_transactions").insert([{
              main_id: ownerData.main_id,
              amount: diffBonus,
              type: diffBonus > 0 ? "bonus" : "deduct",
              description: `تعديل رصيد بونص للمدير ${oldTargetData.full_name} (@${oldTargetData.username})`,
              target_type: "manual",
              target_id: null,
              balance_after: parseFloat(ownerData.wallet_balance || 0) + newOwnerBonus,
              created_at: new Date().toISOString()
            }]);
          }
        }
      }
    }

    const { error } = await supabase.from("zobon_main").update(payload).eq("main_id", id);
    if (error) throw error;

    // Clear cache in case Super Admin username was changed
    clearSuperAdminCache();

    await logAudit(auth.userId, auth.role, "EDIT_ADMIN", "zobon_main", id, null, payload);
    return res.json({ success: true, message: "تم تحديث بيانات المدير بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update Admin Status (Super Admin only)
router.post("/api/admins/update-status", async (req, res) => {
  const { auth, id, status } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: myData } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    if (!auth.isSuperAdmin && (!myData || myData[0].username !== await getSuperAdminUsername())) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const superAdminUsername = await getSuperAdminUsername();
    const { data: targetAdminData } = await supabase.from("zobon_main").select("username").eq("main_id", id);
    const isTargetOwner = targetAdminData && targetAdminData.length > 0 && targetAdminData[0].username === superAdminUsername;
    
    if (isTargetOwner && status === "Inactive") {
      return res.status(403).json({ success: false, message: "لا يمكن تعطيل حساب المالك." });
    }

    const { error } = await supabase.from("zobon_main").update({ status }).eq("main_id", id);
    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_ADMIN_STATUS", "zobon_main", id, null, { status });
    return res.json({ success: true, message: "تم تحديث حالة المدير بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import { getSupabase, getPlatformSettings } from "../db";
import { logAudit } from "../audit";
import { getSuperAdminUsername } from "../helpers";

const router = express.Router();

// Get active platform settings
router.get("/api/settings", async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update platform settings (Super Admin Only)
router.post("/api/settings/update", async (req, res) => {
  const { auth, settings } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    // Upsert key values
    for (const [key, val] of Object.entries(settings)) {
      const { data: existing } = await supabase.from("platform_settings").select("*").eq("key", key);
      if (existing && existing.length > 0) {
        await supabase.from("platform_settings").update({ value: String(val) }).eq("key", key);
      } else {
        await supabase.from("platform_settings").insert({ key, value: String(val) });
      }
    }

    await logAudit(auth.userId, auth.role, "UPDATE_PLATFORM_SETTINGS", "platform_settings", null, null, settings);
    return res.json({ success: true, message: "تم حفظ وإعدادات النظام للمنصة بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update storage limit setting for a specific client merchant
router.post("/api/settings/update-client-storage-limit", async (req, res) => {
  const { auth, clientId, limitMb } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    // Check if superadmin
    const { data: mgr } = await supabase.from("zobon_main").select("username").eq("main_id", auth.mainId);
    const isSuper = auth.isSuperAdmin || (mgr && mgr.length > 0 && mgr[0].username === await getSuperAdminUsername());
    if (!isSuper) {
      return res.status(403).json({ success: false, message: "صلاحيات غير كافية." });
    }

    const key = `storage_limit_${clientId}`;
    const value = String(limitMb || 25);

    const { data: existing } = await supabase.from("platform_settings").select("*").eq("key", key);
    if (existing && existing.length > 0) {
      await supabase.from("platform_settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("platform_settings").insert({ key, value });
    }

    await logAudit(
      auth.userId,
      auth.role,
      "UPDATE_CLIENT_STORAGE_LIMIT",
      "platform_settings",
      clientId,
      null,
      { limit_mb: limitMb }
    );

    return res.json({ success: true, message: "💾 تم تحديث سعة التخزين المخصصة للتاجر بنجاح مالي!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

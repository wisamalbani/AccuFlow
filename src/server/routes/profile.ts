import express from "express";
import { getSupabase, getPlatformSettings } from "../db";
import { logAudit } from "../audit";
import { verifyPassword, hashPassword } from "../auth";
import { sendTelegram, getSuperAdminUsername, deductFromWallet } from "../helpers";

const router = express.Router();

// Get user profile
router.post("/api/profile/get", async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    const { data: user } = await supabase.from("zobon_main").select("*").eq("main_id", auth.mainId);
    if (!user || user.length === 0) return res.json({ success: false, message: "المستخدم غير موجود." });

    const p = user[0];
    
    // Simulate directory data from the same table if it was merged, or return what's available
    // Assuming services, years_exp, languages, is_public might be in the same table or we just structure it this way
    let parsedBio = p.bio || "";
    let directoryMeta = { services: "", years_exp: 0, languages: "", is_public: false };
    if (p.bio && p.bio.includes("|||META|||")) {
      const parts = p.bio.split("|||META|||");
      parsedBio = parts[0];
      try {
        const meta = JSON.parse(parts[1]);
        directoryMeta = { ...directoryMeta, ...meta };
      } catch(e) {}
    }

    const profileData = {
      bio: parsedBio,
      facebook_url: p.facebook_url || "",
      instagram_url: p.instagram_url || "",
      linkedin_url: p.linkedin_url || "",
      directory: directoryMeta
    };

    return res.json({ success: true, data: profileData });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update overall profile
router.post("/api/profile/update", async (req, res) => {
  const { auth, data } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  try {
    const supabase = getSupabase();
    
    const metaJson = JSON.stringify({
      services: data.services || "",
      years_exp: data.years_exp || 0,
      languages: data.languages || "",
      is_public: data.is_public || false
    });
    
    const combinedBio = `${data.bio || ""}|||META|||${metaJson}`;

    const payload = {
      bio: combinedBio,
      facebook_url: data.facebook_url || "",
      instagram_url: data.instagram_url || "",
      linkedin_url: data.linkedin_url || ""
    };

    const { error } = await supabase
      .from("zobon_main")
      .update(payload)
      .eq("main_id", auth.mainId);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_PROFILE", "zobon_main", auth.mainId, null, payload);
    return res.json({ success: true, message: "تم حفظ البروفايل بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update public profiles and social directories
router.post("/api/profile/update-social", async (req, res) => {
  const { auth, social } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  const { facebookUrl, instagramUrl, linkedinUrl, bio, phone } = social;

  try {
    const supabase = getSupabase();
    // Extract existing meta before updating social
    const { data: user } = await supabase.from("zobon_main").select("bio").eq("main_id", auth.mainId).single();
    let currentMeta = "";
    if (user && user.bio && user.bio.includes("|||META|||")) {
      currentMeta = "|||META|||" + user.bio.split("|||META|||")[1];
    }
    
    const combinedBio = `${bio || ""}${currentMeta}`;

    const payload = {
      facebook_url: facebookUrl || "",
      instagram_url: instagramUrl || "",
      linkedin_url: linkedinUrl || "",
      bio: combinedBio,
      phone: phone || "",
    };

    const { error } = await supabase
      .from("zobon_main")
      .update(payload)
      .eq("main_id", auth.mainId);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_SOCIAL_PROFILES", "zobon_main", auth.mainId, null, payload);
    return res.json({ success: true, message: "تم تحديث دليل بروفايلك العام بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Update profile avatar image URL
router.post("/api/profile/update-avatar", async (req, res) => {
  const { auth, profileImageUrl } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("zobon_main")
      .update({ profile_image_url: profileImageUrl || "" })
      .eq("main_id", auth.mainId);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "UPDATE_AVATAR", "zobon_main", auth.mainId, null, { profile_image_url: profileImageUrl });
    return res.json({ success: true, message: "تم تحديث الصورة الشخصية للبروفايل بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Feature general profile promotion (featured slot listing)
router.post("/api/profile/update-featured", async (req, res) => {
  const { auth, isFeatured } = req.body;
  if (!auth || auth.role !== "admin") return res.status(403).json({ success: false, message: "غير مصرح لك." });

  try {
    const supabase = getSupabase();

    // Check if slot status is changing
    const { data: current } = await supabase.from("zobon_main").select("is_featured, full_name, username").eq("main_id", auth.mainId);
    if (!current || current.length === 0) return res.json({ success: false, message: "المدير غير موجود." });

    const currentStatus = !!current[0].is_featured;
    if (currentStatus === isFeatured) {
      return res.json({ success: true, message: "مكتمل مسبقاً." });
    }

    if (isFeatured) {
      // 1. Precheck feature pricing settings
      const settings = await getPlatformSettings();
      const price = parseFloat(settings.featured_monthly_price || "9");

      // 2. Deduct from wallet
      await deductFromWallet(auth.mainId, price, "ترقية الملف الشخصي كعضو مميز بالدليل العام لمدة شهر", "featured_slot", auth.mainId);

      // 3. Promote profile
      const { error } = await supabase.from("zobon_main").update({ is_featured: true }).eq("main_id", auth.mainId);
      if (error) throw error;

      await logAudit(auth.userId, auth.role, "PROMOTE_PROFILE_FEATURED", "zobon_main", auth.mainId, { is_featured: false }, { is_featured: true });

      // Telegram notification
      sendTelegram(`⭐ <b>ترقية بروفايل مالي مميز بالدليل العام!</b>\n\n▪️ <b>الاسم:</b> ${current[0].full_name} (@${current[0].username})\n▪️ <b>العملية:</b> ترقية مميزة تم خصم ${price}$ من المحفظة.`);

      return res.json({ success: true, message: `⭐ مبارك! تم تمييز بروفايلك في الدليل العام بنجاح وخصم ${price}$ من محفظتك لمدة شهر!` });
    } else {
      // De-promote
      const { error } = await supabase.from("zobon_main").update({ is_featured: false }).eq("main_id", auth.mainId);
      if (error) throw error;

      await logAudit(auth.userId, auth.role, "DEMOTE_PROFILE_FEATURED", "zobon_main", auth.mainId, { is_featured: true }, { is_featured: false });
      return res.json({ success: true, message: "تم إلغاء تثبيتك من القائمة المميزة." });
    }
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});


// Change password
router.post("/api/profile/change-password", async (req, res) => {
  const { auth, oldPassword, newPassword } = req.body;
  if (!auth) return res.status(401).json({ success: false, message: "غير مصرح." });

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "يجب إدخال كلمة المرور القديمة والجديدة." });
  }

  try {
    const supabase = getSupabase();
    let table = "";
    let idColumn = "";
    let idValue = auth.userId || auth.mainId;

    if (auth.role === "admin") {
      table = "zobon_main";
      idColumn = "main_id";
      idValue = auth.mainId;
    } else if (auth.role === "accountant") {
      table = "accountants";
      idColumn = "accountant_id";
      idValue = auth.userId;
    } else if (auth.role === "client" || auth.role === "merchant") {
      table = "clients";
      idColumn = "client_id";
      idValue = auth.userId;
    } else {
      return res.status(400).json({ success: false, message: "نوع المستخدم غير صالح." });
    }

    const { data: user, error: userErr } = await supabase.from(table).select("*").eq(idColumn, idValue);
    if (userErr) throw userErr;
    if (!user || user.length === 0) return res.json({ success: false, message: "المستخدم غير موجود." });

    

    const currentUser = user[0];
    let oldHash = currentUser.password_hash;
    
    // For clients who might not have password_hash yet, fallback to phone
    if (table === "clients" && !oldHash) {
       oldHash = currentUser.phone ? currentUser.phone.replace(/[\s-]/g, "") : "";
       // Since it's plaintext for old clients, we just compare directly
       if (oldPassword !== oldHash) {
          return res.json({ success: false, message: "كلمة المرور القديمة غير صحيحة." });
       }
    } else {
       if (!verifyPassword(oldPassword, oldHash)) {
          return res.json({ success: false, message: "كلمة المرور القديمة غير صحيحة." });
       }
    }

    const hashedNew = hashPassword(newPassword);
    const { error: updateErr } = await supabase.from(table).update({ password_hash: hashedNew }).eq(idColumn, idValue);
    if (updateErr) throw updateErr;

    return res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح." });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../db";
import { logAudit } from "../audit";
import { sendTelegram, getSuperAdminUsername, checkAndDeactivateExpiredSubscriptions } from "../helpers";
import { hashPassword, verifyPassword, checkRateLimit, recordFailedAttempt, resetFailedAttempts, getJwtSecret, isBcryptHash } from "../auth";

const router = express.Router();

// Register a Manager (User Signup)
router.post("/api/auth/register", async (req, res) => {
  const { fullName, username, password, phone, bio } = req.body;
  if (!fullName || !username || !password || !phone) {
    return res.status(400).json({ success: false, message: "جميع الحقول الأساسية مطلوبة للتسجيل." });
  }

  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ success: false, message: "اسم المستخدم غير صالح. يجب أن يحتوي فقط على أحرف إنجليزية، أرقام، و underscore، ويكون بين 3 و 30 محرفاً." });
  }

  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || "";
  if (superAdminUsername && username.toLowerCase() === superAdminUsername.toLowerCase()) {
    return res.status(409).json({ success: false, message: "اسم المستخدم هذا محجوز." });
  }

  try {
    const supabase = getSupabase();
    
    // Check if username already exists in zobon_main
    const { data: duplicate } = await supabase
      .from("zobon_main")
      .select("main_id")
      .eq("username", username);

    if (duplicate && duplicate.length > 0) {
      return res.json({ success: false, message: "اسم المستخدم هذا محجوز لمدير آخر." });
    }

    // Get platform settings to determine signup bonus
    const { getPlatformSettings } = await import("../db");
    const settings = await getPlatformSettings();
    const signupBonusEnabled = settings.signup_bonus_enabled !== "false";
    const signupBonusAmount = parseFloat(settings.signup_bonus_amount || "15");

    // 1 month subscription validity by default for self-registration
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];

    const payload = {
      full_name: fullName,
      username,
      password_hash: hashPassword(password),
      phone,
      bio: bio || "",
      start_date: startDate,
      end_date: endDateStr,
      subscription_value: 0,
      paid_amount: 0,
      status: "Active",
      wallet_balance: 0,
      wallet_bonus: signupBonusEnabled ? signupBonusAmount : 0,
      first_client_free_used: false,
      first_accountant_free_used: false,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error } = await supabase.from("zobon_main").insert([payload]).select();
    if (error) throw error;

    const newManager = inserted[0];
    await logAudit(newManager.main_id, "admin", "SELF_REGISTRATION", "zobon_main", newManager.main_id, null, payload);

    if (signupBonusEnabled && signupBonusAmount > 0) {
      await supabase.from("wallet_transactions").insert([{
        main_id: newManager.main_id,
        amount: signupBonusAmount,
        type: "bonus",
        description: "بونص تسجيل حساب لاول مرة",
        target_type: "manual",
        target_id: null,
        balance_after: signupBonusAmount,
        created_at: new Date().toISOString(),
      }]);
    }

    // Trigger Telegram notification
    sendTelegram(`🆕 <b>مدير مالي جديد سجل بنفسه!</b>\n\n▪️ <b>الاسم:</b> ${fullName}\n▪️ <b>اسم المستخدم:</b> @${username}\n▪️ <b>الهاتف:</b> ${phone}\n▪️ <b>النبذة:</b> ${bio || "لا يوجد"}`);

    return res.json({ success: true, message: "تم تسجيل حسابك كمدير مالي جديد وتفعيله تلقائياً بنجاح! يمكنك الآن تسجيل الدخول." });
  } catch (err: any) {
    return res.json({ success: false, message: "فشل التسجيل: " + err.message });
  }
});

// Public pricing packages
router.get("/api/public/packages", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "pricing_packages");
    if (data && data.length > 0) {
      return res.json({ success: true, packages: JSON.parse(data[0].value) });
    }
    return res.json({ success: true, packages: null }); // Fallback to frontend defaults
  } catch (err) {
    return res.json({ success: false, message: "Error" });
  }
});

router.post("/api/admin/packages", async (req, res) => {
  const auth = req.body?.auth;
  if (!auth || !auth.isSuperAdmin) {
    return res.status(403).json({ success: false, message: "Unauthorized: Super Admin only." });
  }

  try {
    const supabase = getSupabase();
    const { packages } = req.body;
    
    const { data: existing } = await supabase.from("platform_settings").select("*").eq("key", "pricing_packages");
    if (existing && existing.length > 0) {
      await supabase.from("platform_settings").update({ value: JSON.stringify(packages) }).eq("key", "pricing_packages");
    } else {
      await supabase.from("platform_settings").insert({ key: "pricing_packages", value: JSON.stringify(packages) });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error in packages endpoint:", err); 
    res.json({ success: false, error: err.message });
  }
});

router.get("/api/public/managers", async (req, res) => {
  try {
    const supabase = getSupabase();
    let resultData = [];
    const { data, error } = await supabase
      .from("zobon_main")
      .select("main_id, full_name, username, phone, bio, facebook_url, instagram_url, linkedin_url, profile_image_url, is_featured")
      .eq("status", "Active")
      .order("is_featured", { ascending: false })
      .order("main_id", { ascending: false });

    if (error) {
      // Fallback if is_featured column is missing in DB
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("zobon_main")
        .select("main_id, full_name, username, phone, bio, facebook_url, instagram_url, linkedin_url, profile_image_url")
        .eq("status", "Active")
        .order("main_id", { ascending: false });
      if (fallbackError) throw fallbackError;
      resultData = fallbackData || [];
    } else {
      resultData = data || [];
    }

    const formattedData = resultData.map((m: any) => {
       let parsedBio = m.bio;
       let meta: any = { is_public: false };
       if (m.bio && m.bio.includes("|||META|||")) {
           const parts = m.bio.split("|||META|||");
           parsedBio = parts[0];
           try { meta = JSON.parse(parts[1]); } catch(e) {}
       }
       return { ...m, bio: parsedBio, ...meta };
    }).filter((m: any) => m.is_public === true);

    return res.json({ success: true, data: formattedData });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Process Login (Managers, Accountants, Merchants)
router.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبة." });
  }

  // Check brute force lock
  const rateLimit = checkRateLimit(username);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil(rateLimit.remainingMs / (60 * 1000));
    return res.status(429).json({ 
      success: false, 
      message: `تم حظر الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${minutesLeft} دقائق.` 
    });
  }

  try {
    await checkAndDeactivateExpiredSubscriptions();
    const supabase = getSupabase();
    const superAdminUsername = await getSuperAdminUsername();

    // 1. Search in managers (zobon_main)
    let { data: managers, error: mErr } = await supabase
      .from("zobon_main")
      .select("*")
      .eq("username", username);

    if (mErr) console.error("zobon_main search error:", mErr);

    // Auto-seed superadmin if database is completely empty
    if ((!managers || managers.length === 0) && username === superAdminUsername) {
      const { data: checkEmpty } = await supabase.from("zobon_main").select("main_id").limit(1);
      if (!checkEmpty || checkEmpty.length === 0) {
        const hashedPass = hashPassword(password);
        const { data: newAdmin } = await supabase.from("zobon_main").insert([{
          username: superAdminUsername,
          password_hash: hashedPass,
          full_name: "مدير النظام (المالك)",
          status: "Active"
        }]).select("*");
        if (newAdmin && newAdmin.length > 0) {
          managers = newAdmin;
        }
      }
    }

    if (managers && managers.length > 0) {
      const user = managers[0];
      if (verifyPassword(password, user.password_hash)) {
        if (user.status === "Active" || !user.status) {
          const isSuperAdmin = user.username === superAdminUsername;
          
          // Auto upgrade password to bcrypt if it was sha256
          if (!isBcryptHash(user.password_hash)) {
            try {
              const upgradedHash = hashPassword(password);
              await supabase.from("zobon_main").update({ password_hash: upgradedHash }).eq("main_id", user.main_id);
            } catch (err) {
              console.error("Failed to upgrade manager password to bcrypt", err);
            }
          }

          // Generate JWT Token
          const token = jwt.sign(
            { userId: user.main_id, username: user.username, role: "admin", isSuperAdmin },
            getJwtSecret(),
            { expiresIn: "30d" }
          );

          resetFailedAttempts(username);
          await logAudit(user.main_id, "admin", "LOGIN_SUCCESS", "zobon_main", user.main_id, null, null);
          
          return res.json({
            success: true,
            token,
            role: "admin",
            isSuperAdmin,
            message: "تم تسجيل الدخول بنجاح كمدير!",
            user: {
              mainId: user.main_id,
              id: user.main_id,
              username: user.username,
              fullName: user.full_name,
            },
          });
        } else {
          recordFailedAttempt(username);
          return res.json({
            success: false,
            message: "حساب المدير غير فعال أو انتهى اشتراكه، يرجى مراجعة إدارة المنصة.",
          });
        }
      } else {
        recordFailedAttempt(username);
        return res.json({ success: false, message: "كلمة المرور غير صحيحة." });
      }
    }

    // 2. Search in accountants
    const { data: accountants, error: aErr } = await supabase
      .from("accountants")
      .select("*")
      .or(`username.eq.${username},username.like.${username}_m%`);

    if (aErr) console.error("accountants search error:", aErr);

    if (accountants && accountants.length > 0) {
      const acc = accountants[0];
      if (verifyPassword(password, acc.password_hash)) {
        if (acc.status === "Active") {
          // Check if manager is Active
          const { data: managerData } = await supabase
            .from("zobon_main")
            .select("status")
            .eq("main_id", acc.main_id);

          if (!managerData || managerData.length === 0 || managerData[0].status !== "Active") {
            await logAudit(acc.accountant_id, "accountant", "LOGIN_BLOCKED_MANAGER_INACTIVE", "accountants", acc.accountant_id, null, null);
            return res.json({ success: false, message: "مديرك معطل حالياً. يرجى مراجعة الإدارة." });
          }

          if (acc.sys_status !== "Active") {
            await logAudit(acc.accountant_id, "accountant", "LOGIN_BLOCKED_SYS_INACTIVE", "accountants", acc.accountant_id, null, null);
            return res.json({ success: false, message: "حسابك معلق من قبل الإدارة العليا." });
          }

          // Auto upgrade password to bcrypt if it was sha256
          if (!isBcryptHash(acc.password_hash)) {
            try {
              const upgradedHash = hashPassword(password);
              await supabase.from("accountants").update({ password_hash: upgradedHash }).eq("accountant_id", acc.accountant_id);
            } catch (err) {
              console.error("Failed to upgrade accountant password to bcrypt", err);
            }
          }

          // Generate JWT Token
          const cleanAccUsername = acc.username ? acc.username.split("_m")[0] : acc.username;
          const token = jwt.sign(
            { userId: acc.accountant_id, username: cleanAccUsername, role: "accountant", isSuperAdmin: false },
            getJwtSecret(),
            { expiresIn: "30d" }
          );

          resetFailedAttempts(username);
          await logAudit(acc.accountant_id, "accountant", "LOGIN_SUCCESS", "accountants", acc.accountant_id, null, null);
          
          return res.json({
            success: true,
            token,
            role: "accountant",
            message: "تم تسجيل الدخول كمحاسب!",
            user: {
              mainId: acc.main_id,
              id: acc.accountant_id,
              username: cleanAccUsername,
              fullName: acc.full_name,
            },
          });
        } else {
          recordFailedAttempt(username);
          return res.json({ success: false, message: "حسابك كمحاسب معطل." });
        }
      } else {
        recordFailedAttempt(username);
        return res.json({ success: false, message: "كلمة المرور غير صحيحة." });
      }
    }

    // 3. Search in clients (merchants) using client_id or company_name & phone
    let clientQuery = supabase.from("clients").select("*");
    if (!isNaN(Number(username))) {
      clientQuery = clientQuery.eq("client_id", Number(username));
    } else {
      clientQuery = clientQuery.eq("company_name", username);
    }

    const { data: clients, error: cErr } = await clientQuery;
    if (clients && clients.length > 0) {
      const client = clients[0];
      // Match the phone number as the password credential
      if (client.phone && client.phone.replace(/[\s-]/g, "") === password.replace(/[\s-]/g, "")) {
        if (client.sys_status !== "Active") {
          return res.json({ success: false, message: "حسابك معلق من قبل الإدارة العليا." });
        }
        if (client.status !== "Active") {
          return res.json({ success: false, message: "حسابك معطل من قبل المدير المباشر." });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (client.sys_end_date && new Date(client.sys_end_date) < today) {
          return res.json({ success: false, message: "انتهت صلاحية اشتراك النظام. يرجى مراجعة الإدارة العليا." });
        }
        if (client.end_date && new Date(client.end_date) < today) {
          return res.json({ success: false, message: "انتهت صلاحية الاشتراك. يرجى مراجعة مديرك المباشر." });
        }

        // Generate JWT Token for Merchant
        const token = jwt.sign(
          { userId: client.client_id, username: client.company_name, role: "client", isSuperAdmin: false },
          getJwtSecret(),
          { expiresIn: "30d" }
        );

        resetFailedAttempts(username);
        await logAudit(client.client_id, "client", "LOGIN_SUCCESS", "clients", client.client_id, null, null);
        
        return res.json({
          success: true,
          token,
          role: "client",
          message: "تم تسجيل الدخول بنجاح كتاجر!",
          user: {
            mainId: client.main_id,
            id: client.client_id,
            username: client.company_name,
            fullName: client.company_name,
          },
        });
      } else {
        recordFailedAttempt(username);
        return res.json({ success: false, message: "رقم الجوال المرفق بالمنشأة غير صحيح." });
      }
    }

    recordFailedAttempt(username);
    return res.json({ success: false, message: "اسم المستخدم غير موجود." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "حدث خطأ أثناء تسجيل الدخول: " + err.message });
  }
});

// Change Password
router.post("/api/auth/change-password", async (req, res) => {
  const { auth, role, userId, newPassword } = req.body;
  
  if (!auth || !auth.userId) return res.status(401).json({ success: false, message: "غير مصرح" });

  if (!auth.isSuperAdmin) {
    if (Number(userId) !== Number(auth.userId) || role !== auth.role) {
      return res.status(403).json({ success: false, message: "غير مصرح لك بتغيير كلمة مرور حساب آخر" });
    }
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
  }

  if (!role || !userId) {
    return res.status(400).json({ success: false, message: "بيانات غير مكتملة لتغيير كلمة المرور." });
  }

  try {
    const supabase = getSupabase();
    const table = role === "admin" ? "zobon_main" : "accountants";
    const idColumn = role === "admin" ? "main_id" : "accountant_id";
    const hashedPass = hashPassword(newPassword);

    const { error } = await supabase
      .from(table)
      .update({ password_hash: hashedPass })
      .eq(idColumn, userId);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "PASSWORD_CHANGED", table, userId, null, null);
    return res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

// Reset Any User Password (Super Admin Only)
router.post("/api/auth/reset-any-password", async (req, res) => {
  const { auth, role, id, newPassword } = req.body;
  if (!auth || !auth.isSuperAdmin) {
    return res.status(403).json({ success: false, message: "صلاحية غير كافية." });
  }

  try {
    const supabase = getSupabase();
    const table = role === "admin" ? "zobon_main" : "accountants";
    const idColumn = role === "admin" ? "main_id" : "accountant_id";
    const hashedPass = hashPassword(newPassword);

    const { error } = await supabase
      .from(table)
      .update({ password_hash: hashedPass })
      .eq(idColumn, id);

    if (error) throw error;

    await logAudit(auth.userId, auth.role, "SUPERADMIN_PASSWORD_RESET", table, id, null, null);
    return res.json({ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح!" });
  } catch (err: any) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;

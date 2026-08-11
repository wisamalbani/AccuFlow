import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getSupabase } from "./db";
import { getSuperAdminUsername } from "./helpers";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = "CRITICAL: JWT_SECRET environment variable is required. Please add it in your settings.";
    console.error(err);
    throw new Error(err);
  }
  return secret;
}

export function isBcryptHash(str: string): boolean {
  return typeof str === "string" && (str.startsWith("$2a$") || str.startsWith("$2b$"));
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (isBcryptHash(hash)) {
    return bcrypt.compareSync(password, hash);
  }
  const sha256 = crypto.createHash("sha256").update(password).digest("hex");
  return sha256 === hash;
}

// In-memory rate limiter for login
const failedLoginAttempts = new Map<string, { count: number; lockUntil: number }>();

export function checkRateLimit(username: string): { allowed: boolean; remainingMs: number } {
  const attempt = failedLoginAttempts.get(username);
  if (!attempt) return { allowed: true, remainingMs: 0 };
  
  if (attempt.count >= 5 && Date.now() < attempt.lockUntil) {
    return { allowed: false, remainingMs: attempt.lockUntil - Date.now() };
  }
  
  if (Date.now() >= attempt.lockUntil) {
    failedLoginAttempts.delete(username);
  }
  
  return { allowed: true, remainingMs: 0 };
}

export function recordFailedAttempt(username: string) {
  const attempt = failedLoginAttempts.get(username) || { count: 0, lockUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockUntil = Date.now() + 5 * 60 * 1000; // Lock for 5 minutes
  }
  failedLoginAttempts.set(username, attempt);
}

export function resetFailedAttempts(username: string) {
  failedLoginAttempts.delete(username);
}

// JWT verification and authorization middleware
export async function authMiddleware(req: any, res: any, next: any) {
  // Bypass for non-API routes or public assets
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/public/managers",
    "/api/clients/details-form",
  ];

  if (publicPaths.includes(req.path) || req.path.startsWith("/api/public/")) {
    return next();
  }

  const optionalAuthPaths = [
    "/api/transactions/save",
    "/api/transactions/save-complex",
    "/api/transactions/statement",
    "/api/transactions/manager-statement",
  ];

  let token = "";
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.body && req.body.auth && req.body.auth.token) {
    token = req.body.auth.token;
  }

  if (optionalAuthPaths.includes(req.path) && !token) {
    if (!req.body) req.body = {};
    req.body.auth = null;
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "توكن التحقق مفقود. الرجاء تسجيل الدخول مجدداً." });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    
    let initialMainId = null;
    if (decoded.role === "admin") {
      initialMainId = decoded.userId;
    } else if (decoded.role === "accountant") {
      const supabase = getSupabase();
      const { data: accRec } = await supabase.from("accountants").select("main_id").eq("accountant_id", decoded.userId).limit(1);
      if (accRec && accRec.length > 0) initialMainId = accRec[0].main_id;
    }

    let verifiedAuth: any = {
      userId: decoded.userId,
      mainId: initialMainId,
      role: decoded.role,
      isSuperAdmin: !!decoded.isSuperAdmin,
      username: decoded.username,
      token: token
    };

    if (req.body && req.body.auth) {
      const clientRequestedAuth = req.body.auth;
      
      if (clientRequestedAuth.role === "accountant" && decoded.role === "admin") {
        const supabase = getSupabase();
        const { data: accountantRecord } = await supabase
          .from("accountants")
          .select("*")
          .eq("accountant_id", clientRequestedAuth.userId);
          
        const matchedAccountant = accountantRecord && accountantRecord.length > 0
          ? accountantRecord.find((a: any) => (a.username ? a.username.split("_m")[0] : a.username) === decoded.username)
          : null;

        if (matchedAccountant) {
          verifiedAuth = {
            userId: matchedAccountant.accountant_id,
            mainId: matchedAccountant.main_id,
            role: "accountant",
            isSuperAdmin: false,
            username: decoded.username,
            token: token
          };
        } else {
          return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لهذا الملف المحاسبي المشترك." });
        }
      } 
      else if (clientRequestedAuth.role === "admin" && decoded.role === "accountant") {
        const supabase = getSupabase();
        const { data: managerRecord } = await supabase
          .from("zobon_main")
          .select("*")
          .eq("main_id", clientRequestedAuth.userId)
          .eq("username", decoded.username);

        if (managerRecord && managerRecord.length > 0) {
          verifiedAuth = {
            userId: managerRecord[0].main_id,
            mainId: managerRecord[0].main_id,
            role: "admin",
            isSuperAdmin: managerRecord[0].username === await getSuperAdminUsername(),
            username: decoded.username,
            token: token
          };
        } else {
          return res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لملف المدير هذا." });
        }
      }
    }

    if (!req.body) req.body = {};
    req.body.auth = verifiedAuth;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: "جلسة العمل منتهية أو غير صالحة. يرجى تسجيل الدخول مجدداً." });
  }
}

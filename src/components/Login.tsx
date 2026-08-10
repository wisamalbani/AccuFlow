import React, { useState } from "react";
import { ShieldCheck, User, Lock, Building, PhoneCall, CheckCircle, Search } from "lucide-react";
import { toast } from "react-hot-toast";

interface LoginProps {
  onLoginSuccess: (user: any, role: string, isSuperAdmin: boolean, token: string) => void;
  onOpenDirectory?: () => void;
}

export default function Login({ onLoginSuccess, onOpenDirectory }: LoginProps) {
  const [roleTab, setRoleTab] = useState<"admin" | "register">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration Fields
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginPayload = {
        username: username,
        password: password,
      };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload),
      });

      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user, data.role, !!data.isSuperAdmin, data.token);
      } else {
        toast.error(data.message || "فشلت عملية تسجيل الدخول. يرجى التحقق من البيانات.");
      }
    } catch (err: any) {
      toast.error("خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRegSuccessMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regFullName,
          username: regUsername,
          password: regPassword,
          phone: regPhone,
          bio: regBio,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRegSuccessMsg(data.message);
        setRegFullName("");
        setRegUsername("");
        setRegPassword("");
        setRegPhone("");
        setRegBio("");
        // Switch back to login after 3 seconds
        setTimeout(() => {
          setRoleTab("admin");
          setRegSuccessMsg("");
        }, 3000);
      } else {
        toast.error(data.message || "فشلت عملية تسجيل الحساب المالي.");
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء التسجيل. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] flex flex-col items-center justify-center p-4" dir="rtl" id="loginSection">
      <div className="w-full max-w-md bg-[#141416] rounded-3xl shadow-2xl border border-zinc-800/80 overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white text-center">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">AccuFlow</h1>
          <p className="text-amber-50 text-[18px] font-medium">نظام محاسبي سحابي متكامل يربط بين المدير، المحاسب، والمنشأة</p>
        </div>

        <div className="p-6">
          {/* Mode Tabs */}
          <div className="flex bg-zinc-900 p-1.5 rounded-xl mb-6 gap-1">
            <button
              id="tab_admin"
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[20px] font-bold transition-all duration-200 cursor-pointer ${
                roleTab === "admin"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => {
                setRoleTab("admin");
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              تسجيل الدخول
            </button>
            <button
              id="tab_register"
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[20px] font-bold transition-all duration-200 cursor-pointer ${
                roleTab === "register"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => {
                setRoleTab("register");
              }}
            >
              إنشاء حساب جديد
            </button>
          </div>

          {roleTab !== "register" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[18px] font-bold text-zinc-300 block">اسم المستخدم أو كود التاجر</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="username_field"
                    type="text"
                    required
                    placeholder="اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-4 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-zinc-100 text-xs text-right"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[18px] font-bold text-zinc-300 block">كلمة المرور</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="password_field"
                    type="password"
                    required
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-zinc-100 text-xs text-right"
                  />
                </div>
              </div>

                <button
                id="loginBtn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-700 focus:outline-none transition-all shadow-lg disabled:opacity-50 text-[18px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? "جاري التحقق..." : "تسجيل الدخول"}
              </button>
            </form>
          ) : (
            /* Manager Self-Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[18px] font-bold text-zinc-300 block">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: James Carter أو سارة ابراهيم"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[18px] font-bold text-zinc-300 block">اسم المستخدم المختار</label>
                <input
                  type="text"
                  required
                  placeholder="سيكون معرف بروفايلك العام (مثال: James_Carter)"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[18px] font-bold text-zinc-300 block">كلمة المرور</label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة مرور قوية"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[18px] font-bold text-zinc-300 block">رقم الجوال للتواصل والواتساب</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: +9639000000"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[18px] font-bold text-zinc-300 block">ملخص بروفايلك المهني (للعملاء والزوار)</label>
                <textarea
                  rows={2}
                  placeholder="مستشار مالي ومراجع معتمد للشركات ومصمم حلول ضريبية..."
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {regSuccessMsg && (
                <div className="bg-emerald-950/40 text-emerald-400 text-xs font-bold p-3 rounded-xl border border-emerald-900/60 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>{regSuccessMsg}</span>
                </div>
              )}


              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all text-[18px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? "جاري الإنشاء..." : "🚀 تفعيل الحساب الذاتي والبدء فوراً"}
              </button>
            </form>
          )}

          {/* Directory Navigation Button */}
          {onOpenDirectory && (
            <button
              type="button"
              onClick={onOpenDirectory}
              className="w-full mt-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-bold transition-all text-[18px] flex items-center justify-center gap-1.5 border border-zinc-800/80 cursor-pointer"
            >
              <Search className="w-4 h-4 text-amber-500" />
              🔍 تصفح دليل المدراء الماليين العام (بدون دخول)
            </button>
          )}
        </div>

        <div className="bg-zinc-950/50 p-4 border-t border-zinc-800/80 text-center text-[12px] text-zinc-500 font-medium font-mono">
          AccuFlow v1.0 © 2026 - جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}

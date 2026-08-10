import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import ManagerDashboard from "./components/ManagerDashboard";
import MerchantPortal from "./components/MerchantPortal";
import PublicDirectory from "./components/PublicDirectory";
import { AuthState } from "./types";

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    userId: null,
    mainId: null,
    role: "",
    isSuperAdmin: false,
  });

  const [loading, setLoading] = useState(true);
  const [clientUrlParam, setClientUrlParam] = useState<string | null>(null);
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    // 0. Load font size setting
    const savedFontSize = localStorage.getItem("accountingFontSize");
    if (savedFontSize) {
      document.documentElement.style.setProperty("font-size", `${savedFontSize}px`, "important");
    }

    // 1. Detect if there is a "?client=CLIENT_ID" URL parameter (corresponds to GAS entry form gateway)
    const urlParams = new URLSearchParams(window.location.search);
    const clientParam = urlParams.get("client");
    if (clientParam) {
      setClientUrlParam(clientParam);
    }

    // 2. Fetch authenticated session from localStorage
    const savedUser = localStorage.getItem("accountingUser");
    const savedRole = localStorage.getItem("accountingRole");
    const savedSA = localStorage.getItem("isSuperAdmin");
    const savedToken = localStorage.getItem("accountingToken");

    if (savedUser && savedRole) {
      try {
        const user = JSON.parse(savedUser);
        setAuth({
          userId: user.id || null,
          mainId: user.mainId || null,
          role: savedRole as any,
          isSuperAdmin: savedSA === "true",
          username: user.username,
          fullName: user.fullName,
          token: savedToken || undefined,
        });
      } catch (err) {
        console.error("Local session parsing failed", err);
      }
    } else if (!clientParam) {
      setShowDirectory(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (user: any, role: string, isSuperAdmin: boolean, token: string) => {
    localStorage.setItem("accountingUser", JSON.stringify(user));
    localStorage.setItem("accountingRole", role);
    localStorage.setItem("isSuperAdmin", isSuperAdmin ? "true" : "false");
    localStorage.setItem("accountingToken", token);

    setAuth({
      userId: user.id,
      mainId: user.mainId,
      role: role as any,
      isSuperAdmin,
      username: user.username,
      fullName: user.fullName,
      token,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("accountingUser");
    localStorage.removeItem("accountingRole");
    localStorage.removeItem("isSuperAdmin");
    localStorage.removeItem("accountingToken");
    
    // Clear URL parameters to return to login screen
    if (window.location.search) {
      window.history.pushState({}, document.title, window.location.pathname);
    }
    
    setClientUrlParam(null);
    setAuth({
      userId: null,
      mainId: null,
      role: "",
      isSuperAdmin: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans animate-pulse" dir="rtl">
        {/* Top Header Skeleton */}
        <header className="bg-[#121318] border-b border-zinc-800 text-white px-4 md:px-8 py-3.5 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo & Title Skeleton */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 shrink-0"></div>
              <div className="space-y-2">
                <div className="h-4 w-36 bg-zinc-800 rounded-md"></div>
                <div className="h-3 w-24 bg-zinc-800/60 rounded-md"></div>
              </div>
            </div>

            {/* Right Controls Skeleton */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="h-9 w-28 bg-zinc-800/80 rounded-xl"></div>
              <div className="h-9 w-32 bg-zinc-800/80 rounded-xl"></div>
              <div className="h-9 w-24 bg-zinc-800/80 rounded-xl"></div>
            </div>
          </div>
        </header>

        {/* Main Container Layout Skeleton */}
        <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Skeleton (Right side in RTL) */}
          <aside className="lg:col-span-1 space-y-3">
            <div className="bg-[#141416] p-3 rounded-3xl border border-zinc-800 space-y-2.5">
              <div className="h-11 bg-gradient-to-r from-amber-500/30 to-orange-500/20 rounded-xl w-full"></div>
              <div className="h-11 bg-zinc-800/50 rounded-xl w-full"></div>
              <div className="h-11 bg-zinc-800/50 rounded-xl w-full"></div>
              <div className="h-11 bg-zinc-800/50 rounded-xl w-full"></div>
            </div>

            {/* Sidebar widget skeleton */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-8 w-full bg-slate-100 rounded-xl"></div>
              <div className="h-8 w-full bg-slate-100 rounded-xl"></div>
            </div>
          </aside>

          {/* Main Content Area Skeleton */}
          <main className="lg:col-span-3 space-y-6">
            {/* Top Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded"></div>
                  <div className="w-8 h-8 rounded-xl bg-amber-100"></div>
                </div>
                <div className="h-7 w-28 bg-slate-200 rounded-md"></div>
                <div className="h-3 w-32 bg-slate-100 rounded"></div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded"></div>
                  <div className="w-8 h-8 rounded-xl bg-blue-100"></div>
                </div>
                <div className="h-7 w-28 bg-slate-200 rounded-md"></div>
                <div className="h-3 w-32 bg-slate-100 rounded"></div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded"></div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100"></div>
                </div>
                <div className="h-7 w-28 bg-slate-200 rounded-md"></div>
                <div className="h-3 w-32 bg-slate-100 rounded"></div>
              </div>
            </div>

            {/* Toolbar / Search Bar Skeleton */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="h-10 w-full sm:w-72 bg-slate-100 rounded-xl"></div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="h-10 w-28 bg-slate-100 rounded-xl"></div>
                <div className="h-10 w-28 bg-amber-500/20 rounded-xl"></div>
              </div>
            </div>

            {/* Table / List Skeleton */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-4 w-16 bg-slate-100 rounded"></div>
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/80">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-200"></div>
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
                        <div className="h-2.5 w-16 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                      <div className="h-7 w-16 bg-slate-200/60 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 0. Public Directory View for everyone
  if (showDirectory) {
    return <PublicDirectory onBackToLogin={() => setShowDirectory(false)} />;
  }

  // 1. If "?client=CLIENT_ID" is defined in the URL, route directly to Public Merchant Portal (White label gateway)
  if (clientUrlParam) {
    return (
      <MerchantPortal
        auth={{ userId: parseInt(clientUrlParam), mainId: null, role: "client", isSuperAdmin: false }}
        clientIdFromUrl={clientUrlParam}
        onLogout={handleLogout}
      />
    );
  }

  // 2. If logged in as Merchant (client)
  if (auth.userId && auth.role === "client") {
    return (
      <MerchantPortal
        auth={auth}
        onLogout={handleLogout}
      />
    );
  }

  // 3. If logged in as Manager/Super Admin or Accountant
  if (auth.userId && (auth.role === "admin" || auth.role === "accountant")) {
    return (
      <ManagerDashboard
        auth={auth}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Default view is Login
  return <Login onLoginSuccess={handleLoginSuccess} onOpenDirectory={() => setShowDirectory(true)} />;
}

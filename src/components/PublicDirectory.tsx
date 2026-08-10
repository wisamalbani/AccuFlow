import { defaultPackages } from "../types";
import React, { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Mail, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Globe, 
  Award, 
  BookOpen, 
  Clock, 
  ArrowLeft,
  User,
  Building
} from "lucide-react";

interface PublicDirectoryProps {
  onBackToLogin: () => void;
}

export default function PublicDirectory({ onBackToLogin }: PublicDirectoryProps) {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManager, setSelectedManager] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"managers" | "pricing">("managers");
  const [packagesData, setPackagesData] = useState<any>(defaultPackages);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch("/api/public/packages");
        const data = await res.json();
        if (data.success && data.packages && !Array.isArray(data.packages)) {
          setPackagesData(data.packages);
        }
      } catch (err) {}
    };
    fetchPackages();
  }, []);


  useEffect(() => {
    const fetchPublicManagers = async () => {
      try {
        const res = await fetch("/api/public/managers");
        const data = await res.json();
        if (data.success) {
          setManagers(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load public directory", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicManagers();
  }, []);

  const filteredManagers = managers.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f5] flex flex-col" dir="rtl" id="publicDirectoryUI">
      
      {/* Sticky Header */}
      <header className="bg-[#141416] text-white border-b border-zinc-800/80 shadow-md p-5 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-xl text-white shadow-lg shadow-orange-500/10">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">الدليل العام للمدراء الماليين المعتمدين</h1>
            <p className="text-xs text-zinc-400 font-medium">AccuFlow - تواصل المباشر مع الخبراء</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-800/80 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4 text-amber-500" />
           تسجيل الدخول
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 flex-1 w-full relative">
        

      {/* Tabs */}
      <div className="flex justify-center mb-8 relative z-10 mt-2">
        <div className="bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-2xl flex border border-zinc-800/80 w-full max-w-sm">
          <button
            onClick={() => setActiveTab("managers")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === "managers" ? "bg-amber-500 text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            المدراء الماليين
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === "pricing" ? "bg-amber-500 text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            الأسعار
          </button>
        </div>
      </div>
      
      
      {activeTab === "pricing" ? (
        <div className="max-w-5xl mx-auto space-y-12 pb-20">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-extrabold text-white">أسعار شفافة وبسيطة، بدون رسوم خفية</h2>
            <p className="text-zinc-400 text-lg">اختر الخدمات التي تناسب احتياجات منشأتك.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {packagesData.basic?.map((pkg: any) => (
            <div key={pkg.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-xs font-bold px-4 py-1.5 rounded-bl-xl">أساسي</div>
              <h3 className="text-xl font-bold text-white mb-2">{pkg.title}</h3>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-4xl font-extrabold text-amber-500">{pkg.price}</span>
                <span className="text-zinc-400 mb-1">/ {pkg.duration}</span>
              </div>
              <ul className="space-y-4 text-zinc-300 text-sm font-medium">
                {pkg.features?.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3"><span className="text-amber-500">✔</span> {f}</li>
                ))}
              </ul>
            </div>
            ))}
          </div>

          <div className="bg-zinc-900/50 border border-amber-500/30 rounded-3xl p-8 space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="text-amber-500">📦</span> باقات وعروض التوفير الشاملة
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {packagesData.bundles?.map((pkg: any) => (
               <div key={pkg.id} className={`bg-zinc-950 border ${pkg.popular ? "border-amber-500/40" : "border-zinc-800"} rounded-2xl p-5 relative`}>
                 {pkg.popular && <div className="absolute -top-3 right-4 bg-amber-500 text-zinc-950 text-[10px] font-bold px-2 py-1 rounded-full">الأكثر طلباً</div>}
                 <h4 className="text-base font-bold text-white mb-2">{pkg.title}</h4>
                 <p className="text-sm text-zinc-400 mb-4">{pkg.description}</p>
                 <div className="text-2xl font-extrabold text-amber-500 mb-2">{pkg.price}{pkg.oldPrice && <span className="text-xs text-zinc-500 line-through mr-2">{pkg.oldPrice}</span>}</div>
                 <div className="text-xs text-zinc-300">{pkg.features}</div>
               </div>
               ))}
             </div>
          </div>

          <div className="bg-sky-950/20 border border-sky-900/50 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-500">☁️</span> المساحة السحابية الإضافية (Add-ons)
            </h3>
            <p className="text-sm text-zinc-400">جميع الحسابات تأتي بمساحة 25 ميغابايت مجانية. يمكنك شراء حزم إضافية لتلبية الاحتياجات الأكبر للمرفقات والوثائق:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packagesData.addons?.map((pkg: any) => (
              <div key={pkg.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between relative">
                <div className="absolute top-4 left-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{pkg.title}</h4>
                  <p className="text-xs text-zinc-400 mb-4">{pkg.description}</p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4">
                  <span className="text-2xl font-extrabold text-sky-400">{pkg.price}</span>
                  <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full">{pkg.duration}</span>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
      ) : (

        <>
        {/* Manager list */}
        <div className="space-y-6 w-full">
          <div className="bg-[#141416] p-5 rounded-3xl border border-zinc-800/80 space-y-4">
            <h2 className="text-base font-extrabold text-zinc-100">تصفح وابحث عن خبراء الإدارة المالية الحرة</h2>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="ابحث باسم المدير، أو تخصصه، أو الكلمات المفتاحية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
              <p className="text-xs text-zinc-500 font-bold">جاري تحميل دليل المدراء الماليين...</p>
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="bg-[#141416] p-12 text-center rounded-3xl border border-zinc-800/80 text-zinc-500 font-bold text-xs">
              لا توجد حسابات مدراء ماليين معلنة تطابق بحثك حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredManagers.map((m) => (
                <div 
                  key={m.main_id}
                  onClick={() => setSelectedManager(m)}
                  className="bg-[#141416] rounded-3xl border transition-all p-5 cursor-pointer flex flex-col justify-between hover:border-amber-500/50 border-zinc-800/60 shadow-sm hover:shadow-amber-500/5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-lg font-extrabold uppercase shadow-inner shrink-0">
                        {m.profile_image_url ? (
                          <img src={m.profile_image_url} alt={m.full_name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          m.full_name?.charAt(0) || "M"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-zinc-100 text-base truncate max-w-full">{m.full_name}</h3>
                          {m.is_featured && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              ⭐ حساب مميز
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-500 font-bold mt-0.5 truncate">@{m.username}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 font-medium">
                      {m.bio || "لا توجد تفاصيل بروفايل مهني مكتوبة بعد لهذا المدير المالي."}
                    </p>
                  </div>

                  <div className="border-t border-zinc-800/60 pt-4 mt-4 flex justify-between items-center text-xs">
                    <span className="text-zinc-500 flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      متاح للتواصل
                    </span>
                    <button
                      type="button"
                      className="bg-zinc-900 text-amber-400 font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-all text-[11px] border border-zinc-800"
                    >
                      عرض الملف الشخصي
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )} 
      </main>

      {/* Expanded Manager Modal */}
      {selectedManager && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setSelectedManager(null)}
        >
          <div 
            className="bg-[#141416] rounded-3xl border border-zinc-800 p-6 md:p-8 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedManager(null)}
              className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-extrabold uppercase mx-auto shadow-md">
                {selectedManager.profile_image_url ? (
                  <img src={selectedManager.profile_image_url} alt={selectedManager.full_name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  selectedManager.full_name?.charAt(0) || "M"
                )}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-zinc-100">{selectedManager.full_name}</h3>
                <p className="text-xs text-amber-500 font-bold mt-1">معرف النظام: @{selectedManager.username}</p>
              </div>
            </div>

            <div className="border-t border-zinc-800/60 pt-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest block uppercase">الخبرة والنبذة المهنية</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {selectedManager.bio || "لم يكتب نبذة بروفايل بعد."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-center">
                  <span className="text-zinc-500 block text-[10px] font-bold">سنوات الخبرة</span>
                  <span className="font-extrabold text-zinc-200 text-sm">{selectedManager.years_exp ? `${selectedManager.years_exp} عام` : "غير محدد"}</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-center">
                  <span className="text-zinc-500 block text-[10px] font-bold">اللغات</span>
                  <span className="font-extrabold text-zinc-200 text-sm">{selectedManager.languages || "العربية"}</span>
                </div>
              </div>
            </div>

            {/* Direct Instant Contact Buttons */}
            <div className="space-y-3 border-t border-zinc-800/60 pt-5">
              <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest block uppercase text-center">قنوات الاتصال المباشر والتوظيف</span>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <a
                  href={`https://wa.me/${selectedManager.phone?.replace(/[\s+]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  واتساب
                </a>
                
                <a
                  href={`https://t.me/${selectedManager.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  تليغرام
                </a>
              </div>

              {selectedManager.phone && (
                <a
                  href={`tel:${selectedManager.phone}`}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold py-3 rounded-xl transition-all text-center border border-zinc-800 cursor-pointer mt-3"
                >
                  <Phone className="w-4 h-4 text-amber-500" />
                  اتصال هاتفي مباشر
                </a>
              )}

              <div className="flex justify-center gap-6 pt-5 mt-2">
                {selectedManager.facebook_url && (
                  <a href={selectedManager.facebook_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-500 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {selectedManager.instagram_url && (
                  <a href={selectedManager.instagram_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-pink-500 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {selectedManager.linkedin_url && (
                  <a href={selectedManager.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-400 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-zinc-950 text-zinc-500 p-6 text-center text-xs border-t border-zinc-900 font-medium">
        AccuFlow© 2026 - منصة ربط المنشآت التجارية بالخبرة المحاسبية والرقابة الذكية.
      </footer>
    </div>
  );
}

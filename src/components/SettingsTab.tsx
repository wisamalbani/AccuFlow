import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SettingsTab({ auth }: { auth: any }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings", {
          headers: {
            "Authorization": `Bearer ${auth?.token}`
          }
        });
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth, settings })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم الحفظ بنجاح!");
      } else {
        toast.error("فشل الحفظ: " + (data.error || data.message || "Unknown error"));
      }
    } catch (err) {
      toast.error("فشل الاتصال الخادم");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-10">جاري التحميل...</div>;
  if (!settings) return null;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">إعدادات المنصة</h2>
        {auth?.isSuperAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-800 border-b pb-2">إعدادات بونص التسجيل والمحاسبين</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.signup_bonus_enabled === "true"}
              onChange={(e) => setSettings({ ...settings, signup_bonus_enabled: e.target.checked ? "true" : "false" })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <span className="font-bold text-slate-700">تفعيل منح بونص للمدراء الجدد عند التسجيل</span>
          </label>
          {settings.signup_bonus_enabled === "true" && (
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 block">رصيد البونص الممنوح ($)</label>
              <input
                type="number"
                value={settings.signup_bonus_amount || "15"}
                onChange={(e) => setSettings({ ...settings, signup_bonus_amount: e.target.value })}
                className="w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.accountant_bonus_enabled === "true"}
              onChange={(e) => setSettings({ ...settings, accountant_bonus_enabled: e.target.checked ? "true" : "false" })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <span className="font-bold text-slate-700">تفعيل منح بونص عند إضافة محاسب جديد</span>
          </label>
          {settings.accountant_bonus_enabled === "true" && (
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 block">رصيد البونص الممنوح للمحاسب ($)</label>
              <input
                type="number"
                value={settings.accountant_bonus_amount || "10"}
                onChange={(e) => setSettings({ ...settings, accountant_bonus_amount: e.target.value })}
                className="w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

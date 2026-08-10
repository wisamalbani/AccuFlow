import React, { useState, useEffect } from "react";
import { defaultPackages } from "../types";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function PackagesTab({ auth }: { auth: any }) {
  const [packages, setPackages] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch("/api/public/packages");
        const data = await res.json();
        if (data.success && data.packages && !Array.isArray(data.packages) && Object.keys(data.packages).length > 0) {
          setPackages({
            basic: data.packages.basic || [],
            bundles: data.packages.bundles || [],
            addons: data.packages.addons || [],
          });
        } else {
          setPackages(JSON.parse(JSON.stringify(defaultPackages)));
        }
      } catch (err) {
        setPackages(JSON.parse(JSON.stringify(defaultPackages)));
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const isSuperAdmin = auth?.isSuperAdmin;
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth, packages })
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

  const updateItem = (category: string, idx: number, field: string, value: any) => {
    const newPkgs = { ...packages };
    newPkgs[category][idx][field] = value;
    setPackages(newPkgs);
  };

  const removeItem = (category: string, idx: number) => {
    const newPkgs = { ...packages };
    newPkgs[category].splice(idx, 1);
    setPackages(newPkgs);
  };

  const addItem = (category: string) => {
    const newPkgs = { ...packages };
    if (category === "basic") {
      newPkgs.basic.push({ id: Date.now(), title: "باقة جديدة", price: "0", duration: "شهرياً", features: ["ميزة 1"] });
    } else if (category === "bundles") {
      newPkgs.bundles.push({ id: Date.now(), title: "عرض جديد", description: "", price: "0", oldPrice: "0", features: "ميزة 1، ميزة 2" });
    } else if (category === "addons") {
      newPkgs.addons.push({ id: Date.now(), title: "مساحة جديدة", description: "", price: "0", duration: "شهرياً" });
    }
    setPackages(newPkgs);
  };

  if (loading) return <div className="text-center p-10">جاري التحميل...</div>;
  if (!packages) return null;

  return (
    <div className="space-y-8 pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">إدارة الباقات والأسعار</h2>
        {isSuperAdmin && <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>}
      </div>

      <div className="space-y-6">
        {/* Basic */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800">الباقات الأساسية</h3>
            {isSuperAdmin && <button onClick={() => addItem("basic")} className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100"><Plus className="w-4 h-4"/> إضافة باقة</button>}
          </div>
          {(packages.basic || []).map((pkg: any, idx: number) => (
            <div key={pkg.id || idx} className="relative grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-xl border">
              {isSuperAdmin && <button onClick={() => removeItem("basic", idx)} className="absolute top-2 left-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.title} disabled={!isSuperAdmin} onChange={e => updateItem("basic", idx, "title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السعر</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.price} disabled={!isSuperAdmin} onChange={e => updateItem("basic", idx, "price", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المدة</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.duration} disabled={!isSuperAdmin} onChange={e => updateItem("basic", idx, "duration", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الميزات (كل ميزة بسطر)</label>
                <textarea rows={3} className="w-full border rounded-lg p-2 text-sm" value={Array.isArray(pkg.features) ? pkg.features.join("\n") : pkg.features || ""} disabled={!isSuperAdmin} onChange={e => updateItem("basic", idx, "features", e.target.value.split("\n"))} />
              </div>
            </div>
          ))}
        </div>

        {/* Bundles */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800">عروض التوفير الشاملة</h3>
            {isSuperAdmin && <button onClick={() => addItem("bundles")} className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100"><Plus className="w-4 h-4"/> إضافة عرض</button>}
          </div>
          {(packages.bundles || []).map((pkg: any, idx: number) => (
            <div key={pkg.id || idx} className="relative grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-slate-50 rounded-xl border pr-8 lg:pr-4">
              {isSuperAdmin && <button onClick={() => removeItem("bundles", idx)} className="absolute top-2 left-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.title} disabled={!isSuperAdmin} onChange={e => updateItem("bundles", idx, "title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.description} disabled={!isSuperAdmin} onChange={e => updateItem("bundles", idx, "description", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السعر الجديد</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.price} disabled={!isSuperAdmin} onChange={e => updateItem("bundles", idx, "price", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السعر القديم</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.oldPrice} disabled={!isSuperAdmin} onChange={e => updateItem("bundles", idx, "oldPrice", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الميزات</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.features} disabled={!isSuperAdmin} onChange={e => updateItem("bundles", idx, "features", e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* Addons */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800">المساحة الإضافية (Add-ons)</h3>
            {isSuperAdmin && <button onClick={() => addItem("addons")} className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100"><Plus className="w-4 h-4"/> إضافة مساحة</button>}
          </div>
          {(packages.addons || []).map((pkg: any, idx: number) => (
            <div key={pkg.id || idx} className="relative grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-xl border pr-8 lg:pr-4">
              {isSuperAdmin && <button onClick={() => removeItem("addons", idx)} className="absolute top-2 left-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.title} disabled={!isSuperAdmin} onChange={e => updateItem("addons", idx, "title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                <textarea rows={2} className="w-full border rounded-lg p-2 text-sm" value={pkg.description} disabled={!isSuperAdmin} onChange={e => updateItem("addons", idx, "description", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السعر</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.price} disabled={!isSuperAdmin} onChange={e => updateItem("addons", idx, "price", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المدة</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={pkg.duration} disabled={!isSuperAdmin} onChange={e => updateItem("addons", idx, "duration", e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

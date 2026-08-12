import React, { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { exportToExcel, StatementColumn } from "../utils/exportUtils";

interface ExportButtonProps {
  title: string;
  filename: string;
  columns: StatementColumn[];
  data: any[];
  className?: string;
  buttonText?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  title,
  filename,
  columns,
  data,
  className = "",
  buttonText = "تصدير إلى إكسل",
}) => {
  const [loading, setLoading] = useState(false);

  const handleExportExcel = async () => {
    if (!data || data.length === 0) {
      toast.error("لا توجد بيانات للتصدير في هذا الكشف.");
      return;
    }
    setLoading(true);
    try {
      exportToExcel(title, columns, data, filename);
      toast.success("✅ تم تصدير البيانات كملف Excel بنجاح!");
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error(err.message || "فشل تصدير ملف Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleExportExcel}
      className={
        className ||
        "inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer select-none disabled:opacity-60"
      }
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5" />
      )}
      <span>{buttonText}</span>
    </button>
  );
};

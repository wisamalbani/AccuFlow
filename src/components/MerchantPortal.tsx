import React, { useState, useEffect } from "react";
import { 
  Building, 
  DollarSign, 
  Layers, 
  RotateCw, 
  ClipboardList, 
  Upload, 
  TrendingUp, 
  Plus, 
  Minus, 
  PhoneCall, 
  FileText,
  AlertTriangle,
  History,
  HardDrive,
  User,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { AuthState } from "../types";
import imageCompression from "browser-image-compression";
import { ExportButton } from "./ExportButton";

interface MerchantPortalProps {
  auth: AuthState;
  onLogout: () => void;
  clientIdFromUrl?: string;
}

export default function MerchantPortal({ auth, onLogout, clientIdFromUrl }: MerchantPortalProps) {
  const targetClientId = clientIdFromUrl || auth.userId?.toString();

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (val: any): string => {
    if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
    return Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const [activeTab, setActiveTab] = useState<"single" | "exchange" | "complex" | "statement" | "manager_statement" | "profile">("single");
  const [viewAttachments, setViewAttachments] = useState<{ open: boolean; list: any[]; title?: string }>({ open: false, list: [] });
  const [clientInfo, setClientData] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, number>>({ SYP: 0, USD: 0, EUR: 0 });
  const [manager, setManager] = useState<any>(null);
  const [monthlyTxCount, setMonthlyTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [portalToken, setPortalToken] = useState<string | null>(null);

  // Single transaction form states
  const [singleType, setSingleType] = useState<"قبض" | "صرف">("قبض");
  const [singleCur, setSingleCur] = useState("ليرة سورية");
  const [singleAmt, setSingleAmt] = useState("");
  const [singleNotes, setSingleNotes] = useState("");
  const [singleFile, setSingleFile] = useState<File | null>(null);

  // Exchange form states
  const [exInCur, setExInCur] = useState("دولار أمريكي");
  const [exInAmt, setExInAmt] = useState("");
  const [exOutCur, setExOutCur] = useState("ليرة سورية");
  const [exOutAmt, setExOutAmt] = useState("");
  const [exNotes, setExNotes] = useState("");
  const [exFile, setExFile] = useState<File | null>(null);

  // Complex multi-row form states
  const [complexRows, setComplexRows] = useState<Array<{ type: "قبض" | "صرف"; currency: string; amount: string }>>([
    { type: "قبض", currency: "دولار أمريكي", amount: "" },
    { type: "صرف", currency: "ليرة سورية", amount: "" }
  ]);
  const [complexNotes, setComplexNotes] = useState("");
  const [complexFile, setComplexFile] = useState<File | null>(null);

  // Statement ledger states
  const [stCurrency, setStCurrency] = useState("ليرة سورية");
  const [stStart, setStStart] = useState("");
  const [stEnd, setStEnd] = useState("");
  const [statementData, setStatementData] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const [managerStatementData, setManagerStatementData] = useState<any>(null);
  const [managerStatementLoading, setManagerStatementLoading] = useState(false);

  // Statement search, sort & status badge states
  const [stSearchQuery, setStSearchQuery] = useState("");
  const [stSortField, setStSortField] = useState<"tx_id" | "tx_type" | "amount" | "balance" | "notes" | "created_at" | "status" | "attachment">("tx_id");
  const [stSortDir, setStSortDir] = useState<"asc" | "desc">("desc");
  const [stStatusFilter, setStStatusFilter] = useState<string>("all");

  const handleStSort = (field: "tx_id" | "tx_type" | "amount" | "balance" | "notes" | "created_at" | "status" | "attachment") => {
    if (stSortField === field) {
      setStSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setStSortField(field);
      setStSortDir(field === "amount" || field === "created_at" || field === "tx_id" || field === "balance" ? "desc" : "asc");
    }
  };

  const renderStSortIndicator = (field: string) => {
    if (stSortField !== field) {
      return <span className="text-slate-300 opacity-60 mr-1 text-[10px]">↕</span>;
    }
    return stSortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    );
  };

  // Manager Statement search & sort states
  const [mgrStSearchQuery, setMgrStSearchQuery] = useState("");
  const [mgrStSortField, setMgrStSortField] = useState<"created_at" | "tx_id" | "tx_type" | "amount" | "balance" | "notes">("tx_id");
  const [mgrStSortDir, setMgrStSortDir] = useState<"asc" | "desc">("desc");

  const handleMgrStSort = (field: "created_at" | "tx_id" | "tx_type" | "amount" | "balance" | "notes") => {
    if (mgrStSortField === field) {
      setMgrStSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setMgrStSortField(field);
      setMgrStSortDir(field === "amount" || field === "created_at" || field === "tx_id" || field === "balance" ? "desc" : "asc");
    }
  };

  const renderMgrStSortIndicator = (field: string) => {
    if (mgrStSortField !== field) {
      return <span className="text-slate-300 opacity-60 mr-1 text-[10px]">↕</span>;
    }
    return mgrStSortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "مرحل":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold";
      case "قيد الترحيل":
        return "bg-blue-100 text-blue-800 border border-blue-300 font-extrabold";
      case "قيد التدقيق":
        return "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold";
      case "غير مرحل":
      default:
        return "bg-rose-100 text-rose-800 border border-rose-300 font-extrabold";
    }
  };

  const filteredStatementTxs = React.useMemo(() => {
    if (!statementData || !statementData.transactions) return [];
    let list = [...statementData.transactions];
    list.sort((a: any, b: any) => {
      const d1 = new Date(a.created_at).getTime();
      const d2 = new Date(b.created_at).getTime();
      return d1 - d2 || a.tx_id - b.tx_id;
    });
    let rBal = statementData.previousBalance || 0;
    list.forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      if (tx.tx_type === "قبض") rBal += amt;
      else rBal -= amt;
      tx.runningBal = rBal;
    });


    if (stSearchQuery.trim()) {
      const q = stSearchQuery.trim().toLowerCase();
      const cleanQ = q.replace(/,/g, "");
      list = list.filter((tx: any) => {
        const amountStr = String(tx.amount || "");
        const formattedAmountStr = formatMoney(tx.amount || 0);
        const notesStr = String(tx.notes || "").toLowerCase();
        const txIdStr = String(tx.tx_id || "");
        const voucherStr = String(tx.voucher_num || "").toLowerCase();
        const typeStr = String(tx.tx_type || "").toLowerCase();
        const statusStr = String(tx.status || "").toLowerCase();
        return (
          amountStr.includes(q) ||
          amountStr.includes(cleanQ) ||
          formattedAmountStr.includes(q) ||
          notesStr.includes(q) ||
          txIdStr.includes(q) ||
          voucherStr.includes(q) ||
          typeStr.includes(q) ||
          statusStr.includes(q)
        );
      });
    }

    if (stStatusFilter && stStatusFilter !== "all") {
      list = list.filter((tx: any) => tx.status === stStatusFilter);
    }

    list.sort((a: any, b: any) => {
      let aVal: any = a[stSortField];
      let bVal: any = b[stSortField];

      if (stSortField === "amount" || stSortField === "tx_id") {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else if (stSortField === "balance") {
        aVal = a.tx_type === "قبض" ? Number(a.amount || 0) : -Number(a.amount || 0);
        bVal = b.tx_type === "قبض" ? Number(b.amount || 0) : -Number(b.amount || 0);
      } else if (stSortField === "created_at") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (stSortField === "attachment") {
        aVal = (a.attachments && a.attachments.length > 0) || (a.receipt_url && a.receipt_url !== "لا يوجد مرفق") ? 1 : 0;
        bVal = (b.attachments && b.attachments.length > 0) || (b.receipt_url && b.receipt_url !== "لا يوجد مرفق") ? 1 : 0;
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return stSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return stSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [statementData, stSearchQuery, stStatusFilter, stSortField, stSortDir]);

  const filteredManagerStatementTxs = React.useMemo(() => {
    if (!managerStatementData) return [];
    let list = [...managerStatementData];
    list.sort((a: any, b: any) => {
      const d1 = new Date(a.created_at).getTime();
      const d2 = new Date(b.created_at).getTime();
      return d1 - d2 || a.tx_id - b.tx_id;
    });
    const currencyBals: Record<string, number> = {};
    list.forEach(tx => {
      const curr = tx.currency || "USD";
      if (!currencyBals[curr]) currencyBals[curr] = 0;
      const amt = parseFloat(tx.amount || 0);
      if (tx.tx_type === "قبض") currencyBals[curr] += amt;
      else currencyBals[curr] -= amt;
      tx.runningBal = currencyBals[curr];
    });


    if (mgrStSearchQuery.trim()) {
      const q = mgrStSearchQuery.trim().toLowerCase();
      const cleanQ = q.replace(/,/g, "");
      list = list.filter((tx: any) => {
        const amountStr = String(tx.amount || "");
        const formattedAmountStr = formatMoney(tx.amount || 0);
        const notesStr = String(tx.notes || "").toLowerCase();
        const txIdStr = String(tx.tx_id || "");
        const typeStr = String(tx.tx_type || "").toLowerCase();
        return (
          amountStr.includes(q) ||
          amountStr.includes(cleanQ) ||
          formattedAmountStr.includes(q) ||
          notesStr.includes(q) ||
          txIdStr.includes(q) ||
          typeStr.includes(q)
        );
      });
    }

    list.sort((a: any, b: any) => {
      let aVal: any = a[mgrStSortField];
      let bVal: any = b[mgrStSortField];

      if (mgrStSortField === "amount" || mgrStSortField === "tx_id") {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else if (mgrStSortField === "balance") {
        aVal = a.tx_type === "قبض" ? Number(a.amount || 0) : -Number(a.amount || 0);
        bVal = b.tx_type === "قبض" ? Number(b.amount || 0) : -Number(b.amount || 0);
      } else if (mgrStSortField === "created_at") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return mgrStSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return mgrStSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [managerStatementData, mgrStSearchQuery, mgrStSortField, mgrStSortDir]);

  const [submitting, setSubmitting] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Fetch client details, white label info & balances
  const loadPortalData = async () => {
    if (!targetClientId) {
      setErrorMsg("رابط البوابة غير مكتمل أو كود التاجر غير صحيح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const isToken = targetClientId && targetClientId.length > 20;
      if (isToken) setPortalToken(targetClientId);
      else setPortalToken(null);
      const res = await fetch(`/api/clients/details-form?${isToken ? "token" : "clientId"}=${targetClientId}`);
      const data = await res.json();
      if (data.success) {
        setClientData(data.client);
        setBalances(data.balances);
        setManager(data.manager);
        setMonthlyTxCount(data.monthly_tx_count || 0);
      } else {
        setErrorMsg(data.message || "فشل تحميل بيانات البوابة المحاسبية.");
      }
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [targetClientId]);

  // Convert files helper to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const triggerAlert = (type: "success" | "error", msg: string) => {
    if (type === "success") toast.success(msg);
    else toast.error(msg);
  };

  // Submit single entry
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;
    const options = {
      maxSizeMB: 0.25,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: "image/webp"
    };
    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Compression failed:", error);
      return file; // Fallback to original
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!singleAmt || isNaN(Number(singleAmt)) || parseFloat(singleAmt) <= 0) {
      triggerAlert("error", "يرجى إدخال مبلغ صحيح.");
      return;
    }

    setSubmitting(true);
    try {
      let fileData = "";
      let fileName = "";
      let mimeType = "";

      if (singleFile) {
        const finalFile = await compressImage(singleFile);
        fileData = await toBase64(finalFile);
        fileName = singleFile.name;
        mimeType = singleFile.type;
      }

      const res = await fetch("/api/transactions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientInfo ? clientInfo.client_id : targetClientId,
          publicToken: portalToken,
          txType: singleType,
          currency: singleCur,
          amount: parseFloat(singleAmt),
          notes: singleNotes,
          fileData,
          fileName,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم تسجيل الحركة بنجاح وتوثيقها!");
        setSingleAmt("");
        setSingleNotes("");
        setSingleFile(null);
        loadPortalData(); // Reload balances
      } else {
        triggerAlert("error", data.message || "حدث خطأ أثناء معالجة الطلب.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الاتصال بالشبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit currency exchange
  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exInCur === exOutCur) {
      triggerAlert("error", "لا يمكن تصريف نفس العملة.");
      return;
    }
    if (!exInAmt || isNaN(Number(exInAmt)) || parseFloat(exInAmt) <= 0 || !exOutAmt || isNaN(Number(exOutAmt)) || parseFloat(exOutAmt) <= 0) {
      triggerAlert("error", "يرجى التحقق من المبالغ المدخلة.");
      return;
    }

    setSubmitting(true);
    try {
      let fileData = "";
      let fileName = "";
      let mimeType = "";

      if (exFile) {
        const finalFile = await compressImage(exFile);
        fileData = await toBase64(finalFile);
        fileName = exFile.name;
        mimeType = exFile.type;
      }

      const txArray = [
        { type: "قبض", currency: exInCur, amount: parseFloat(exInAmt) },
        { type: "صرف", currency: exOutCur, amount: parseFloat(exOutAmt) }
      ];

      const res = await fetch("/api/transactions/save-complex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientInfo ? clientInfo.client_id : targetClientId,
          publicToken: portalToken,
          txArray,
          notes: exNotes || `تبديل عملة: قبض ${exInAmt} ${exInCur} مقابل صرف ${exOutAmt} ${exOutCur}`,
          fileData,
          fileName,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم تسجيل عملية الصرافة بنجاح!");
        setExInAmt("");
        setExOutAmt("");
        setExNotes("");
        setExFile(null);
        loadPortalData();
      } else {
        triggerAlert("error", data.message || "فشلت العملية.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ شبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Complex / Multi-row voucher
  const handleComplexSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = complexRows.filter(r => r.amount && !isNaN(Number(r.amount)) && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      triggerAlert("error", "يرجى ملء تفاصيل حركة واحدة على الأقل بمبلغ صحيح.");
      return;
    }

    setSubmitting(true);
    try {
      let fileData = "";
      let fileName = "";
      let mimeType = "";

      if (complexFile) {
        fileData = await toBase64(complexFile);
        fileName = complexFile.name;
        mimeType = complexFile.type;
      }

      const txArray = validRows.map(r => ({
        type: r.type,
        currency: r.currency,
        amount: parseFloat(r.amount)
      }));

      const res = await fetch("/api/transactions/save-complex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientInfo ? clientInfo.client_id : targetClientId,
          publicToken: portalToken,
          txArray,
          notes: complexNotes,
          fileData,
          fileName,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم تسجيل الفاتورة المركبة بنجاح!");
        setComplexRows([
          { type: "قبض", currency: "دولار أمريكي", amount: "" },
          { type: "صرف", currency: "ليرة سورية", amount: "" }
        ]);
        setComplexNotes("");
        setComplexFile(null);
        loadPortalData();
      } else {
        triggerAlert("error", data.message || "حدث خطأ.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ شبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Statement Ledger
  
  const openAttachment = (fileData: string, fileName: string) => {
    if (fileData.startsWith("data:application/pdf")) {
      const newTab = window.open();
      if (newTab) {
        const doc = newTab.document;
        doc.title = fileName || "Attachment";
        const iframe = doc.createElement("iframe");
        iframe.src = fileData;
        iframe.frameBorder = "0";
        iframe.style.cssText = "border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:absolute;";
        iframe.allowFullscreen = true;
        doc.body.appendChild(iframe);
      }
    } else if (fileData.startsWith("data:image")) {
      const newTab = window.open();
      if (newTab) {
        const doc = newTab.document;
        doc.title = fileName || "Attachment";
        doc.body.style.margin = "0";
        doc.body.style.display = "flex";
        doc.body.style.justifyContent = "center";
        doc.body.style.alignItems = "center";
        doc.body.style.backgroundColor = "#0f172a";
        const img = doc.createElement("img");
        img.src = fileData;
        img.alt = fileName || "Attachment";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        doc.body.appendChild(img);
      }
    } else {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = fileName || "attachment";
      a.click();
    }
  };

  const handleFetchStatement = async () => {
    setStatementLoading(true);
    try {
      const res = await fetch("/api/transactions/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: { userId: targetClientId, role: "client" },
          publicToken: portalToken,
          clientId: clientInfo ? clientInfo.client_id : targetClientId,
          currency: stCurrency,
          startDate: stStart || null,
          endDate: stEnd || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatementData(data);
      } else {
        triggerAlert("error", data.message || "فشل تحميل كشف الحساب.");
      }
    } catch (err) {
      triggerAlert("error", "فشل تحميل كشف الحساب.");
    } finally {
      setStatementLoading(false);
    }
  };

  const handleFetchManagerStatement = async () => {
    setManagerStatementLoading(true);
    try {
      const res = await fetch("/api/transactions/manager-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: { userId: targetClientId, role: "client" },
          publicToken: portalToken,
          clientId: clientInfo ? clientInfo.client_id : targetClientId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setManagerStatementData(data.data || []);
      } else {
        triggerAlert("error", data.message || "فشل تحميل كشف حساب الإدارة.");
      }
    } catch (err) {
      triggerAlert("error", "فشل تحميل كشف حساب الإدارة.");
    } finally {
      setManagerStatementLoading(false);
    }
  };

  // Free Tier limitations evaluation
  const isFreeLimitReached = clientInfo?.is_free_tier && monthlyTxCount >= 50;
  const isStorageFull = clientInfo && clientInfo.usedStorage >= clientInfo.storageLimit;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 text-sm font-semibold">جاري تحميل البوابة المالية المحاسبية...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border border-red-100">
          <div className="bg-red-50 text-red-600 h-16 w-16 flex items-center justify-center rounded-full mx-auto mb-6 text-2xl font-bold">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">تعذر الدخول للمنظومة</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{errorMsg}</p>
          <button 
            type="button" 
            onClick={onLogout}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm w-full"
          >
            الرجوع لشاشة الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-12" dir="rtl" id="clientPortalUI">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Main Header Block */}
        <div className="relative bg-black text-white border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden h-[146px]">
          {/* Mobile Center: AccuFlow.Cloud */}
          <div className="lg:hidden text-3xl font-black text-slate-50 tracking-tight font-mono w-full text-center mb-2 z-10">
            AccuFlow.Cloud
          </div>

          {/* Right Side: Company Name */}
          <div className="space-y-2 text-center lg:text-right flex-1 relative z-10">
            <h1 className="text-[24.5px] text-center pr-[11px] mt-[8px] font-extrabold text-slate-300 flex items-center justify-center gap-2">
              <Building className="w-5 h-5 text-slate-400" />
              {clientInfo?.company_name}
            </h1>
            {clientInfo && (
              <p className={`text-xs text-center pr-[11px] font-bold ${isStorageFull ? "text-red-400" : "text-slate-400"}`}>
                {isStorageFull 
                  ? "مساحة التخزين ممتلئة" 
                  : `لقد استهلكت ${clientInfo.usedStorage?.toFixed(2) || 0} MB من أصل ${clientInfo.storageLimit || 0} MB`}
              </p>
            )}
          </div>
          
          {/* Desktop Center: AccuFlow.Cloud */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-black text-slate-50 tracking-tight font-mono z-10 whitespace-nowrap -mt-[51px]">
            AccuFlow.Cloud
          </div>
          
          {/* Left Side: Manager Info */}
          {manager && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 relative z-10 -ml-[20px] mt-[35px]">
              <div className="text-center sm:text-right space-y-0.5">
                <span className="text-[13px] text-blue-400 font-bold uppercase tracking-wider block">مكتب التدقيق المحاسبي المالي المباشر</span>
                <h2 className="text-sm font-bold text-slate-100 w-[200px] h-[30px] text-center">{manager.full_name}</h2>
                {manager.bio && <p className="text-slate-400 text-[10px]">{manager.bio}</p>}
              </div>
              {manager.phone && (
                <a 
                  href={`tel:${manager.phone}`}
                  className="flex-shrink-0 flex items-center gap-2 bg-zinc-800 text-blue-400 border border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-zinc-700 transition-all"
                >
                  <PhoneCall className="w-4 h-4" />
                  للاستفسار: {manager.phone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Free Tier Quota Alert Banner */}
        {clientInfo?.is_free_tier && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isFreeLimitReached ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isFreeLimitReached ? "text-red-500" : "text-emerald-500"}`} />
            <div className="space-y-1">
              <h4 className="text-sm font-bold">باقة التجربة المجانية (Freemium-light)</h4>
              <p className="text-xs opacity-90">
                {isFreeLimitReached 
                  ? "لقد استهلكت حدك المجاني الأقصى لهذا الشهر (50/50 حركة). تم تعليق الإدخال تلقائياً، يرجى الاتصال بمحاسبك المباشر لترقية خطتك."
                  : `أنت حالياً على الخطة المجانية التجريبية. الحركات المستهلكة هذا الشهر: (${monthlyTxCount} / 50 حركة). المتبقي لديك: ${50 - monthlyTxCount} حركة.`}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Balance Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="balancesContainer">
          {/* SYP Balance */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <span className="text-xs text-slate-400 font-bold block mb-1">الصندوق (SYP)</span>
            <span className={`text-2xl font-extrabold font-mono tracking-tight block ${balances.SYP < 0 ? "text-red-500" : "text-emerald-500"}`}>
              {formatMoney(balances.SYP)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">ليرة سورية</span>
          </div>

          {/* USD Balance */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <span className="text-xs text-slate-400 font-bold block mb-1">الصندوق (USD)</span>
            <span className={`text-2xl font-extrabold font-mono tracking-tight block ${balances.USD < 0 ? "text-red-500" : "text-emerald-500"}`}>
              {formatMoney(balances.USD)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">دولار أمريكي</span>
          </div>

          {/* EUR Balance */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-slate-200">
            <span className="text-xs text-slate-400 font-bold block mb-1">الصندوق (EUR)</span>
            <span className={`text-2xl font-extrabold font-mono tracking-tight block ${balances.EUR < 0 ? "text-red-500" : "text-emerald-500"}`}>
              {formatMoney(balances.EUR)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">يورو أوروبي</span>
          </div>
        </div>

        {/* Alerts Center */}
        {/* Multi-Tab Workspace Controls */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 overflow-x-auto whitespace-nowrap scrollbar-none items-center">
            <button
              type="button"
              className={`flex-1 flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-200 ${activeTab === "single" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => setActiveTab("single")}
            >
              <TrendingUp className="w-4 h-4 text-blue-500" />
              حركة مفردة
            </button>
            <button
              type="button"
              className={`flex-1 flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-200 ${activeTab === "exchange" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => setActiveTab("exchange")}
            >
              <RotateCw className="w-4 h-4 text-indigo-500" />
              صرافة عملات
            </button>
            <button
              type="button"
              className={`flex-1 flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-200 ${activeTab === "complex" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => setActiveTab("complex")}
            >
              <Layers className="w-4 h-4 text-amber-500" />
              فاتورة مركبة
            </button>
            <button
              type="button"
              className={`flex-1 flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-200 ${activeTab === "statement" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => {
                setActiveTab("statement");
                if (!statementData) handleFetchStatement();
              }}
            >
              <ClipboardList className="w-4 h-4 text-teal-500" />
              كشف حساب
            </button>
            <button
              type="button"
              className={`flex-1 flex-shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold rounded-xl transition-all duration-200 ${activeTab === "manager_statement" ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => {
                setActiveTab("manager_statement");
                if (!managerStatementData) handleFetchManagerStatement();
              }}
            >
              <ClipboardList className="w-4 h-4 text-amber-500" />
              كشف الاشتراكات
            </button>
          </div>

          <div className="p-6">
            
            {/* 1. Tab Single Transaction */}
            {activeTab === "single" && (
              <form onSubmit={handleSingleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">نوع الحركة المحاسبية</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={isFreeLimitReached || isStorageFull}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${singleType === "قبض" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setSingleType("قبض")}
                      >
                        <Plus className="w-4 h-4" />
                        قبض (+)
                      </button>
                      <button
                        type="button"
                        disabled={isFreeLimitReached || isStorageFull}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${singleType === "صرف" ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        onClick={() => setSingleType("صرف")}
                      >
                        <Minus className="w-4 h-4" />
                        صرف (-)
                      </button>
                    </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">العملة</label>
                    <select
                      value={singleCur}
                      disabled={isFreeLimitReached || isStorageFull}
                      onChange={(e) => setSingleCur(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ليرة سورية">ليرة سورية</option>
                      <option value="دولار أمريكي">دولار أمريكي</option>
                      <option value="يورو">يورو أوروبي</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Amount Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">المبلغ المالي</label>
                    <input
                      type="text"
                      required
                      placeholder="0.00"
                      disabled={isFreeLimitReached || isStorageFull}
                      value={singleAmt}
                      onChange={(e) => setSingleAmt(e.target.value.replace(/[^\d.]/g, ""))}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* File Attachment */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">إرفاق صورة المستند / الإيصال</label>
                    <div className="relative border border-dashed border-slate-300 bg-slate-50/50 p-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 truncate font-semibold">
                        {singleFile ? singleFile.name : "اسحب أو اختر ملف (صور، PDF، Word، Excel)"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={isFreeLimitReached || isStorageFull}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSingleFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block">البيان / تفاصيل الملاحظات</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="مثال: دفعة مالية من الزبون فلان..."
                    disabled={isFreeLimitReached || isStorageFull}
                    value={singleNotes}
                    onChange={(e) => setSingleNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || isFreeLimitReached}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? "جاري معالجة ورفع الحركة ماليّاً..." : "تسجيل الحركة المالية"}
                </button>
              </form>
            )}

            {/* 2. Tab Currency Exchange */}
            {activeTab === "exchange" && (
              <form onSubmit={handleExchangeSubmit} className="space-y-5">
                <div className="bg-blue-50/50 text-blue-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <span>💡</span>
                  <span>لتسجيل عمليات تبادل النقد (مثال: استلمت دولار وسددت ليرة سورية بسعر صرف متفق عليه).</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Exchange IN */}
                  <div className="p-4 border border-emerald-100 bg-emerald-50/20 rounded-2xl space-y-4">
                    <span className="text-xs text-emerald-600 font-bold block">1. القيمة المستلمة (قبض +)</span>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold block">العملة المستلمة</label>
                      <select
                        value={exInCur}
                        disabled={isFreeLimitReached || isStorageFull}
                        onChange={(e) => setExInCur(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ليرة سورية">ليرة سورية</option>
                        <option value="دولار أمريكي">دولار أمريكي</option>
                        <option value="يورو">يورو أوروبي</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold block">المبلغ المستلم</label>
                      <input
                        type="text"
                        required
                        placeholder="0.00"
                        disabled={isFreeLimitReached || isStorageFull}
                        value={exInAmt}
                        onChange={(e) => setExInAmt(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Exchange OUT */}
                  <div className="p-4 border border-red-100 bg-red-50/10 rounded-2xl space-y-4">
                    <span className="text-xs text-red-500 font-bold block">2. القيمة المدفوعة مقابلها (صرف -)</span>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold block">العملة المدفوعة</label>
                      <select
                        value={exOutCur}
                        disabled={isFreeLimitReached || isStorageFull}
                        onChange={(e) => setExOutCur(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="ليرة سورية">ليرة سورية</option>
                        <option value="دولار أمريكي">دولار أمريكي</option>
                        <option value="يورو">يورو أوروبي</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold block">المبلغ المدفوع</label>
                      <input
                        type="text"
                        required
                        placeholder="0.00"
                        disabled={isFreeLimitReached || isStorageFull}
                        value={exOutAmt}
                        onChange={(e) => setExOutAmt(e.target.value.replace(/[^\d.]/g, ""))}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">تفاصيل الصرافة والبيان</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تصريف 100$ بسعر صرف 14,500..."
                      disabled={isFreeLimitReached || isStorageFull}
                      value={exNotes}
                      onChange={(e) => setExNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">المرفق</label>
                    <div className="relative border border-dashed border-slate-300 bg-slate-50/50 p-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 truncate font-semibold">
                        {exFile ? exFile.name : "إرفاق مستند للإيصال"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={isFreeLimitReached || isStorageFull}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setExFile(e.target.files[0]);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || isFreeLimitReached}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ والترحيل..." : "تسجيل عملية الصرافة"}
                </button>
              </form>
            )}

            {/* 3. Tab Complex Transactions */}
            {activeTab === "complex" && (
              <form onSubmit={handleComplexSubmit} className="space-y-5">
                <div className="bg-emerald-50/50 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
                  <span>💡</span>
                  <span>تسجيل الفواتير المركبة أو الدفعات المتعددة بعملات مختلفة في آن واحد.</span>
                </div>

                <div className="space-y-4">
                  {complexRows.map((row, idx) => (
                    <div key={idx} className="p-4 border border-slate-100 bg-slate-50/30 rounded-2xl flex flex-col md:flex-row items-center gap-4 relative">
                      <div className="w-full md:w-1/4 space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">الدفعة {idx + 1}</label>
                        <select
                          value={row.type}
                          disabled={isFreeLimitReached || isStorageFull}
                          onChange={(e) => {
                            const newRows = [...complexRows];
                            newRows[idx].type = e.target.value as any;
                            setComplexRows(newRows);
                          }}
                          className="w-full bg-white border border-slate-200 p-2 rounded-xl text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="قبض">قبض (+)</option>
                          <option value="صرف">صرف (-)</option>
                        </select>
                      </div>

                      <div className="w-full md:w-1/3 space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">العملة</label>
                        <select
                          value={row.currency}
                          disabled={isFreeLimitReached || isStorageFull}
                          onChange={(e) => {
                            const newRows = [...complexRows];
                            newRows[idx].currency = e.target.value;
                            setComplexRows(newRows);
                          }}
                          className="w-full bg-white border border-slate-200 p-2 rounded-xl text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="ليرة سورية">ليرة سورية</option>
                          <option value="دولار أمريكي">دولار أمريكي</option>
                          <option value="يورو">يورو أوروبي</option>
                        </select>
                      </div>

                      <div className="w-full md:w-1/3 space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold block">المبلغ</label>
                        <input
                          type="text"
                          placeholder="0.00"
                          disabled={isFreeLimitReached || isStorageFull}
                          value={row.amount}
                          onChange={(e) => {
                            const newRows = [...complexRows];
                            newRows[idx].amount = e.target.value.replace(/[^\d.]/g, "");
                            setComplexRows(newRows);
                          }}
                          className="w-full bg-white border border-slate-200 p-2 rounded-xl text-slate-800 text-xs focus:outline-none font-mono"
                        />
                      </div>

                      {complexRows.length > 1 && (
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 font-bold text-xs mt-4 md:mt-0"
                          onClick={() => setComplexRows(complexRows.filter((_, i) => i !== idx))}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={isFreeLimitReached || isStorageFull}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                    onClick={() => setComplexRows([...complexRows, { type: "قبض", currency: "دولار أمريكي", amount: "" }])}
                  >
                    + إضافة دفعة مكملة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">البيان الإجمالي</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="مثال: سداد فاتورة جزء بالدولار وجزء بالليرة السورية..."
                      disabled={isFreeLimitReached || isStorageFull}
                      value={complexNotes}
                      onChange={(e) => setComplexNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">إرفاق إيصال الدفعة</label>
                    <div className="relative border border-dashed border-slate-300 bg-slate-50/50 p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500 truncate font-semibold">
                        {complexFile ? complexFile.name : "رفع مستند الإثبات للفاتورة"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        disabled={isFreeLimitReached || isStorageFull}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setComplexFile(e.target.files[0]);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || isFreeLimitReached}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? "جاري ترحيل الفاتورة..." : "تسجيل الفاتورة المركبة"}
                </button>
              </form>
            )}

            {/* 5. Tab Manager Statement */}
            {activeTab === "manager_statement" && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">كشف حساب الاشتراكات (الإدارة)</h3>
                    <p className="text-xs text-slate-500">يعرض الحركات المالية بين المنشأة والمدير (دفعات الاشتراكات وغيرها).</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {managerStatementData && managerStatementData.length > 0 && (
                      <ExportButton
                        title="كشف حساب الاشتراكات مع الإدارة"
                        filename="كشف_حساب_الاشتراكات"
                        columns={[
                          { header: "تاريخ الحركة", key: "created_at", formatter: (val) => formatDate(val) },
                          { header: "رقم السند", key: "tx_id" },
                          { header: "نوع الحركة", key: "tx_type" },
                          { header: "المبلغ", key: "amount" },
                          { header: "العملة", key: "currency" },
                          { header: "البيان", key: "notes" },
                        ]}
                        data={managerStatementData}
                        elementId="merchantManagerSubStatementContainer"
                      />
                    )}
                    <button
                      type="button"
                      disabled={managerStatementLoading}
                      onClick={handleFetchManagerStatement}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {managerStatementLoading ? "جاري التحميل..." : "تحديث الكشف"}
                    </button>
                  </div>
                </div>
                
                {managerStatementData && (
                  <div className="space-y-3">
                    {/* Search Field Toolbar for Manager Statement */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={mgrStSearchQuery}
                          onChange={(e) => setMgrStSearchQuery(e.target.value)}
                          placeholder="ابحث حسب المبلغ، البيان، أو رقم السند..."
                          className="w-full pr-9 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {mgrStSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMgrStSearchQuery("")}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="merchantManagerSubStatementContainer">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 text-[11px] text-slate-500 font-extrabold border-b border-slate-100 select-none">
                              <th 
                                onClick={() => handleMgrStSort("created_at")} 
                                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center gap-1">
                                  <span>تاريخ الحركة</span>
                                  {renderMgrStSortIndicator("created_at")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleMgrStSort("tx_id")} 
                                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center gap-1">
                                  <span>رقم السند</span>
                                  {renderMgrStSortIndicator("tx_id")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleMgrStSort("tx_type")} 
                                className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>نوع الحركة</span>
                                  {renderMgrStSortIndicator("tx_type")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleMgrStSort("amount")} 
                                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center gap-1">
                                  <span>المبلغ</span>
                                  {renderMgrStSortIndicator("amount")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleMgrStSort("balance")} 
                                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center gap-1">
                                  <span>الرصيد التراكمي</span>
                                  {renderMgrStSortIndicator("balance")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleMgrStSort("notes")} 
                                className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                title="انقر للفرز"
                              >
                                <div className="flex items-center gap-1">
                                  <span>البيان</span>
                                  {renderMgrStSortIndicator("notes")}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredManagerStatementTxs.length > 0 ? (
                              (() => {
                                return filteredManagerStatementTxs.map((tx: any, idx: number) => {
                                  const isPositive = tx.tx_type === "قبض";
                                  const currentBal = tx.runningBal || 0;
                                  return (
                                    <tr key={tx.tx_id || idx} className="hover:bg-slate-50/50">
                                      <td className="p-3 text-slate-400 font-mono text-xs">{formatDate(tx.created_at)}</td>
                                      <td className="p-3 font-mono text-slate-500 text-xs">#{tx.tx_id}</td>
                                      <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                          {isPositive ? "📥 دفع اشتراك" : "📤 خصم"}
                                        </span>
                                      </td>
                                      <td className={`p-3 font-bold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                        {isPositive ? "+" : "-"}{formatMoney(tx.amount)} {tx.currency}
                                      </td>
                                      <td className="p-3 font-bold font-mono text-blue-600 text-xs" dir="ltr">
                                        {formatMoney(currentBal)} {tx.currency}
                                      </td>
                                      <td className="p-3 font-medium text-slate-700 text-xs">{tx.notes}</td>
                                    </tr>
                                  );
                                });
                              })()
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                                  لا توجد حركات اشتراكات مسجلة.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Tab Statement of Account (كشف حساب) */}
            {activeTab === "statement" && (
              <div className="space-y-6">
                
                {/* Statement Date Filters */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-bold text-slate-500 block">العملة المطلوبة</label>
                    <select
                      value={stCurrency}
                      onChange={(e) => setStCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-xs focus:outline-none"
                    >
                      <option value="ليرة سورية">ليرة سورية</option>
                      <option value="دولار أمريكي">دولار أمريكي</option>
                      <option value="يورو">يورو أوروبي</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-bold text-slate-500 block">تاريخ البدء (اختياري)</label>
                    <input
                      type="date"
                      value={stStart}
                      onChange={(e) => setStStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-xs font-bold text-slate-500 block">تاريخ الانتهاء (اختياري)</label>
                    <input
                      type="date"
                      value={stEnd}
                      onChange={(e) => setStEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={statementLoading}
                    onClick={handleFetchStatement}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm col-span-1"
                  >
                    {statementLoading ? "جاري التحميل..." : "عرض كشف الحساب"}
                  </button>
                </div>

                {/* Statements Table Result */}
                {statementLoading ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-800 mx-auto"></div>
                    <p className="text-xs text-slate-400 font-semibold">جاري سحب كشف الحساب من السيرفر...</p>
                  </div>
                ) : statementData ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        نتيجة كشف الحساب بالعملة ({stCurrency})
                      </span>
                      <ExportButton
                        title={`كشف حساب المالي - ${stCurrency}`}
                        filename={`كشف_حساب_${stCurrency}`}
                        columns={[
                          { header: "رقم السند", key: "tx_id" },
                          { header: "التاريخ والوقت", key: "created_at", formatter: (val) => val && val !== "-" ? formatDateTime(val) : "-" },
                          { header: "نوع الحركة", key: "tx_type" },
                          { header: "المبلغ", key: "amount", formatter: (val) => formatMoney(val) },
                          { header: "البيان", key: "notes" },
                          { header: "رقم القيد", key: "voucher_num" },
                          { header: "الحالة", key: "status" },
                        ]}
                        data={[
                          { tx_id: "-", created_at: "-", tx_type: "رصيد سابق", amount: statementData.previousBalance, notes: "الرصيد الافتتاحي الافتراضي للفترة المحددة", voucher_num: "-", status: "مرحل" },
                          ...filteredStatementTxs
                        ]}
                        elementId="merchantStatementTableCard"
                        buttonText="تصدير (إكسل)"
                      />
                    </div>

                    {/* Search Field & Status Filter Toolbar */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={stSearchQuery}
                          onChange={(e) => setStSearchQuery(e.target.value)}
                          placeholder="ابحث حسب المبلغ، البيان، رقم السند، أو رقم القيد..."
                          className="w-full pr-9 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {stSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setStSearchQuery("")}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-500">الحالة:</span>
                        <select
                          value={stStatusFilter}
                          onChange={(e) => setStStatusFilter(e.target.value)}
                          className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                          <option value="all">جميع الحالات ({statementData.transactions?.length || 0})</option>
                          <option value="مرحل">✅ مرحل</option>
                          <option value="قيد الترحيل">🔄 قيد الترحيل</option>
                          <option value="قيد التدقيق">🔍 قيد التدقيق</option>
                          <option value="غير مرحل">❌ غير مرحل</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white" id="merchantStatementTableCard">
                      <table className="w-full text-right border-collapse min-w-[850px]" id="stTable">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-100 font-extrabold select-none">
                          <th 
                            onClick={() => handleStSort("created_at")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>التاريخ والوقت</span>
                              {renderStSortIndicator("created_at")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("tx_type")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>النوع</span>
                              {renderStSortIndicator("tx_type")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("amount")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز حسب المبلغ"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>مقبوضات (+)</span>
                              {renderStSortIndicator("amount")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("amount")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز حسب المبلغ"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>مدفوعات (-)</span>
                              {renderStSortIndicator("amount")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("balance")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز حسب الرصيد التراكمي"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>الرصيد التراكمي</span>
                              {renderStSortIndicator("balance")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("notes")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز حسب البيان"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>البيان</span>
                              {renderStSortIndicator("notes")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("tx_id")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            title="انقر للفرز"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>رقم السند والقيد</span>
                              {renderStSortIndicator("tx_id")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("status")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap min-w-[130px]"
                            title="انقر للفرز حسب حالة السند"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>حالة السند</span>
                              {renderStSortIndicator("status")}
                            </div>
                          </th>

                          <th 
                            onClick={() => handleStSort("attachment")}
                            className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap min-w-[130px]"
                            title="انقر للفرز حسب وجود المرفق"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>المرفق</span>
                              {renderStSortIndicator("attachment")}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-700 divide-y divide-slate-100" id="stTableBody">
                        
                        {/* Opening Balance Row */}
                        <tr className="bg-slate-50/50 font-bold">
                          <td className="p-3.5 text-center text-slate-400">-</td>
                          <td className="p-3.5 text-center text-blue-600">رصيد سابق</td>
                          <td className="p-3.5 text-center">-</td>
                          <td className="p-3.5 text-center">-</td>
                          <td className="p-3.5 text-center font-mono text-blue-600 font-bold" dir="ltr">
                            {formatMoney(statementData.previousBalance)}
                          </td>
                          <td className="p-3.5 text-slate-400 text-center">الرصيد الافتتاحي الافتراضي للفترة المحددة</td>
                          <td className="p-3.5 text-slate-400 text-center">-</td>
                          <td className="p-3.5 text-center whitespace-nowrap min-w-[130px]">
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block whitespace-nowrap">
                              ✅ مرحل
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 text-center whitespace-nowrap min-w-[130px]">-</td>
                        </tr>

                        {/* Transaction Rows */}
                        {filteredStatementTxs.length > 0 ? (
                          (() => {
                            return filteredStatementTxs.map((tx: any) => {
                              const currentBal = tx.runningBal || 0;
                              const amt = parseFloat(tx.amount || 0);

                              const statusVal = tx.status || "غير مرحل";

                              return (
                                <tr key={tx.tx_id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3.5 text-center font-mono text-[10px] text-slate-500">
                                    {tx.created_at ? formatDateTime(tx.created_at) : "-"}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${tx.tx_type === "قبض" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                                      {tx.tx_type}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center font-mono text-emerald-600 font-bold" dir="ltr">
                                    {tx.tx_type === "قبض" ? formatMoney(amt) : "-"}
                                  </td>
                                  <td className="p-3.5 text-center font-mono text-red-500 font-bold" dir="ltr">
                                    {tx.tx_type === "صرف" ? formatMoney(amt) : "-"}
                                  </td>
                                  <td className={`p-3.5 text-center font-mono font-bold ${currentBal < 0 ? "text-red-500" : "text-emerald-500"}`} dir="ltr">
                                    {formatMoney(currentBal)}
                                  </td>
                                  <td className="p-3.5 font-medium max-w-xs truncate">{tx.notes || "-"}</td>
                                  <td className="p-3.5 text-center font-mono text-slate-500 font-bold">
                                    <div>#{tx.tx_id}</div>
                                    {tx.voucher_num && (
                                      <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                        قيد: {tx.voucher_num}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Color-Coded Status Badge */}
                                  <td className="p-3.5 text-center whitespace-nowrap min-w-[130px]">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold inline-block whitespace-nowrap ${getStatusBadgeStyle(statusVal)}`}>
                                      {statusVal === "مرحل" && "✅ مرحل"}
                                      {statusVal === "قيد الترحيل" && "🔄 قيد الترحيل"}
                                      {statusVal === "قيد التدقيق" && "🔍 قيد التدقيق"}
                                      {statusVal === "غير مرحل" && "❌ غير مرحل"}
                                    </span>
                                  </td>

                                  <td className="p-3.5 text-center whitespace-nowrap min-w-[130px]">
                                    {tx.attachments && tx.attachments.length > 0 ? (
                                      <button
                                        onClick={() => setViewAttachments({ open: true, list: tx.attachments, title: `مرفقات السند #${tx.tx_id}` })}
                                        className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all shadow-2xs cursor-pointer"
                                        title={`عدد المرفقات: ${tx.attachments.length}`}
                                      >
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span>استعراض المرفقات</span>
                                      </button>
                                    ) : tx.receipt_url && tx.receipt_url !== "لا يوجد مرفق" ? (
                                      <button
                                        onClick={() => setViewAttachments({ open: true, list: [{ file_data: tx.receipt_url, file_name: "وصل تسليم/مرفق" }], title: `مرفقات السند #${tx.tx_id}` })}
                                        className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all shadow-2xs cursor-pointer"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span>استعراض المرفق</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-slate-300 font-semibold">لا يوجد</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        ) : (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-xs text-slate-400 font-bold">
                              لا توجد حركات مسجلة تندرج ضمن هذه الفترة المحددة أو معايير البحث بالعملة المحددة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200">
                    انقر على زر "عرض كشف الحساب" لتحميل كشف كشوفات العملة المحددة.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Attachments Preview Modal */}
      {viewAttachments.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {viewAttachments.title || "المرفقات"}
              </h3>
              <button
                type="button"
                onClick={() => setViewAttachments({ open: false, list: [] })}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {viewAttachments.list && viewAttachments.list.length > 0 ? (
                viewAttachments.list.map((att: any, index: number) => {
                  const fileData = att.file_data || att.file_url || att.url || att;
                  const fileName = att.file_name || `مرفق ${index + 1}`;
                  const isPdf = typeof fileData === "string" && (fileData.startsWith("data:application/pdf") || fileName.toLowerCase().endsWith(".pdf"));
                  const isImg = typeof fileData === "string" && (fileData.startsWith("data:image") || fileData.includes(".png") || fileData.includes(".jpg") || fileData.includes(".jpeg") || fileData.includes(".webp"));

                  return (
                    <div key={index} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 truncate dir-ltr">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => openAttachment(fileData, fileName)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تنزيل / فتح النافذة</span>
                        </button>
                      </div>
                      {isImg && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 text-center">
                          <img src={fileData} alt={fileName} className="max-h-96 mx-auto object-contain rounded-lg" />
                        </div>
                      )}
                      {isPdf && (
                        <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
                          <iframe src={fileData} className="w-full h-full" title={fileName} />
                        </div>
                      )}
                      {!isImg && !isPdf && (
                        <div className="p-4 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                          يمكنك النقر على زر فتح لعرض هذا المرفق.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-bold">
                  لا توجد ملفات للعرض.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

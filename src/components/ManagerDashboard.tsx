import PackagesTab from "./PackagesTab";
import SettingsTab from "./SettingsTab";
import { ExportButton } from "./ExportButton";
import React, { useState, useEffect } from "react";
import { DownloadCloud,
  Package, 
  Building, 
  User, 
  Wallet, 
  UserCheck, 
  Sliders, 
  ShieldAlert, 
  Activity, 
  Users, 
  Plus, 
  DollarSign, 
  Eye, 
  FileText, 
  Lock, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertOctagon, 
  Calendar, 
  Search,
  ExternalLink,
  BookOpen,
  LogOut,
  RefreshCw,
  Facebook,
  Instagram,
  Linkedin,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  PieChart,
  Server,
  Database,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Send,
  Phone,
  X,
  Settings,
  Check,
  ArrowLeftRight,
  Image, ClipboardList , MessageSquare, Clock} from "lucide-react";
import { AuthState, ClientMerchant, Accountant, ManagerAdmin, Transaction } from "../types";
import { toast } from "react-hot-toast";

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange?: () => void, disabled?: boolean }) => {  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-5 w-10 shrink-0 ${onChange && !disabled ? 'cursor-pointer' : 'cursor-default'} rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-red-500'} ${disabled ? 'opacity-60' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <span className="text-[15px] font-bold min-w-8 text-right font-sans">
        {checked ? "نشط" : "معطل"}
      </span>
    </div>
  );
};

const formatNumberWithCommas = (val: string | number): string => {
  if (val === undefined || val === null) return '';
  let clean = val.toString().replace(/[^\d.]/g, '');
  let parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};
const parseCommasToNumberString = (val: string): string => {
  if (val === undefined || val === null) return "";
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  let converted = String(val);
  for (let i = 0; i < 10; i++) {
    converted = converted.split(arabicNumbers[i]).join(i.toString());
    converted = converted.split(persianNumbers[i]).join(i.toString());
  }
  return converted.replace(/,/g, "");
};

interface ManagerDashboardProps {
  auth: AuthState;
  onLogout: () => void;
}

export default function ManagerDashboard({ auth, onLogout }: ManagerDashboardProps) {
  const [effectiveAuth, setEffectiveAuth] = useState<AuthState>(auth);
  const [coopProfile, setCoopProfile] = useState<any>(null);
  const [coopProfiles, setCoopProfiles] = useState<any[]>([]);
  const [coopDropdownOpen, setCoopDropdownOpen] = useState(false);

  const isSuperAdmin = effectiveAuth.isSuperAdmin;

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>("clients");

  // Core loaded dataset states
  const [clients, setClients] = useState<ClientMerchant[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [admins, setAdmins] = useState<ManagerAdmin[]>([]);
  const [superAdminUsername, setSuperAdminUsername] = useState<string>("");
  const [superAdminTelegram, setSuperAdminTelegram] = useState<string>("");
  const [myAdminData, setMyAdminData] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals & form fields visibility states
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [selectedWalletTx, setSelectedWalletTx] = useState<any>(null);
  const [selectedJournalTx, setSelectedJournalTx] = useState<any>(null);
  const [selectedManagerTx, setSelectedManagerTx] = useState<any>(null);
  const [activeJournalClient, setActiveJournalClient] = useState<any>(null);
  const [activeJournalTxs, setActiveJournalTxs] = useState<Transaction[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);

  // Journal Search, Sort, Filter, Badges states
  const [journalSearchQuery, setJournalSearchQuery] = useState("");
  const [journalSortField, setJournalSortField] = useState<"tx_id" | "tx_type" | "amount" | "notes" | "voucher_num" | "status" | "created_at">("tx_id");
  const [journalSortDir, setJournalSortDir] = useState<"asc" | "desc">("desc");
  const [journalStatusFilter, setJournalStatusFilter] = useState<string>("all");

  const handleJournalSort = (field: "tx_id" | "tx_type" | "amount" | "notes" | "voucher_num" | "status" | "created_at") => {
    if (journalSortField === field) {
      setJournalSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setJournalSortField(field);
      setJournalSortDir(field === "amount" || field === "created_at" || field === "tx_id" ? "desc" : "asc");
    }
  };

  const renderSortIndicator = (field: string) => {
    if (journalSortField !== field) {
      return <span className="text-slate-300 opacity-60 mr-1 text-[10px]">↕</span>;
    }
    return journalSortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "مرحل":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
      case "قيد الترحيل":
        return "bg-blue-100 text-blue-800 border-blue-300 font-extrabold";
      case "قيد التدقيق":
        return "bg-amber-100 text-amber-800 border-amber-300 font-extrabold";
      case "غير مرحل":
      default:
        return "bg-rose-100 text-rose-800 border-rose-300 font-extrabold";
    }
  };

  const filteredJournalTxs = React.useMemo(() => {
    let list = [...activeJournalTxs];

    if (journalSearchQuery.trim()) {
      const q = journalSearchQuery.trim().toLowerCase();
      list = list.filter((tx) => {
        const amountStr = String(tx.amount || "");
        const notesStr = String(tx.notes || "").toLowerCase();
        const txIdStr = String(tx.tx_id || "");
        const voucherStr = String(tx.voucher_num || "").toLowerCase();
        const typeStr = String(tx.tx_type || "").toLowerCase();
        const statusStr = String(tx.status || "").toLowerCase();
        return (
          amountStr.includes(q) ||
          notesStr.includes(q) ||
          txIdStr.includes(q) ||
          voucherStr.includes(q) ||
          typeStr.includes(q) ||
          statusStr.includes(q)
        );
      });
    }

    if (journalStatusFilter && journalStatusFilter !== "all") {
      list = list.filter((tx) => tx.status === journalStatusFilter);
    }

    list.sort((a, b) => {
      let aVal: any = a[journalSortField];
      let bVal: any = b[journalSortField];

      if (journalSortField === "amount" || journalSortField === "tx_id") {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else if (journalSortField === "created_at") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return journalSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return journalSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [activeJournalTxs, journalSearchQuery, journalStatusFilter, journalSortField, journalSortDir]);

  // New Custom Payment Modal instead of prompt (Req 2)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentClient, setPaymentClient] = useState<ClientMerchant | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Search and Sort states
  const [merchantSearch, setMerchantSearch] = useState("");
  const [accountantSearch, setAccountantSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [accMerchantSearch, setAccMerchantSearch] = useState(""); // Accountant modal search
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Selected object for editing
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields - Client Merchant
  const [cCompanyName, setCCompanyName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cStartDate, setCStartDate] = useState("");
  const [cEndDate, setCEndDate] = useState("");
  const [cSubValue, setCSubValue] = useState("");
  const [cPaidAmount, setCPaidAmount] = useState("");
  const [cStatus, setCStatus] = useState<"Active" | "Inactive">("Active");

  
  // Accountant Transfer & Statement
  const [showAccTransferModal, setShowAccTransferModal] = useState(false);
  const [accTransferAction, setAccTransferAction] = useState<"pay" | "receive">("pay");
  const [accTransferAmount, setAccTransferAmount] = useState("");
  const [accTransferNotes, setAccTransferNotes] = useState("");
  const [showAccStatementModal, setShowAccStatementModal] = useState(false);
  const [accStatementData, setAccStatementData] = useState<any[]>([]);
  const [accStatementAccountant, setAccStatementAccountant] = useState<any>(null);

  // User to User Wallet Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const handleUserWalletTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRecipient || !transferRecipient.trim()) {
      toast.error("يرجى إدخال اسم المستخدم المحول له.");
      return;
    }
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("يرجى إدخال مبلغ تحويل صالح أكبر من صفر.");
      return;
    }
    if (wallet && amt > wallet.balance) {
      toast.error(`رصيد محفظة الكاش المتاح (${wallet.balance}$) غير كافٍ لإجراء هذا التحويل.`);
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          recipientUsername: transferRecipient.trim(),
          amount: amt,
          notes: transferReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "تم التحويل بنجاح!");
        setTransferModalOpen(false);
        setTransferRecipient("");
        setTransferAmount("");
        setTransferReason("");
        fetchWallet();
      } else {
        toast.error(data.message || "فشلت عملية التحويل.");
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء إجراء التحويل.");
    } finally {
      setTransferLoading(false);
    }
  };
  
  const openAccTransfer = (action: "pay" | "receive") => {
    setAccTransferAction(action);
    setAccTransferAmount("");
    setAccTransferNotes("");
    setShowAccTransferModal(true);
  };

  const handleAccTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/transfer-accountant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          accountantId: editId,
          action: accTransferAction,
          amount: parseFloat(parseCommasToNumberString(String(accTransferAmount))),
          notes: accTransferNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", "تم تسجيل الحركة المحاسبية بنجاح.");
        setShowAccTransferModal(false);
        fetchDashboardData(); fetchWallet();
      } else {
        triggerAlert("error", data.message || "فشلت العملية");
      }
    } catch (err) {
      triggerAlert("error", "خطأ بالاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const openAccStatement = async (targetId?: number | null) => {
  const idToUse = targetId ?? editId;
  if (!idToUse) return;
  setSubmitting(true);
  try {
    const res = await fetch("/api/transactions/accountant-statement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth: effectiveAuth,
        id: idToUse
      })
    });
    const data = await res.json();
    if (data.success) {
      setAccStatementData(data.transactions || []);
      setAccStatementAccountant(data.accountant || {});
      setShowAccStatementModal(true);
    } else {
      triggerAlert("error", data.message || "فشل جلب كشف الحساب.");
    }
  } catch (err) {
    triggerAlert("error", "خطأ بالشبكة");
  } finally {
    setSubmitting(false);
  }
};

  // Differences Report & Detailed Client Card states
  const [showDiffReportModal, setShowDiffReportModal] = useState(false);
  const [selectedClientForCard, setSelectedClientForCard] = useState<ClientMerchant | null>(null);
  const [subAmount, setSubAmount] = useState("");
  const [subNotes, setSubNotes] = useState("");
  const [cardCompanyName, setCardCompanyName] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [cardAddress, setCardAddress] = useState("");
  const [cardNotes, setCardNotes] = useState("");
  const [cardStartDate, setCardStartDate] = useState("");
  const [cardEndDate, setCardEndDate] = useState("");
  const [cardSubValue, setCardSubValue] = useState("");
  const [cardPaidAmount, setCardPaidAmount] = useState("");
  const [cardStatus, setCardStatus] = useState<"Active" | "Inactive">("Active");
  const [cardIsEditing, setCardIsEditing] = useState(false);
  const [cardStorageLimit, setCardStorageLimit] = useState("25");

  // Open detailed client card helper
  const openSelectedClientCard = (c: ClientMerchant) => {
    setSelectedClientForCard(c);
    setCardCompanyName(c.company_name);
    setCardPhone(c.phone);
    setCardAddress(c.address || "");
    setCardNotes(c.notes || "");
    setCardStartDate(c.start_date || "");
    setCardEndDate(c.end_date || "");
    setCardSubValue(c.subscription_value.toString());
    setCardPaidAmount(c.paid_amount.toString());
    setCardStatus(c.status);
    setCardIsEditing(false);
    setSubAmount("");
    setSubNotes("");
  };

  // Card record transaction helper
  const handleCardRecordTransaction = async (type: "add" | "deduct") => {
    if (!selectedClientForCard) return;
    const amountVal = parseFloat(parseCommasToNumberString(String(subAmount)));
    if (isNaN(amountVal) || amountVal <= 0) {
      triggerAlert("error", "يرجى إدخال قيمة مالية صالحة للعملية.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/clients/record-payment-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth,
          id: selectedClientForCard.client_id,
          type,
          amount: amountVal,
          description: subNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message);
        setSubAmount("");
        setSubNotes("");
        const newPaid = data.newPaidAmount;
        setCardPaidAmount(newPaid.toString());
        setSelectedClientForCard({
          ...selectedClientForCard,
          paid_amount: newPaid,
        });
        fetchDashboardData();
        fetchWallet();
      } else {
        triggerAlert("error", data.message || "فشلت العملية.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الشبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Card save client info edits helper
  const handleSaveCardClientEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForCard) return;
    setSubmitting(true);
    try {
      const payload = {
        companyName: cardCompanyName,
        phone: cardPhone,
        address: cardAddress,
        notes: cardNotes,
        startDate: cardStartDate,
        endDate: cardEndDate,
        subValue: parseFloat(parseCommasToNumberString(String(cardSubValue || "0"))),
        paidAmount: parseFloat(parseCommasToNumberString(String(cardPaidAmount || "0"))),
        status: cardStatus,
      };

      const res = await fetch("/api/clients/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id: selectedClientForCard.client_id, client: payload }),
      });

      const data = await res.json();

      if (data.success) {
        if (isSuperAdmin && cardStorageLimit) {
          fetch("/api/settings/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ auth: effectiveAuth, key: `storage_limit_${selectedClientForCard.client_id}`, value: cardStorageLimit })
          });
        }
        triggerAlert("success", "✅ تم حفظ التعديلات وحيازة البيانات الجديدة للعميل بنجاح!");

        setCardIsEditing(false);
        fetchDashboardData();
        setSelectedClientForCard({
          ...selectedClientForCard,
          company_name: cardCompanyName,
          phone: cardPhone,
          address: cardAddress,
          notes: cardNotes,
          start_date: cardStartDate,
          end_date: cardEndDate,
          subscription_value: selectedClientForCard.subscription_value,
          paid_amount: parseFloat(parseCommasToNumberString(String(cardPaidAmount || "0"))),
          status: cardStatus,
        });
      } else {
        triggerAlert("error", data.message || "فشلت عملية حفظ التعديلات.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الشبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Form Fields - Accountant
  const [aFullName, setAFullName] = useState("");
  const [aUsername, setAUsername] = useState("");
  const [aPassword, setAPassword] = useState("");
  const [aPhone, setAPhone] = useState("");
  const [aAddress, setAAddress] = useState("");
  const [aSalary, setASalary] = useState("");
  const [aTelegramId, setATelegramId] = useState("");
  const [aStatus, setAStatus] = useState<"Active" | "Inactive">("Active");
  const [aSelectedClients, setASelectedClients] = useState<number[]>([]);

  // Form Fields - Manager Admin (Super Admin view only)
  const [saFullName, setSaFullName] = useState("");
  const [saUsername, setSaUsername] = useState("");
  const [saPassword, setSaPassword] = useState("");
  const [saPhone, setSaPhone] = useState("");
  const [saStartDate, setSaStartDate] = useState("");
  const [saEndDate, setSaEndDate] = useState("");
  const [saSubValue, setSaSubValue] = useState("");
  const [saPaidAmount, setSaPaidAmount] = useState("");
  const [saStatus, setSaStatus] = useState<"Active" | "Inactive">("Active");

  // Multi-client permissions modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignAccId, setAssignAccId] = useState<number | null>(null);
  const [assignSelectedIds, setAssignSelectedIds] = useState<number[]>([]);

  // Super Admin recharges modal
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTargetId, setChargeTargetId] = useState<number | null>(null);
  const [chargeTargetName, setChargeTargetName] = useState("");
  const [chargeAmt, setChargeAmt] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeActionType, setChargeActionType] = useState<"charge" | "bonus" | "deduct_balance" | "deduct_bonus">("charge");

  // Super Admin manual activation request approval modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveClientId, setApproveClientId] = useState<number | null>(null);
  const [approveClientName, setApproveClientName] = useState("");
  const [approveStart, setApproveStart] = useState("");
  const [approveEnd, setApproveEnd] = useState("");
  const [approveSub, setApproveSub] = useState("10");
  const [approvePaid, setApprovePaid] = useState("0");

  // Manager details view and edit modal states
  const [managerDetailsModalOpen, setManagerDetailsModalOpen] = useState(false);
  const [publicManagerModalOpen, setPublicManagerModalOpen] = useState(false);
  const [selectedPublicManager, setSelectedPublicManager] = useState<any>(null);
  const [loadingPublicManager, setLoadingPublicManager] = useState(false);

  const openPublicManagerProfile = async (main_id: number, fallbackManagerData?: any) => {
    setPublicManagerModalOpen(true);
    setLoadingPublicManager(true);
    try {
      const res = await fetch("/api/public/managers");
      const data = await res.json();
      if (data.success && data.data) {
        const mgr = data.data.find((m: any) => m.main_id === main_id);
        if (mgr) {
          setSelectedPublicManager(mgr);
        } else if (fallbackManagerData) {
          setSelectedPublicManager({
             ...fallbackManagerData,
             main_id,
             is_private: true
          });
        } else {
          triggerAlert("error", "بروفايل هذا المدير غير متاح.");
          setPublicManagerModalOpen(false);
        }
      }
    } catch (err) {
      triggerAlert("error", "فشل جلب بيانات البروفايل.");
      setPublicManagerModalOpen(false);
    } finally {
      setLoadingPublicManager(false);
    }
  };
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [selectedManagerDetails, setSelectedManagerDetails] = useState<ManagerAdmin | null>(null);
  const [selectedManagerTransactions, setSelectedManagerTransactions] = useState<any[]>([]);
  const [ownerStatementTab, setOwnerStatementTab] = useState<"cash" | "bonus" | "all">("all");
  const [walletLedgerTab, setWalletLedgerTab] = useState<"cash" | "bonus" | "all">("cash");
  const [walletFilterAccount, setWalletFilterAccount] = useState<string>("");
  const [walletFilterStartDate, setWalletFilterStartDate] = useState<string>("");
  const [walletFilterEndDate, setWalletFilterEndDate] = useState<string>("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
  const [loadingManagerDetails, setLoadingManagerDetails] = useState(false);

  // Manager details form editing states
  const [editMgrFullName, setEditMgrFullName] = useState("");
  const [editMgrUsername, setEditMgrUsername] = useState("");
  const [editMgrPassword, setEditMgrPassword] = useState("");
  const [editMgrPhone, setEditMgrPhone] = useState("");
  const [editMgrStartDate, setEditMgrStartDate] = useState("");
  const [editMgrEndDate, setEditMgrEndDate] = useState("");
  const [editMgrSubValue, setEditMgrSubValue] = useState("");
  const [editMgrPaidAmount, setEditMgrPaidAmount] = useState("");
  const [editMgrStatus, setEditMgrStatus] = useState<"Active" | "Inactive">("Active");
  const [editMgrWalletBalance, setEditMgrWalletBalance] = useState("");
  const [editMgrWalletBonus, setEditMgrWalletBonus] = useState("");

  // Profile data
  const [bio, setBio] = useState("");
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [services, setServices] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [languages, setLanguages] = useState("");
  const [isPublic, setIsPublic] = useState(false);


  // Health Stats & Audit Feed (Super Admin only)
  const [healthData, setHealthData] = useState<any>(null);
  const [healthSubTab, setHealthSubTab] = useState<"storage" | "audit">("storage");
  const [isExporting, setIsExporting] = useState(false);
  const [storageSortConfig, setStorageSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'percentage', direction: 'desc' });

  
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/monitoring/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `accuflow-backup-${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        triggerAlert("success", "تم تصدير النسخة الاحتياطية بنجاح.");
      } else {
        triggerAlert("error", data.message || "فشل تصدير البيانات.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الاتصال أثناء التصدير.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleStorageSort = (key: string) => {
    let direction: 'asc'|'desc' = 'desc';
    if (storageSortConfig.key === key && storageSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setStorageSortConfig({ key, direction });
  };

  const sortedStorageUsage = React.useMemo(() => {
    if (!healthData?.storageUsage) return [];
    let sortable = [...healthData.storageUsage];
    sortable.sort((a, b) => {
      let aValue = a[storageSortConfig.key];
      let bValue = b[storageSortConfig.key];
      
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return storageSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return storageSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [healthData?.storageUsage, storageSortConfig]);

  

  // Settings (Super Admin only)
  const [fontSize, setFontSize] = useState<string>(localStorage.getItem("accountingFontSize") || "14");
  
  // Gallery Modal
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryClientId, setGalleryClientId] = useState<number | null>(null);
  const [galleryClientName, setGalleryClientName] = useState<string>("");
  const [galleryAttachments, setGalleryAttachments] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const openGalleryModal = async (clientId: number, companyName: string) => {
    setGalleryClientId(clientId);
    setGalleryClientName(companyName);
    setGalleryModalOpen(true);
    setLoadingGallery(true);
    try {
      const res = await fetch("/api/attachments/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setGalleryAttachments(data.attachments);
      } else {
        triggerAlert("error", data.message);
      }
    } catch (err) {
      triggerAlert("error", "فشل تحميل المرفقات");
    } finally {
      setLoadingGallery(false);
    }
  };

  
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    setFontSize(size);
    localStorage.setItem("accountingFontSize", size);
    document.documentElement.style.setProperty("font-size", `${size}px`, "important");
  };

  // Notification Toast Overlay instead of shifting page layout (Req 4)
  const [submitting, setSubmitting] = useState(false);

  // Helper Formatter Functions in English + WeekdayName (Req 15)
  const formatNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    const parsed = parseFloat(parseCommasToNumberString(String(num.toString())));
    if (isNaN(parsed)) return num.toString();
    return parsed.toLocaleString("en-US");
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
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

  // Expiration Status Color Determination (Req 17 & Req 18)
  const isDateExpired = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(dateStr);
    return end < today;
  };

  const isDateApproachingExpiration = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(dateStr);
    if (end < today) return false;
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const getDateStyleClass = (dateStr: string | null | undefined, startColorClass = "text-slate-600 font-medium"): string => {
    if (!dateStr) return startColorClass;
    if (isDateExpired(dateStr)) return "text-red-600 font-extrabold bg-red-50/75 px-2 py-1 rounded-lg border border-red-100 text-[11px] inline-block";
    if (isDateApproachingExpiration(dateStr)) return "text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-[11px] inline-block";
    return startColorClass;
  };

  // Sorting Header Trigger
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sort helper
  const getSortedData = <T extends any>(data: T[], defaultField: string): T[] => {
    const field = sortField || defaultField;
    return [...data].sort((a: any, b: any) => {
      let valA = a[field];
      let valB = b[field];
      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });
  };

  // Load complete dashboard dataset
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.success) {
        const clientsWithBalance = (data.clients || []).map((c: any) => ({
          ...c,
          balance: (c.subscription_value || 0) - (c.paid_amount || 0)
        }));
        setClients(clientsWithBalance);
        setAccountants(data.accountants || []);
        setAdmins(data.allAdmins || []);
        setMyAdminData(data.myAdminData);
        setSuperAdminUsername(data.superAdminUsername || "");
        setSuperAdminTelegram(data.superAdminTelegram || "");
        setCoopProfile(data.hasAccountantProfile || null);
        setCoopProfiles(data.accountantProfiles || []);
      } else {
        triggerAlert("error", data.message || "خطأ أثناء جلب البيانات.");
      }
    } catch (err) {
      triggerAlert("error", "حدث خطأ في الاتصال بالشبكة.");
    } finally {
      setLoading(false);
    }
  };

  // Load Wallet details
  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/wallet/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data);
      }
    } catch (err) {
      console.error("Wallet loading failed", err);
    }
  };

  // Fetch Health & Audit Logs (Super Admin only)
  const fetchHealthAndAudit = async () => {
    try {
      const res = await fetch("/api/monitoring/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.success) {
        setHealthData(data);
      }
    } catch (err) {
      console.error("Health stats loading failed", err);
    }
  };

  // Fetch profile details
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setBio(p.bio || "");
        setFacebook(p.facebook_url || "");
        setInstagram(p.instagram_url || "");
        setLinkedin(p.linkedin_url || "");
        if (p.directory) {
          setServices(p.directory.services || "");
          setYearsExp(p.directory.years_exp?.toString() || "");
          setLanguages(p.directory.languages || "");
          setIsPublic(!!p.directory.is_public);
        }
      }
    } catch (err) {
      console.error("Profile load failed", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchWallet();
    if (effectiveAuth.role === "accountant") {
      setActiveTab("clients");
    }
    if (isSuperAdmin) {
      fetchHealthAndAudit();
    }
  }, [effectiveAuth]);

  useEffect(() => {
    if (activeTab === "profile" && effectiveAuth.role !== "accountant") {
      fetchProfile();
    } else if (activeTab === "health" && isSuperAdmin) {
      fetchHealthAndAudit();
    } else if (activeTab === "wallet") {
      fetchWallet();
    }
  }, [activeTab]);

  const triggerAlert = (type: "success" | "error", msg: string) => {
    if (type === "success") toast.success(msg);
    else toast.error(msg);
  };

  // Helper copy link
  const copyPortalLink = (token: string) => {
    const portalUrl = `${window.location.origin}/portal?client=${token}`;
    navigator.clipboard.writeText(portalUrl).then(() => {
      triggerAlert("success", "✅ تم نسخ رابط البوابة المالية للتاجر بنجاح!");
    });
  };

  // Pre-check Add Merchant Client (Evaluation for Wallet sufficiency or Free pack)
  const openAddClientModal = async () => {
    setEditId(null);
    setCCompanyName("");
    setCPhone("");
    setCAddress("");
    setCNotes("");
    setCStartDate("");
    setCEndDate("");
    setCSubValue("10");
    setCPaidAmount("0");
    setCStatus("Active");

    try {
      const res = await fetch("/api/wallet/can-add-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.canAdd) {
        if (data.isOwner) {
          // Do not show any notification for owner
        } else if (data.isFree) {
          triggerAlert("success", "🎁 مبروك! الباقة تمنحك أول تاجر/عميل مجاني بالكامل فورياً!");
        } else {
          triggerAlert("success", `💰 تنبيه المحفظة: سيتم خصم ${data.cost}$ عند إضافة هذا العميل بنجاح.`);
        }
        setClientModalOpen(true);
      } else {
        triggerAlert("error", data.reason || "رصيد محفظتك غير كافٍ لإضافة منشأة جديدة. يرجى الشحن أولاً.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الشبكة.");
    }
  };

  // Save Merchant Client
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        companyName: cCompanyName,
        phone: cPhone,
        address: cAddress,
        notes: cNotes,
        startDate: cStartDate,
        endDate: cEndDate,
        subValue: parseFloat(parseCommasToNumberString(String(cSubValue || "0"))),
        paidAmount: parseFloat(parseCommasToNumberString(String(cPaidAmount || "0"))),
        status: cStatus,
      };

      const url = editId ? "/api/clients/edit" : "/api/clients/add";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id: editId, client: payload }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم حفظ بيانات التاجر بنجاح وتوثيقه!");
        setClientModalOpen(false);
        fetchDashboardData();
        fetchWallet();
      } else {
        triggerAlert("error", data.message || "حدث خطأ أثناء الحفظ.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الشبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Client Merchant Status (Manager suspension)
  const toggleClientStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/clients/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", `تمت العملية بنجاح. حالة التاجر الآن: ${nextStatus === "Active" ? "نشط" : "معطل"}`);
        fetchDashboardData();
      }
    } catch (err) {
      triggerAlert("error", "فشلت العملية.");
    }
  };



  // Open Edit Client Modal
  const openEditClient = (c: ClientMerchant) => {
    setEditId(c.client_id);
    setCCompanyName(c.company_name);
    setCPhone(c.phone);
    setCAddress(c.address || "");
    setCNotes(c.notes || "");
    setCStartDate(c.start_date || "");
    setCEndDate(c.end_date || "");
    setCSubValue(c.subscription_value.toString());
    setCPaidAmount(c.paid_amount.toString());
    setCStatus(c.status);
    setClientModalOpen(true);
  };

  // Custom Payment Modal Submission (Req 2)
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentClient) return;
    const additional = parseFloat(parseCommasToNumberString(String(paymentAmount)));
    if (isNaN(additional) || additional <= 0) {
      triggerAlert("error", "يرجى إدخال مبلغ دفع صالح.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/clients/record-payment-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          id: paymentClient.client_id,
          type: "add",
          amount: additional,
          description: "دفعة مسجلة عبر نافذة تسجيل الدفعة",
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", `✅ تم تسجيل الدفعة الإضافية بقيمة ${formatNumber(additional)}$ بنجاح!`);
        setPaymentModalOpen(false);
        setPaymentClient(null);
        fetchDashboardData();
        fetchWallet();
      } else {
        triggerAlert("error", data.message || "فشل تسجيل الدفعة المالية.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الاتصال بالشبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPaymentValue = (client: ClientMerchant) => {
    setPaymentClient(client);
    setPaymentAmount("");
    setPaymentModalOpen(true);
  };

  // Open Daily Journal modal for client
  const openDailyJournal = async (client: ClientMerchant) => {
    setActiveJournalClient(client);
    setJournalLoading(true);
    setJournalModalOpen(true);
    setJournalSearchQuery("");
    setJournalStatusFilter("all");
    setJournalSortField("tx_id");
    setJournalSortDir("desc");
    try {
      const res = await fetch("/api/transactions/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, cid: client.client_id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveJournalTxs(data.data || []);
      } else {
        triggerAlert("error", "تعذر جلب تفاصيل دفتر اليومية لهذه المنشأة.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ شبكة.");
    } finally {
      setJournalLoading(false);
    }
  };

  // Update transaction status & voucher number (مرحل / غير مرحل / قيد التدقيق)
  
  const openAttachment = (fileData: string, fileName: string) => {
    if (fileData.startsWith("data:application/pdf")) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<iframe src="${fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else if (fileData.startsWith("data:image")) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<img src="${fileData}" alt="${fileName}" style="max-width: 100%; height: auto;" />`);
      }
    } else {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = fileName || "attachment";
      a.click();
    }
  };

  const handleUpdateTxStatus = async (tid: number, newStatus: string, voucherNum: string) => {
    try {
      const res = await fetch("/api/transactions/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          tid,
          status: newStatus,
          voucherNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم الحفظ بنجاح!");
        setActiveJournalTxs(prev => prev.map(tx => tx.tx_id === tid ? { ...tx, status: newStatus as any, voucher_num: voucherNum } : tx));
      } else {
        triggerAlert("error", data.message || "حدث خطأ.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الشبكة.");
    }
  };

  // Pre-check Add Accountant
  const openAddAccModal = async () => {
    setEditId(null);
    setAFullName("");
    setAUsername("");
    setAPassword("");
    setAPhone("");
    setAAddress("");
    setASalary("");
    setATelegramId("");
    setAStatus("Active");
    setASelectedClients([]);

    try {
      const res = await fetch("/api/wallet/can-add-accountant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth }),
      });
      const data = await res.json();
      if (data.canAdd) {
        if (data.isOwner) {
          // Do not show any notification for owner
        } else if (data.isFree) {
          triggerAlert("success", "🎁 مبروك الباقة تمنحك أول محاسب مجاناً فورياً!");
        } else {
          triggerAlert("success", `💰 تنبيه المحفظة: سيتم خصم ${data.cost}$ عند إضافة هذا المحاسب بنجاح.`);
        }
        setAccModalOpen(true);
      } else {
        triggerAlert("error", data.reason || "رصيد محفظتك غير كافٍ لإضافة محاسب جديد.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ.");
    }
  };

  // Save Accountant
  const handleSaveAccountant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        fullName: aFullName,
        username: aUsername,
        password: aPassword,
        phone: aPhone,
        address: aAddress,
        salary: parseFloat(parseCommasToNumberString(String(aSalary || "0"))),
        telegramId: aTelegramId,
        status: aStatus,
        selectedClients: aSelectedClients,
      };

      const url = editId ? "/api/accountants/edit" : "/api/accountants/add";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id: editId, accountant: payload }),
      });

      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم حفظ المحاسب بنجاح!");
        setAccModalOpen(false);
        fetchDashboardData();
        fetchWallet();
      } else {
        triggerAlert("error", data.message || "حدث خطأ.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ شبكة.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Accountant modal
  const openEditAccountant = (acc: Accountant) => {
    setEditId(acc.accountant_id);
    setAFullName(acc.full_name);
    setAUsername(acc.username);
    setAPassword("");
    setAPhone(acc.phone || "");
    setAAddress(acc.address || "");
    setASalary(acc.salary.toString());
    setATelegramId(acc.telegram_id || "");
    setAStatus(acc.status);
    setASelectedClients([]);
    setAccModalOpen(true);
  };

  // Interactive Accountant Status Toggle Clickable Badge (Req 20)
  const toggleAccountantStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/accountants/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || `تم تحديث حالة المحاسب لتصبح: ${nextStatus === "Active" ? "نشط" : "معطل"}`);
        fetchDashboardData();
      } else {
        triggerAlert("error", data.message || "فشلت العملية.");
      }
    } catch (err) {
      triggerAlert("error", "فشلت العملية.");
    }
  };

  // Toggle Admin / Manager Status directly from the table
  const toggleAdminStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/admins/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || `تم تحديث حالة حساب المدير لتصبح: ${nextStatus === "Active" ? "نشط" : "معطل"}`);
        fetchDashboardData();
      } else {
        triggerAlert("error", data.message || "فشلت العملية.");
      }
    } catch (err) {
      triggerAlert("error", "فشلت العملية.");
    }
  };

  // Instant Accountant-Client assignment modal
  const openAssignClients = (acc: Accountant) => {
    setAssignAccId(acc.accountant_id);
    const assignedIds = (acc.assigned_clients || [])
      .filter((c) => c.link_status === "Active")
      .map((c) => c.client_id);
    setAssignSelectedIds(assignedIds);
    setAssignModalOpen(true);
  };

  // Save instant assigned clients permissions
  const handleSavePermissions = async () => {
    if (!assignAccId) return;
    try {
      const res = await fetch("/api/accountants/assign-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          accId: assignAccId,
          clientIds: assignSelectedIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم تحديث الصلاحيات بنجاح!");
        setAssignModalOpen(false);
        fetchDashboardData();
      } else {
        triggerAlert("error", data.message);
      }
    } catch (err) {
      triggerAlert("error", "فشل التحديث.");
    }
  };

  // Open Recharge wallet modal
  const openChargeModal = (adm: ManagerAdmin) => {
    setChargeTargetId(adm.main_id);
    setChargeTargetName(adm.full_name);
    setChargeAmt("");
    setChargeDesc("");
    setChargeActionType("charge");
    setChargeModalOpen(true);
  };

  // Submit Recharge / Bonus / Deduction wallet operation
  const handleSaveRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeTargetId) return;
    setSubmitting(true);

    let apiUrl = "/api/wallet/charge";
    let bodyPayload: any = {
      auth: effectiveAuth,
      targetMainId: chargeTargetId,
      amount: parseFloat(parseCommasToNumberString(String(chargeAmt))),
      description: chargeDesc,
    };

    if (chargeActionType === "bonus") {
      apiUrl = "/api/wallet/add-bonus";
    } else if (chargeActionType === "deduct_balance") {
      apiUrl = "/api/wallet/deduct";
      bodyPayload.source = "balance";
    } else if (chargeActionType === "deduct_bonus") {
      apiUrl = "/api/wallet/deduct";
      bodyPayload.source = "bonus";
    }

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تمت العملية بنجاح!");
        setChargeModalOpen(false);
        fetchDashboardData();
        fetchWallet();
      } else {
        triggerAlert("error", data.message || "تعذر إتمام العملية.");
      }
    } catch (err) {
      triggerAlert("error", "خطأ في الاتصال بالخادم.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detailed Manager profile modal and fetch transactions history
  const openManagerDetailsModal = async (id: number) => {
    setSelectedManagerId(id);
    setLoadingManagerDetails(true);
    setManagerDetailsModalOpen(true);
    try {
      const res = await fetch("/api/admins/get-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, id }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedManagerDetails(data.admin);
        setSelectedManagerTransactions(data.transactions || []);
        
        // Populate form fields for editing
        setEditMgrFullName(data.admin.full_name || "");
        setEditMgrUsername(data.admin.username || "");
        setEditMgrPassword("");
        setEditMgrPhone(data.admin.phone || "");
        setEditMgrStartDate(data.admin.start_date ? data.admin.start_date.substring(0, 10) : "");
        setEditMgrEndDate(data.admin.end_date ? data.admin.end_date.substring(0, 10) : "");
        setEditMgrSubValue(data.admin.subscription_value?.toString() || "0");
        setEditMgrPaidAmount(data.admin.paid_amount?.toString() || "0");
        setEditMgrStatus(data.admin.status || "Active");
        setEditMgrWalletBalance(data.admin.wallet_balance?.toString() || "0");
        setEditMgrWalletBonus(data.admin.wallet_bonus?.toString() || "0");
      } else {
        triggerAlert("error", data.message || "فشل جلب بيانات المدير.");
        setManagerDetailsModalOpen(false);
      }
    } catch (err) {
      triggerAlert("error", "فشل جلب البيانات.");
      setManagerDetailsModalOpen(false);
    } finally {
      setLoadingManagerDetails(false);
    }
  };

  // Submit edits on manager profile (full authority)
  const handleSaveManagerDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admins/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          id: selectedManagerId,
          admin: {
            fullName: editMgrFullName,
            username: editMgrUsername,
            password: editMgrPassword,
            phone: editMgrPhone,
            startDate: editMgrStartDate,
            endDate: editMgrEndDate,
            subValue: parseFloat(parseCommasToNumberString(String(editMgrSubValue || "0"))),
            paidAmount: parseFloat(parseCommasToNumberString(String(editMgrPaidAmount || "0"))),
            status: editMgrStatus,
            walletBalance: parseFloat(parseCommasToNumberString(String(editMgrWalletBalance || "0"))),
            walletBonus: parseFloat(parseCommasToNumberString(String(editMgrWalletBonus || "0")))
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم حفظ البيانات بنجاح!");
        setManagerDetailsModalOpen(false);
        fetchDashboardData();
      } else {
        triggerAlert("error", data.message || "حدث خطأ أثناء حفظ البيانات.");
      }
    } catch (err) {
      triggerAlert("error", "فشل حفظ البيانات.");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Directory Profile

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      triggerAlert("error", "كلمات المرور الجديدة غير متطابقة.");
      return;
    }
    if (newPassword.length < 6) {
      triggerAlert("error", "يجب أن لا يقل طول كلمة المرور عن 6 محارف.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          oldPassword,
          newPassword
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", "تم تغيير كلمة المرور بنجاح.");
        setChangePasswordModalOpen(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        triggerAlert("error", data.message || "فشلت العملية.");
      }
    } catch (err) {
      triggerAlert("error", "حدث خطأ في الاتصال.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: effectiveAuth,
          data: {
            bio,
            facebook_url: facebook,
            instagram_url: instagram,
            linkedin_url: linkedin,
            services,
            years_exp: yearsExp ? parseInt(yearsExp) : 0,
            languages,
            is_public: isPublic,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert("success", data.message || "تم حفظ البروفايل بنجاح!");
      }
    } catch (err) {
      triggerAlert("error", "خطأ.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter lists based on search queries
  const searchedClients = clients.filter(c => 
    c.company_name?.toLowerCase().includes(merchantSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(merchantSearch.toLowerCase())
  );

  const searchedAccountants = accountants.filter(a => {
    const s = (accountantSearch || "").toLowerCase();
    const nameMatch = a.full_name ? a.full_name.toLowerCase().includes(s) : false;
    const userMatch = a.username ? a.username.toLowerCase().includes(s) : false;
    return s === "" ? true : (nameMatch || userMatch);
  });

  const searchedAdmins = admins.filter(ad => {
    const s = (managerSearch || "").toLowerCase();
    const nameMatch = ad.full_name ? ad.full_name.toLowerCase().includes(s) : false;
    const userMatch = ad.username ? ad.username.toLowerCase().includes(s) : false;
    return s === "" ? true : (nameMatch || userMatch);
  });

  const filterAccMerchants = clients.filter(c =>
    c.company_name?.toLowerCase().includes(accMerchantSearch.toLowerCase())
  );

  // Sorting columns dynamically
  const sortedClients = getSortedData(searchedClients, "client_id") as ClientMerchant[];
  const sortedAccountants = getSortedData(searchedAccountants, "accountant_id") as Accountant[];
  const sortedAdmins = getSortedData(searchedAdmins, "main_id") as ManagerAdmin[];

  // --- SUB STATEMENT MODAL ---
  const [subStatementModalOpen, setSubStatementModalOpen] = useState(false);
  const [subStatementLoading, setSubStatementLoading] = useState(false);
  const [subStatementTxs, setSubStatementTxs] = useState<any[]>([]);
  const [subStatementClient, setSubStatementClient] = useState<any>(null);

  const openSubStatement = async (client: any) => {
    setSubStatementClient(client);
    setSubStatementModalOpen(true);
    setSubStatementLoading(true);
    try {
      const res = await fetch("/api/transactions/manager-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth: effectiveAuth, clientId: client.client_id })
      });
      const data = await res.json();
      if (data.success) {
        setSubStatementTxs(data.data || []);
      } else {
        triggerAlert("error", "تعذر جلب كشف حساب التاجر.");
      }
    } catch (e) {
      triggerAlert("error", "خطأ في الشبكة");
    } finally {
      setSubStatementLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f5] flex flex-col justify-between" dir="rtl" id="managerDashboardUI">
      
      {/* Absolute Floating Toasts overlay instead of layout shifting (Req 4) */}
      {/* STICKY BLUE HEADER (Req 19 & Req 13) */}
      <header className="bg-[#141416] text-white border-b border-zinc-800/80 shadow-md p-5 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="space-y-1 text-center md:text-right">
          <h1 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
            <Building className="w-5 h-5 text-amber-500" />
            AccuFlow - لوحة التحكم
          </h1>
          <p className="text-[13px] text-zinc-400 font-bold">
            مرحباً بك، {isSuperAdmin ? "الإدارة لعليا" : effectiveAuth.role === "accountant" ? "المحاسب المعتمد" : "المدير المالي المعتمد"} 
            {effectiveAuth.username && <span className="text-[15px] mr-2 px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800/60 text-zinc-300">@{effectiveAuth.username}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Workspace Switcher (Cooperative Accountant Mode) */}
          {coopProfiles && coopProfiles.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (effectiveAuth.role === "admin") {
                    if (coopProfiles.length === 1) {
                      const profile = coopProfiles[0];
                      setEffectiveAuth({
                        userId: profile.accountant_id,
                        mainId: profile.main_id,
                        role: "accountant",
                        isSuperAdmin: false,
                        username: auth.username,
                        fullName: profile.full_name, token: auth.token });
                      setActiveTab("clients");
                    } else {
                      setCoopDropdownOpen(!coopDropdownOpen);
                    }
                  } else {
                    setEffectiveAuth(auth);
                    setActiveTab("clients");
                  }
                }}
                className="bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700/80 text-amber-400 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer select-none"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {effectiveAuth.role === "admin" ? "التبديل لبيئة محاسب مساعد" : "العودة لبيئة المدير المالي"}
                </span>
              </button>

              {coopDropdownOpen && effectiveAuth.role === "admin" && (
                <div className="absolute left-0 mt-2 w-64 bg-zinc-900 border border-zinc-850 rounded-2xl shadow-2xl z-50 p-2 space-y-1 text-right" dir="rtl">
                  <div className="text-[10px] font-bold text-zinc-500 px-3 py-1.5 border-b border-zinc-800">
                    اختر بيئة المدير للعمل كمحاسب لديه:
                  </div>
                  {coopProfiles.map((profile, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEffectiveAuth({
                          userId: profile.accountant_id,
                          mainId: profile.main_id,
                          role: "accountant",
                          isSuperAdmin: false,
                          username: auth.username,
                          fullName: profile.full_name, token: auth.token });
                        setCoopDropdownOpen(false);
                        setActiveTab("clients");
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-zinc-800 text-zinc-100 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="text-amber-400 font-semibold">{profile.manager_name || "المدير المالي"}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">@{auth.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wallet Balance Widget */}
          {wallet && effectiveAuth.role !== "accountant" && (
            <div 
              onClick={() => setActiveTab("wallet")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-all cursor-pointer border border-amber-400/20 px-4 py-2 rounded-xl flex items-center gap-2 text-white font-bold shadow-md shadow-orange-500/10"
              id="walletBadge"
            >
              <Wallet className="w-4 h-4 text-white" />
              <span>المحفظة:</span>
              <span className="font-mono text-white">{formatNumber(wallet.total ?? 0)}$</span>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 transition-all text-red-400 px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            تسجيل خروج
          </button>
        </div>
      </header>

      {/* Main Grid Wrapper with STICKY Right Sidebar (Req 19) */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
        
        {/* Sticky Right Sidebar (Req 19) */}
        <aside className="lg:col-span-1 sticky top-[80px] lg:top-[100px] self-start z-30 w-full lg:w-auto">
          <div className="bg-[#141416] p-2.5 lg:p-3 rounded-3xl border border-zinc-800/80 shadow-xl flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 w-full scrollbar-none items-center">
            <button
              id="nav_clients"
              type="button"
              className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "clients" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
              onClick={() => setActiveTab("clients")}
            >
              <Building className="w-4 h-4" />
              المنشآت والتجار
            </button>

            {effectiveAuth.role !== "accountant" && (
                <button
                  id="nav_accountants"
                  type="button"
                  className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "accountants" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
                  onClick={() => setActiveTab("accountants")}
                >
                  <User className="w-4 h-4" />
                  فريق المحاسبين
                </button>
            )}

            {effectiveAuth.role !== "accountant" && (
              <button
                id="nav_wallet"
                type="button"
                className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "wallet" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
                onClick={() => setActiveTab("wallet")}
              >
                <Wallet className="w-4 h-4" />
                المحفظة والعمليات
              </button>
            )}

            {effectiveAuth.role !== "accountant" && (
              <>
                <button
                  id="nav_reports"
                  type="button"
                  className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "reports" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
                  onClick={() => setActiveTab("reports")}
                >
                  <PieChart className="w-4 h-4" />
                  التقارير والتحليل المالي
                </button>

                {isSuperAdmin && (
                  <button
                    id="nav_packages"
                    type="button"
                    className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "packages" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/10" : "bg-purple-500/15 border border-purple-500/35 text-purple-300 hover:bg-purple-500/25"}`}
                    onClick={() => setActiveTab("packages")}
                  >
                    <Package className="w-4 h-4" />
                    الباقات
                  </button>
                )}
              </>
            )}

            {effectiveAuth.role !== "accountant" && (
              <button
                id="nav_profile"
                type="button"
                className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "profile" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/10" : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"}`}
                onClick={() => setActiveTab("profile")}
              >
                <Sliders className="w-4 h-4" />
                بروفايلي العام
              </button>
            )}

            {isSuperAdmin && (
              <>
                <div className="hidden lg:block border-t border-zinc-800/60 my-2 pt-2 text-[15px] text-zinc-500 font-extrabold uppercase px-4 whitespace-nowrap">أدوات الإدارة العليا</div>
                <div className="w-px h-6 bg-zinc-800 self-center mx-1 lg:hidden flex-shrink-0"></div>
                


                <button
                  id="nav_admins"
                  type="button"
                  className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "admins" ? "bg-red-600 text-white shadow-lg shadow-red-500/10" : "bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25"}`}
                  onClick={() => setActiveTab("admins")}
                >
                  <Users className="w-4 h-4" />
                  اشتراكات المدراء
                </button>

                <button
                  id="nav_health"
                  type="button"
                  className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "health" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/10" : "bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25"}`}
                  onClick={() => setActiveTab("health")}
                >
                  <Activity className="w-4 h-4" />
                  صحة النظام والمراقبة
                </button>

                <button
                  id="nav_settings"
                  type="button"
                  className={`w-auto lg:w-full flex-shrink-0 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/10" : "bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 hover:bg-indigo-500/25"}`}
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="w-4 h-4" />
                  إعدادات المنصة
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* MANAGER DETAILS SUMMARY STRIP */}
          {myAdminData && myAdminData.username !== superAdminUsername && effectiveAuth.role !== "accountant" && activeTab === "clients" && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-right space-y-1">
                <span className="text-[10px] text-blue-500 font-extrabold tracking-widest uppercase">حالة باقة اشتراكك الحالية</span>
                <h3 className="text-sm font-bold text-slate-800">صلاحية الباقة: {formatDate(myAdminData.start_date)} إلى {formatDate(myAdminData.end_date)}</h3>
              </div>
            </div>
          )}

          {/* 1. Tab المنشآت والتجار (Clients / Merchants) */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">قائمة المنشآت والتجار النشطين بالرقابة</h2>
                
                {/* Search merchant/phone input (Req 1) */}
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="ابحث باسم المنشأة أو الجوال..."
                      value={merchantSearch}
                      onChange={(e) => setMerchantSearch(e.target.value)}
                      className="w-full pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
                    />
                  </div>

                  {effectiveAuth.role !== "accountant" && (
                    <button
                      id="addClientBtn"
                      type="button"
                      onClick={openAddClientModal}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      تاجر جديد
                    </button>
                  )}
                </div>
              </div>

              {/* Subscription Discrepancy Notification Banner */}
              {effectiveAuth.role !== "accountant" && clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) - clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0) > 0 && (
                <div className="bg-amber-50/95 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-amber-900 shadow-sm">
                  <div className="text-right space-y-0.5">
                    <span className="text-[20px] text-amber-700 font-extrabold block">📊 تنبيه الفروقات المالية والمستحقات</span>
                    <h4 className="text-[20px] font-bold">هناك فرق مستحق قدره <span className="text-red-600 font-mono font-extrabold text-[20px]">${formatNumber(clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) - clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0))}</span> بين إجمالي الاشتراكات الشهرية للتجار وإجمالي المحصل الفعلي.</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDiffReportModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[17px] px-4.5 py-2.5 rounded-xl shadow transition-all whitespace-nowrap"
                  >
                    عرض تقرير تفاصيل الفروقات والتحكم الكامل 🔍
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[15px] text-slate-400 border-b border-slate-100 font-extrabold select-none">
                      <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("client_id")}>كود التاجر (ID)</th>
                      <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("company_name")}>اسم المنشأة / التاجر</th>
                      {isSuperAdmin && <th className="p-3.5 text-center text-[15px]">أضيف من قبل</th>}
                      {effectiveAuth.role === "accountant" && <th className="p-3.5 text-center text-[15px]">المحاسب الرئيسي</th>}
                      {effectiveAuth.role !== "accountant" && (
                        <>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("phone")}>الجوال</th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("end_date")}>تاريخ الانتهاء</th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("subscription_value")}>الاشتراك</th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 text-center text-[15px]" onClick={() => handleSort("paid_amount")}>المدفوع</th>
                          <th className="p-3.5 text-center text-[15px]">بوابة العميل</th>
                        </>
                      )}
                      <th className="p-3.5 text-center text-[15px]">سجل اليومية</th>
                      {effectiveAuth.role !== "accountant" && (
                        <>
                          <th className="p-3.5 text-center text-[15px]">الحالة</th>
                          <th className="p-3.5 text-center text-[15px]">خيارات الإدارة</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={effectiveAuth.role === "accountant" ? 4 : (isSuperAdmin ? 11 : 10)} className="p-8 text-center text-slate-400 font-bold animate-pulse">جاري تحميل بيانات المنشآت...</td>
                      </tr>
                    ) : sortedClients.length === 0 ? (
                      <tr>
                        <td colSpan={effectiveAuth.role === "accountant" ? 4 : (isSuperAdmin ? 11 : 10)} className="p-8 text-center text-slate-400 font-bold">لا توجد سجلات منشآت مطابقة للبحث.</td>
                      </tr>
                    ) : (
                      sortedClients.map((c) => {
                        return (
                          <tr key={c.client_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5 font-bold text-slate-400 font-mono text-center text-[20px]">#{c.client_id}</td>
                            <td className="p-3.5 font-extrabold text-slate-800">

                              {effectiveAuth.role === "accountant" ? (
                                <div className="text-center">
                                  <span className="text-slate-800 block text-[20px]">
                                    {c.company_name}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span
                                    onClick={() => openSelectedClientCard(c)}
                                    className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline transition-all block text-[20px]"
                                    title="تعديل بيانات التاجر"
                                  >
                                    {c.company_name}
                                  </span>
                                  {(c as any).usedStorage >= ((c as any).storageLimit || 25) && (
                                    <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse whitespace-nowrap">
                                      المساحة ممتلئة ({(c as any).usedStorage?.toFixed(1)}MB)
                                    </span>
                                  )}
                                </div>
                              )}

                              {effectiveAuth.role !== "accountant" && (
                                <span className="text-[15px] text-center text-slate-400 font-normal block mt-0.5">{c.address || "بدون عنوان مسجل"}</span>
                              )}
                            </td>
                            {effectiveAuth.role === "accountant" && (
                              <td className="p-3.5 text-center font-bold text-[15px]">
                                {c.manager?.full_name ? (
                                  <button
                                    type="button"
                                    onClick={() => openPublicManagerProfile(c.main_id, c.manager)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                  >
                                    {c.manager.full_name}
                                  </button>
                                ) : "غير محدد"}
                              </td>
                            )}
                            {isSuperAdmin && (
                              <td className="p-3.5 text-center font-bold text-slate-700">
                                {c.manager?.full_name ? (
                                  <button
                                    type="button"
                                    onClick={() => openManagerDetailsModal(c.main_id)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                  >
                                    {c.manager.full_name}
                                  </button>
                                ) : (
                                  "غير محدد"
                                )}
                              </td>
                            )}
                            {effectiveAuth.role !== "accountant" && (
                              <>
                                <td className="p-3.5 font-bold text-slate-600 font-mono">{c.phone}</td>
                                <td className="p-3.5">
                                  {/* Expiration coloring (Req 17 & Req 18) */}
                                  <span className={getDateStyleClass(c.end_date)}>
                                    {formatDate(c.end_date)}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center font-bold text-slate-700 font-mono">{formatNumber(c.subscription_value)}$</td>
                                <td className="p-3.5 text-center font-bold text-emerald-600 font-mono">{formatNumber(c.paid_amount)}$</td>
                                <td className="p-3.5 text-center w-[128px]" style={{ width: '128px' }}>
                                  <button
                                    type="button"
                                    onClick={() => copyPortalLink(c.public_access_token)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 mx-auto transition-all"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    نسخ الرابط
                                  </button>
                                </td>
                              </>
                            )}
                            <td className="p-3.5 text-center">
                              <div>
                                                                  <button
                                    type="button"
                                    onClick={() => openDailyJournal(c)}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 mx-auto transition-all"
                                    style={{ fontSize: '14px', fontFamily: 'Times New Roman' }}
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    اليومية
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openGalleryModal(c.client_id, c.company_name)}
                                    className="bg-sky-50 hover:bg-sky-100 text-sky-600 px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 mx-auto transition-all mt-1"
                                    style={{ fontSize: '12px' }}
                                  >
                                    <Image className="w-3.5 h-3.5" />
                                    المرفقات
                                  </button>
                              </div>
                            </td>
                            {effectiveAuth.role !== "accountant" && (
                              <>
                                <td className="p-3.5 text-center">
                                  <ToggleSwitch
                                    checked={c.status === "Active"}
                                    onChange={() => toggleClientStatus(c.client_id, c.status)}
                                  />
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex gap-1.5 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleAddPaymentValue(c)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 client-action-btn"
                                    >
                                      دفعة جديدة
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Tab فريق المحاسبين (Accountants Team) */}
          {activeTab === "accountants" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">قائمة المحاسبين المرخصين تحت مراقبتك</h2>
                
                {/* Search accountant input (Req 1) */}
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="ابحث باسم المحاسب أو اسم المستخدم..."
                      value={accountantSearch}
                      onChange={(e) => setAccountantSearch(e.target.value)}
                      className="w-full pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
                    />
                  </div>

                  <button
                    id="addAccBtn"
                    type="button"
                    onClick={openAddAccModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    محاسب جديد
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50 text-[15px] text-slate-400 border-b border-slate-100 font-extrabold select-none">
                      <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort("accountant_id")}>المعرف (ID)</th>
                      <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("full_name")}>اسم المحاسب الكامل</th>
                      <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("username")}>اسم المستخدم الدخول</th>
                      <th className="p-3.5 text-center">المنشآت المربوطة</th>
                      <th className="p-3.5 cursor-pointer text-center hover:bg-slate-100" onClick={() => handleSort("salary")}>الراتب المعتمد</th>
                      <th className="p-3.5 text-center">الجوال تليغرام</th>
                      <th className="p-3.5 text-center">الحالة (تعديل مباشر)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold animate-pulse">جاري تحميل المحاسبين...</td>
                      </tr>
                    ) : sortedAccountants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">لا يوجد محاسبين مسجلين متوافقين مع البحث.</td>
                      </tr>
                    ) : (
                      sortedAccountants.map((a) => {
                        const assignedNames = (a.assigned_clients || [])
                          .filter((c) => c.link_status === "Active")
                          .map((c) => {
                            const clientObj = clients.find(cl => cl.client_id === c.client_id);
                            return clientObj ? clientObj.company_name : c.client_id;
                          })
                          .join(" ، ");

                        return (
                          <tr key={a.accountant_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5 text-center text-[20px] font-bold text-slate-400 font-mono">#{a.accountant_id}</td>
                            <td className="p-3.5 font-extrabold text-slate-800">
                              <span
                                onClick={() => openEditAccountant(a)}
                                className="cursor-pointer text-[20px] text-blue-600 hover:text-blue-800 hover:underline transition-all block"
                                title="تعديل بيانات المحاسب"
                              >
                                {a.full_name}
                              </span>
                              <span className="text-[15px] text-slate-400 font-normal block mt-0.5">{a.address || "العنوان غير محدد"}</span>
                            </td>
                            <td className="p-3.5 text-center text-[17px] font-bold text-blue-600 font-mono">@{a.username}</td>
                            <td className="p-3.5 max-w-xs text-center">
                              <button
                                type="button"
                                onClick={() => openAssignClients(a)}
                                className="text-right w-full block font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all cursor-pointer truncate"
                                title="اضغط لتحديد التجار وصلاحيات الربط"
                              >
                                {assignedNames || "🔗 اضغط لربط التجار وصلاحياتهم"}
                              </button>
                            </td>
                            <td className="p-3.5 text-center font-bold font-mono text-slate-700">{formatNumber(a.salary)}$</td>
                            <td className="p-3.5 text-center font-mono text-slate-500 font-medium">
                              <div className="text-[15px]">{a.phone || "بلا هاتف"}</div>
                              <div className="text-[12px] text-blue-500 font-semibold">{a.telegram_id ? `@${a.telegram_id}` : "بلا تليجرام"}</div>
                            </td>
                            
                            {/* Interactive status clickable badge (Req 20) */}
                            <td className="p-3.5 text-center">
                              <ToggleSwitch
                                checked={a.status === "Active"}
                                onChange={() => toggleAccountantStatus(a.accountant_id, a.status)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Tab المحفظة والعمليات (Wallet and direct ledger) */}
          {activeTab === "wallet" && effectiveAuth.role !== "accountant" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total balance card */}
                <div 
                  onClick={() => setWalletLedgerTab("all")}
                  className={`bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md space-y-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    walletLedgerTab === "all" ? "ring-4 ring-emerald-300 scale-[1.01]" : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[17px] text-emerald-100 font-bold">إجمالي رصيد المحفظة الحالي</span>
                    <Wallet className="w-5 h-5 text-emerald-200" />
                  </div>
                  <h3 className="text-3xl font-extrabold font-mono tracking-tight">
                    {wallet ? formatNumber(wallet.total) : "0"}$
                  </h3>
                  <p className="text-[13px] w-[271px] text-emerald-100">يتضمن الرصيد المشحون المباشر والبونص الممنوح</p>
                </div>

                {/* Direct Cash balance */}
                <div 
                  onClick={() => setWalletLedgerTab("cash")}
                  className={`bg-white rounded-2xl p-6 border shadow-sm space-y-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    walletLedgerTab === "cash" 
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-md" 
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[17px] text-slate-500 font-bold">الرصيد المشحون الأساسي</span>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-extrabold font-mono text-slate-800">
                    {wallet ? formatNumber(wallet.balance) : "0"}$
                  </h3>
                  <p className="text-[12px] text-slate-400">الرصيد الفعلي المدفوع نقدياً والمثبت بكشف الحساب (انقر لعرض كشف الكاش)</p>
                </div>

                {effectiveAuth.role !== "accountant" && (
                <>
                {/* Bonus balance card */}
                <div 
                  onClick={() => setWalletLedgerTab("bonus")}
                  className={`bg-white rounded-2xl p-6 border shadow-sm space-y-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    walletLedgerTab === "bonus" 
                      ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 shadow-md" 
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[17px] text-slate-500 font-bold">البونص والهدايا المكتسبة</span>
                    <TrendingDown className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-extrabold font-mono text-slate-800">
                    {wallet ? formatNumber(wallet.bonus) : "0"}$
                  </h3>
                  <p className="text-[13px] text-slate-400">البونص المجاني الترويجي الممنوح من الإدارة (انقر لعرض كشف البونص)</p>
                </div>
                </>
                )}
              </div>

              {/* Direct Telegram recharge redirect */}
              {effectiveAuth.role !== "accountant" && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1.5 text-center md:text-right">
                    <h4 className="font-bold text-slate-800 text-sm">شحن رصيد المحفظة عبر المالك</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">لتفعيل تراخيص محاسبين وتجار جدد، يمكنك طلب شحن فوري وآمن مباشرة عن طريق التواصل مع المالك.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <a
                      href="https://t.me/Wisam_Al_Bani"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex justify-center items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
                    >
                      <Send className="w-4 h-4" />
                      تواصل تليجرام
                    </a>
                    <a
                      href="https://wa.me/963967733489"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
                    >
                      <Phone className="w-4 h-4" />
                      تواصل واتساب
                    </a>
                  </div>
                </div>

                {/* Transfer to another user button directly under owner recharge */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                      <ArrowLeftRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800">تحويل رصيد إلى مستخدم آخر</h5>
                      <p className="text-[11px] text-slate-500 font-medium">يمكنك تحويل جزء من رصيد الكاش بمحفظتك إلى حساب مستخدم آخر مسجل في الموقع</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferRecipient("");
                      setTransferAmount("");
                      setTransferReason("");
                      setTransferModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>تحويل لمستخدم آخر</span>
                  </button>
                </div>
              </div>
              )}

              {/* Direct Wallet Ledger with Statement Search & Filtering */}
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-blue-600" />
                      <span>فلترة وفرز كشف الحساب</span>
                    </span>
                    {(walletFilterAccount || walletFilterStartDate || walletFilterEndDate) && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        الفرز مفعل حالياً
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Linked Account Searchable Dropdown */}
                    <div className="md:col-span-5 relative space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        فرز الحساب المرتبط (ابحث أثناء الكتابة)
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="ابحث باسم الحساب..."
                          value={walletFilterAccount}
                          onFocus={() => setAccountDropdownOpen(true)}
                          onChange={(e) => {
                            setWalletFilterAccount(e.target.value);
                            setAccountDropdownOpen(true);
                          }}
                          className="w-full bg-white border border-slate-200 pr-9 pl-8 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                        {walletFilterAccount && (
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFilterAccount("");
                              setAccountDropdownOpen(false);
                            }}
                            className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Suggestions List */}
                      {accountDropdownOpen && (
                        <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFilterAccount("");
                              setAccountDropdownOpen(false);
                            }}
                            className="w-full text-right px-3.5 py-2.5 text-xs font-extrabold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-between"
                          >
                            <span>📋 جميع الحسابات (الكشف الشامل)</span>
                            {!walletFilterAccount && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                          {(() => {
                            const availableAccountsList = Array.from(
                              new Set([
                                ...clients.map((c) => c.company_name).filter(Boolean),
                                ...clients.map((c) => c.owner_name).filter(Boolean),
                                ...accountants.map((a) => a.full_name).filter(Boolean),
                                ...accountants.map((a) => `@${a.username}`).filter(Boolean),
                                ...(wallet?.history || [])
                                  .map((h: any) => h.target_name || "")
                                  .filter(Boolean),
                              ])
                            ).sort();

                            const matching = availableAccountsList.filter((accName) =>
                              accName.toLowerCase().includes((walletFilterAccount || "").toLowerCase())
                            );

                            if (matching.length === 0) {
                              return (
                                <div className="px-3 py-3 text-xs text-slate-400 text-center font-semibold">
                                  لا يوجد حساب مطابق لـ "{walletFilterAccount}"
                                </div>
                              );
                            }
                            return matching.map((accName, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setWalletFilterAccount(accName);
                                  setAccountDropdownOpen(false);
                                }}
                                className={`w-full text-right px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between ${
                                  walletFilterAccount === accName ? "bg-slate-50 text-blue-600 font-extrabold" : ""
                                }`}
                              >
                                <span>{accName}</span>
                                {walletFilterAccount === accName && (
                                  <Check className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Start Date */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        من تاريخ
                      </label>
                      <input
                        type="date"
                        value={walletFilterStartDate}
                        onChange={(e) => setWalletFilterStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </div>

                    {/* End Date */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">
                        إلى تاريخ
                      </label>
                      <input
                        type="date"
                        value={walletFilterEndDate}
                        onChange={(e) => setWalletFilterEndDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </div>

                    {/* Reset Button */}
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWalletFilterAccount("");
                          setWalletFilterStartDate("");
                          setWalletFilterEndDate("");
                          setAccountDropdownOpen(false);
                        }}
                        title="إعادة ضبط الفرز"
                        className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="md:hidden">إلغاء الفرز</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Header row with Ledger Tabs & Export button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>
                      {walletFilterAccount ? `كشف حساب الحساب المرتبط: ${walletFilterAccount}` : (
                        <>
                          {walletLedgerTab === "cash" && "كشف حساب الكاش (الرصيد المشحون الأساسي)"}
                          {walletLedgerTab === "bonus" && "كشف حساب البونص والهدايا المكتسبة"}
                          {walletLedgerTab === "all" && "كشف الحساب المباشر الشامل للمحفظة"}
                        </>
                      )}
                    </span>
                  </h3>

                  {/* Ledger Tab Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setWalletLedgerTab("cash")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        walletLedgerTab === "cash"
                          ? "bg-white text-blue-600 shadow-sm border border-blue-100 font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      💵 كشف الكاش ({wallet?.history ? wallet.history.filter((h: any) => {
                        const typeStr = String(h.type || "").toLowerCase();
                        const descStr = String(h.description || "");
                        return !(typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية"));
                      }).length : 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setWalletLedgerTab("bonus")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        walletLedgerTab === "bonus"
                          ? "bg-white text-purple-700 shadow-sm border border-purple-100 font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      🎁 كشف البونص ({wallet?.history ? wallet.history.filter((h: any) => {
                        const typeStr = String(h.type || "").toLowerCase();
                        const descStr = String(h.description || "");
                        return typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية");
                      }).length : 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setWalletLedgerTab("all")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                        walletLedgerTab === "all"
                          ? "bg-white text-emerald-700 shadow-sm border border-emerald-100 font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📋 الكشف الكلي ({wallet?.history ? wallet.history.length : 0})
                    </button>
                  </div>

                  {(() => {
                    const filteredForExport = (wallet?.history || []).filter((h: any) => {
                      const typeStr = String(h.type || "").toLowerCase();
                      const descStr = String(h.description || "");
                      const isBonus = typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية");
                      if (walletLedgerTab === "cash" && isBonus) return false;
                      if (walletLedgerTab === "bonus" && !isBonus) return false;

                      const txDate = h.created_at ? String(h.created_at).substring(0, 10) : "";
                      if (walletFilterStartDate && txDate && txDate < walletFilterStartDate) return false;
                      if (walletFilterEndDate && txDate && txDate > walletFilterEndDate) return false;

                      if (walletFilterAccount.trim()) {
                        const q = walletFilterAccount.trim().toLowerCase();
                        const inDesc = descStr.toLowerCase().includes(q);
                        const inTarget = String(h.target_name || "").toLowerCase().includes(q);
                        const inType = String(h.target_type || "").toLowerCase().includes(q);
                        if (!inDesc && !inTarget && !inType) return false;
                      }

                      return true;
                    });

                    if (filteredForExport.length === 0) return null;

                    return (
                      <ExportButton
                        title={
                          walletFilterAccount
                            ? `كشف حساب - ${walletFilterAccount}`
                            : walletLedgerTab === "cash"
                            ? "كشف حساب الكاش (الرصيد المشحون)"
                            : walletLedgerTab === "bonus"
                            ? "كشف حساب البونص والهدايا"
                            : "كشف حساب محفظة المدير الشامل"
                        }
                        filename={
                          walletFilterAccount
                            ? `كشف_حساب_${walletFilterAccount}`
                            : walletLedgerTab === "cash"
                            ? "كشف_حساب_الكاش"
                            : walletLedgerTab === "bonus"
                            ? "كشف_حساب_البونص"
                            : "كشف_حساب_المحفظة_الشامل"
                        }
                        columns={[
                          { header: "رقم الحركة", key: "tx_id" },
                          { header: "نوع الحركة", key: "type" },
                          { header: "المبلغ ($)", key: "amount", formatter: (val) => formatNumber(val) },
                          { header: "البيان والتفاصيل", key: "description" },
                          { header: "تاريخ الحركة", key: "created_at", formatter: (val) => formatDate(val) },
                        ]}
                        data={filteredForExport}
                        elementId="managerWalletLedgerContainer"
                      />
                    );
                  })()}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto" id="managerWalletLedgerContainer">
                  <table className="w-full text-right border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 border-b border-slate-100 font-extrabold">
                        <th className="p-3.5">الرقم</th>
                        <th className="p-3.5">نوع الحركة المالية</th>
                        <th className="p-3.5">نوع الرصيد</th>
                        <th className="p-3.5">المبلغ</th>
                        <th className="p-3.5">الرصيد التراكمي للحساب</th>
                        <th className="p-3.5">التفاصيل والبيان المعتمد</th>
                        <th className="p-3.5">تاريخ الحركة</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100 font-medium">
                      {wallet?.history && wallet.history.length > 0 ? (
                        (() => {
                          const filteredHistory = wallet.history.filter((h: any) => {
                            const typeStr = String(h.type || "").toLowerCase();
                            const descStr = String(h.description || "");
                            const isBonus = typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية");
                            if (walletLedgerTab === "cash" && isBonus) return false;
                            if (walletLedgerTab === "bonus" && !isBonus) return false;

                            const txDate = h.created_at ? String(h.created_at).substring(0, 10) : "";
                            if (walletFilterStartDate && txDate && txDate < walletFilterStartDate) return false;
                            if (walletFilterEndDate && txDate && txDate > walletFilterEndDate) return false;

                            if (walletFilterAccount.trim()) {
                              const q = walletFilterAccount.trim().toLowerCase();
                              const inDesc = descStr.toLowerCase().includes(q);
                              const inTarget = String(h.target_name || "").toLowerCase().includes(q);
                              const inType = String(h.target_type || "").toLowerCase().includes(q);
                              if (!inDesc && !inTarget && !inType) return false;
                            }

                            return true;
                          });

                          if (filteredHistory.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                  لا توجد حركات تطابق نتائج الفرز المحددة.
                                </td>
                              </tr>
                            );
                          }

                          let runningSum = 0;
                          const historyWithBal = [...filteredHistory].reverse().map(h => {
                            const amount = parseFloat(h.amount || 0);
                            runningSum += amount;
                            return { ...h, calculatedBal: runningSum, numericAmt: amount };
                          }).reverse();

                          return historyWithBal.map((h: any, i: number) => {
                            const amount = h.numericAmt;
                            const displayBal = h.calculatedBal;
                            const typeStr = String(h.type || "").toLowerCase();
                            const descStr = String(h.description || "");
                            const isBonus = typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص") || descStr.includes("هدية");
                            return (
                              <tr 
                                key={i} 
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                onClick={() => setSelectedWalletTx({ ...h, displayBal, index: filteredHistory.length - i, amount })}
                              >
                                <td className="p-3.5 text-slate-400 font-bold font-mono">#{filteredHistory.length - i}</td>
                                <td className="p-3.5">
                                  {isBonus ? (
                                    amount >= 0 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">🎁 بونص (قبض)</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">📤 دفع (من البونص)</span>
                                    )
                                  ) : (
                                    amount >= 0 ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">📥 قبض (كاش)</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">📤 دفع (كاش)</span>
                                    )
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isBonus ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                    {isBonus ? "🎁 بونص" : "💵 كاش"}
                                  </span>
                                </td>
                                <td className="p-3.5 font-extrabold font-mono text-slate-800">{formatNumber(h.amount)}$</td>
                                <td className="p-3.5 font-extrabold font-mono text-blue-600" dir="ltr">{formatNumber(displayBal)}$</td>
                                <td className="p-3.5 text-slate-600 font-medium">{h.description}</td>
                                <td className="p-3.5 text-slate-400 font-mono text-[11px]">{formatDate(h.created_at || h.date)}</td>
                              </tr>
                            );
                          });
                        })()
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">لا توجد حركات محفظة مسجلة بعد.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. Tab التقارير والتحليل المالي (Req 10) */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">تقارير الرقابة والتحليل المالي المتقدم</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <span className="text-[15px] text-slate-400 font-bold block">إجمالي المنشآت</span>
                  <div className="text-2xl font-extrabold text-slate-800 font-mono">{formatNumber(clients.length)}</div>
                  <span className="text-[15px] text-emerald-600 font-bold">● {formatNumber(clients.filter(c => c.status === "Active").length)} نشط حالياً</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <span className="text-[15px] text-slate-400 font-bold block">فريق المحاسبين</span>
                  <div className="text-2xl font-extrabold text-slate-800 font-mono">{formatNumber(accountants.length)}</div>
                  <span className="text-[15px] text-blue-600 font-bold">● {formatNumber(accountants.filter(a => a.status === "Active").length)} نشط</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <span className="text-[15px] text-center w-[166.6px] -mr-[18px] text-slate-400 font-bold block mb-2.5">إجمالي الاشتراكات الشهرية للتجار</span>
                  <div className="text-2xl font-extrabold text-blue-600 font-mono">
                    ${formatNumber(clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0))}
                  </div>
                  <span className="text-[14px] text-center leading-[15px] text-slate-400 block">إجمالي قيمة التراخيص</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <span className="text-[15px] text-center text-slate-400 font-bold block">إجمالي المحصل الفعلي</span>
                  <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                    ${formatNumber(clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0))}
                  </div>
                  <span className="text-[15px] text-slate-400">نسبة التحصيل: {clients.length > 0 ? Math.round((clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0) / (clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) || 1)) * 100) : 0}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDiffReportModal(true)}
                  className="bg-red-50/80 hover:bg-red-50 border border-red-100 p-5 rounded-2xl shadow-sm text-right space-y-2 transition-all hover:scale-[1.02] active:scale-[0.98] group flex flex-col justify-between w-full"
                >
                  <div className="space-y-1 w-full text-center">
                    <span className="text-[15px] text-center w-[162.6px] -mr-[17px] text-red-500 font-bold block">فروقات الاشتراكات غير المحصلة (اضغط للتفاصيل)</span>
                    <div className="text-2xl font-extrabold text-red-600 font-mono">
                      ${formatNumber(clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) - clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0))}
                    </div>
                  </div>
                  <span className="text-[15px] text-center w-[181px] -mr-[25px] pr-2.5 text-red-600 font-extrabold bg-white py-1 rounded-lg border border-red-100 group-hover:bg-red-100/50 block">
                    📊 تقرير العجز والتحكم المباشر
                  </span>
                </button>
              </div>

              {/* Graphical representation ratios */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">مستويات التفعيل ونسب الرصد والرقابة</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-[18px] text-slate-600">نسبة كفاءة تحصيل الاشتراكات من المنشآت</span>
                      <span className="text-blue-600 font-mono">
                        {clients.length > 0 ? Math.round((clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0) / (clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) || 1)) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${clients.length > 0 ? Math.min(100, Math.round((clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0) / (clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) || 1)) * 100)) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-[18px] text-slate-600">نسبة تفعيل فريق المحاسبين المتاحين للعمل</span>
                      <span className="text-emerald-600 font-mono">
                        {accountants.length > 0 ? Math.round((accountants.filter(a => a.status === "Active").length / accountants.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${accountants.length > 0 ? Math.round((accountants.filter(a => a.status === "Active").length / accountants.length) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Tab بروفايلي العام (My Professional Profile) */}
          {activeTab === "profile" && effectiveAuth.role !== "accountant" && (
            <div className="space-y-6">
            
            {/* Change Password Section */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">أمان الحساب (تغيير كلمة المرور)</h2>
                    <p className="text-[15px] text-slate-400">تغيير كلمة مرور حسابك الحالي</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md"
                >
                  تغيير كلمة المرور
                </button>
              </div>
            </div>

            {effectiveAuth.role !== "accountant" && (
            <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">إدارة البروفايل العام وربط قنوات التواصل</h2>
                  <p className="text-[15px] text-slate-400">تحديث النبذة ومجالات تخصصك المحاسبي للظهور في الدليل المفتوح للعملاء والزوار</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[17px] font-bold text-slate-600 block">النبذة المهنية والخبرة</label>
                  <textarea
                    rows={4}
                    placeholder="اكتب نبذة مهنية تصف تخصصك، خبرتك السابقة والمجالات المحاسبية التي تخدمها..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">رابط فيسبوك (Facebook URL)</label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">رابط انستغرام (Instagram URL)</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">رابط لينكد إن (LinkedIn URL)</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">الخدمات المحاسبية المقدمة</label>
                  <input
                    type="text"
                    placeholder="مثال: مراجعة ضريبية، إدارة حسابات عامة، تأسيس شركات"
                    value={services}
                    onChange={(e) => setServices(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">سنوات الخبرة الفعلية</label>
                  <input
                    type="number"
                    placeholder="مثال: 10"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[17px] font-bold text-slate-600 block">اللغات المعتمدة</label>
                  <input
                    type="text"
                    placeholder="مثال: العربية، الإنجليزية"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="profile_is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="profile_is_public" className="text-[18px] font-bold text-slate-700 cursor-pointer">
                  تفعيل ظهور الملف الشخصي كبروفايل رسمي معتمد في دليل المحاسبين العام للزوار والباحثين عن مكاتب تدقيق.
                </label>
              </div>

              {/* Text changed to "حفظ البروفايل" as requested (Req 5) */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[20px] font-bold transition-all shadow-md"
              >
                {submitting ? "جاري الحفظ..." : "حفظ البروفايل"}
              </button>
            </form>
            )}
            </div>
          )}




          {activeTab === "packages" && isSuperAdmin && (
            <PackagesTab auth={effectiveAuth} />
          )}

          {activeTab === "settings" && isSuperAdmin && (
            <SettingsTab auth={effectiveAuth} />
          )}
          {/* 7. Tab اشتراكات المدراء (Manager Admins subscription tracker - Super Admin Only) */}
          {activeTab === "admins" && isSuperAdmin && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">قائمة اشتراكات وحسابات المدراء الماليين المعتمدين بالمنصة</h2>
                
                {/* Search manager input (Req 1) */}
                <div className="relative w-full md:w-64">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="ابحث باسم المدير المالي..."
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    className="w-full pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 border-b border-slate-100 font-extrabold select-none">
                      <th className="p-3.5 text-[15px] text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort("main_id")}>ID</th>
                      <th className="p-3.5 text-[15px] text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort("full_name")}>المدير المالي</th>
                      <th className="p-3.5 text-[15px] text-center">المنشآت</th>
                      <th className="p-3.5 text-[15px] text-center">المحاسبين</th>
                      <th className="p-3.5 text-[15px] text-center">المحفظة ($)</th>
                      <th className="p-3.5 text-[15px] text-center">حالة الحساب</th>
                      <th className="p-3.5 text-[15px] text-center">الإجراءات والتحكم الآمن</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                    {sortedAdmins.map((adm) => (
                      <tr key={adm.main_id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 text-[20px] text-center text-slate-400 font-bold">#{adm.main_id}</td>
                        <td 
                          className="p-3.5 font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => openManagerDetailsModal(adm.main_id)}
                        >
                          <div className="flex flex-col">
                            <span className="text-[18px]">{adm.full_name}</span>
                            <span className="text-[15px] text-slate-400 font-semibold block mt-0.5">@{adm.username}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-blue-600">{adm.client_count}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-600">{adm.accountant_count}</td>
                        
                        {/* Elegant display of current wallet balance (Req 9) */}
                        <td className="p-3.5 text-center font-mono">
                          <span className="block text-emerald-600 font-bold">رصيد: {formatNumber(adm.wallet_balance)}$</span>
                          {adm.username !== superAdminUsername && (
                            <span className="block text-[15px] text-slate-400">بونص: {formatNumber(adm.wallet_bonus)}$</span>
                          )}
                        </td>
                        
                        <td className="p-3.5 text-center">
                          {adm.username !== superAdminUsername ? (
                            <ToggleSwitch
                              checked={adm.status === "Active"}
                              onChange={() => toggleAdminStatus(adm.main_id, adm.status)}
                            />
                          ) : (
                            <span className="text-slate-400 font-bold">---</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {adm.username !== superAdminUsername ? (
                              <button
                                type="button"
                                onClick={() => openChargeModal(adm)}
                                className="bg-emerald-600 hover:bg-emerald-700 w-[116px] text-white text-[15px] px-2.5 py-1.5 rounded-lg font-bold transition-all shadow-sm"
                              >
                                💰 شحن المحفظة
                              </button>
                            ) : (
                               <span className="text-slate-400 font-bold">---</span>
                            )}
                            {/* Deactivate and suspend button has been removed as requested (Req 8) */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. Tab صحة النظام والمراقبة (System Health & Audit Feed - Super Admin Only) */}
          {activeTab === "health" && isSuperAdmin && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                مراقبة صحة النظام وقاعدة البيانات
              </h2>

              {/* Supabase Free Plan Usage Summary (Req 13) */}
              <div className="bg-[#1c1c1c] rounded-2xl border border-[#2e2e2e] shadow-lg overflow-hidden text-white" dir="ltr">
                <div className="p-6 border-b border-[#2e2e2e]">
                  <h3 className="text-[20px] font-bold mb-2">Usage Summary</h3>
                  <p className="text-[15px] text-gray-400 leading-relaxed">
                    مراقبة بيانات Supabase (Free Plan) بشكل دائم ومباشر: البيانات المتاحة والمستخدمة والمتبقية ونسب مئوية.<br/>
                    You have not exceeded your Free Plan quota in this billing cycle.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Database Size */}
                  <div className="p-6 border-b md:border-r border-[#2e2e2e] flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Database Size &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.databaseSize?.usedMB || 0) / 512) * 100}%, transparent 0)` }}></div>
                          <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {((healthData?.supabaseUsage?.databaseSize?.usedMB || 0) / 1024).toFixed(3)} / 0.5 GB ({(((healthData?.supabaseUsage?.databaseSize?.usedMB || 0) / 512) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Egress */}
                  <div className="p-6 border-b border-[#2e2e2e] flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Egress &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                           <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.egress?.usedMB || 0) / 5120) * 100}%, transparent 0)` }}></div>
                           <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {((healthData?.supabaseUsage?.egress?.usedMB || 0) / 1024).toFixed(3)} / 5 GB ({(((healthData?.supabaseUsage?.egress?.usedMB || 0) / 5120) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Monthly Active Users */}
                  <div className="p-6 border-b md:border-r border-[#2e2e2e] flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Monthly Active Users &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.mau?.used || 0) / 50000) * 100}%, transparent 0)` }}></div>
                          <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {healthData?.supabaseUsage?.mau?.used || 0} / 50,000 MAU ({(((healthData?.supabaseUsage?.mau?.used || 0) / 50000) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Storage Size */}
                  <div className="p-6 border-b border-[#2e2e2e] flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Storage Size &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.storage?.usedMB || 0) / 1024) * 100}%, transparent 0)` }}></div>
                          <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {((healthData?.supabaseUsage?.storage?.usedMB || 0) / 1024).toFixed(3)} / 1 GB ({(((healthData?.supabaseUsage?.storage?.usedMB || 0) / 1024) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Realtime Concurrent Peak Connections */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-[#2e2e2e] flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Realtime Concurrent Peak Connections &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.realtimePeak?.used || 0) / 200) * 100}%, transparent 0)` }}></div>
                          <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {healthData?.supabaseUsage?.realtimePeak?.used || 0} / 200 ({(((healthData?.supabaseUsage?.realtimePeak?.used || 0) / 200) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Realtime Messages */}
                  <div className="p-6 flex items-center justify-between hover:bg-[#252525] transition-colors">
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[16px] font-semibold text-gray-200">Realtime Messages &gt;</span>
                        <div className="relative w-5 h-5 rounded-full border-2 border-[#3e3e3e] flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `conic-gradient(#10b981 ${((healthData?.supabaseUsage?.realtimeMessages?.used || 0) / 2000000) * 100}%, transparent 0)` }}></div>
                          <div className="absolute inset-[2px] bg-[#1c1c1c] rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-[15px] text-gray-400 block font-mono">
                        {(healthData?.supabaseUsage?.realtimeMessages?.used || 0).toLocaleString()} / 2,000,000 ({(((healthData?.supabaseUsage?.realtimeMessages?.used || 0) / 2000000) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              

              {/* Sub-tabs for Health Section */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mt-8">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setHealthSubTab("storage")}
                    className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${healthSubTab === "storage" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                  >
                    <Database className="w-4 h-4 inline-block ml-1" />
                    استخدام المساحة للمستخدمين (التجار)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHealthSubTab("audit")}
                    className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${healthSubTab === "audit" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                  >
                    سجل تدقيق الأمان والعمليات المباشرة (System Audit Trail)
                  </button>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4" />
                  {isExporting ? "جاري التصدير..." : "نسخة احتياطية كاملة"}
                </button>
              </div>

              {/* Storage Usage per Client */}
              {healthSubTab === "storage" && (
              <div className="space-y-3 pt-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-extrabold">
                      <tr>
                        <th className="p-3.5 rounded-tr-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("clientId")}>كود التاجر {storageSortConfig.key === "clientId" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                        <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("companyName")}>المنشأة التجارية {storageSortConfig.key === "companyName" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                        <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("managerUsername")}>المدير المالي {storageSortConfig.key === "managerUsername" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                        <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("usedMb")}>المساحة المستخدمة {storageSortConfig.key === "usedMb" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                        <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("remainingMb")}>المساحة المتبقية {storageSortConfig.key === "remainingMb" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                        <th className="p-3.5 rounded-tl-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleStorageSort("percentage")}>النسبة المئوية {storageSortConfig.key === "percentage" && (storageSortConfig.direction === "asc" ? "↑" : "↓")}</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100 font-medium">
                      {sortedStorageUsage.length > 0 ? (
                        sortedStorageUsage.map((user: any) => (
                          <tr key={user.clientId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5 text-slate-400 font-bold">#{user.clientId}</td>
                            <td className="p-3.5 font-bold text-slate-800">
                              <span
                                className="cursor-pointer text-blue-600 hover:underline transition-all"
                                onClick={() => {
                                  const c = clients.find(cl => cl.client_id === user.clientId);
                                  if (c) setSelectedClientForCard(c);
                                }}
                              >
                                {user.companyName}
                              </span>
                            </td>
                            <td className="p-3.5">@{user.managerUsername}</td>
                            <td className="p-3.5 text-emerald-600 font-bold font-mono">{user.usedMb} MB</td>
                            <td className="p-3.5 text-slate-500 font-bold font-mono">{user.remainingMb} MB</td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold font-mono w-10 text-left">{user.percentage}%</span>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${user.percentage}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">لا يوجد بيانات مساحة حالياً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Audit trail feed */}
              {healthSubTab === "audit" && (
              <div className="space-y-3 pt-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 border-b border-slate-100 font-extrabold">
                        <th className="p-3.5">الرقم</th>
                        <th className="p-3.5">المستخدم المسؤول</th>
                        <th className="p-3.5">نوع العملية والحدث</th>
                        <th className="p-3.5">الجدول المتأثر</th>
                        <th className="p-3.5">توقيت الحدث</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-700 divide-y divide-slate-100 font-medium font-mono">
                      {healthData?.auditLogs && healthData.auditLogs.length > 0 ? (
                        healthData.auditLogs.map((log: any) => (
                          <tr key={log.audit_id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 text-slate-400 font-bold">#{log.audit_id}</td>
                            <td className="p-3.5 font-bold">
                              {log.user_role === "admin" ? "💼 مدير مالي" : "👨‍💼 محاسب"}
                              <span className="text-[10px] text-slate-400 block font-normal">(User ID: {log.user_id})</span>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-extrabold text-slate-700">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5 font-semibold text-slate-500">{log.table_name || "-"}</td>
                            <td className="p-3.5 text-slate-400 text-[11px]">{formatDate(log.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">لا توجد سجلات تدقيق حالية بالمنصة.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 p-6 text-center text-xs border-t border-slate-800 mt-12 w-full">
        AccuFlow© 2026 - منصة ربط المنشآت المحاسبية والرقابة السحابية.
      </footer>

      
      {/* MODAL - Wallet Transaction Details */}
      {selectedWalletTx && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedWalletTx(null);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                تفاصيل الحركة المالية رقم #{selectedWalletTx.index}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedWalletTx(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1 text-right">
                  <span className="text-slate-500 text-[11px] font-bold block">المبلغ</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-800" dir="ltr">{formatNumber(selectedWalletTx.amount)}$</span>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-slate-500 text-[11px] font-bold block">الرصيد التراكمي حينها</span>
                  <span className="text-lg font-bold font-mono text-blue-600" dir="ltr">{formatNumber(selectedWalletTx.displayBal)}$</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">نوع الحركة</label>
                <div className="inline-block px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-50">
                  <span className={selectedWalletTx.amount >= 0 ? "text-emerald-600" : "text-red-500"}>
                    {selectedWalletTx.amount >= 0 ? "📥 إيداع / قبض" : "📤 سحب / دفع"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">تاريخ ووقت الحركة</label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-sm text-slate-700">
                  {formatDate(selectedWalletTx.created_at || selectedWalletTx.date)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">التفاصيل والبيان المعتمد</label>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedWalletTx.description}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedWalletTx(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Custom Recording Payment Modal instead of prompt (Req 2) */}
      {paymentModalOpen && paymentClient && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPaymentModalOpen(false);
              setPaymentClient(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-auto cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">تأكيد تسجيل دفعة إضافية للتاجر</h3>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setPaymentClient(null);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed font-medium">
              <div>🏥 <b>المنشأة المستلمة:</b> {paymentClient.company_name}</div>
              <div>💰 <b>إجمالي قيمة الترخيص:</b> {formatNumber(paymentClient.subscription_value)}$</div>
              <div>📥 <b>المدفوع الحالي مسبقاً:</b> {formatNumber(paymentClient.paid_amount)}$</div>
              <div className="text-blue-600">📊 <b>المتبقي غير المدفوع:</b> {formatNumber(parseFloat(parseCommasToNumberString(String(paymentClient.subscription_value?.toString() || "0"))) - parseFloat(parseCommasToNumberString(String(paymentClient.paid_amount?.toString() || "0"))))}$</div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">قيمة الدفعة الإضافية المستلمة ($)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 5,000"
                  value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onBlur={(e) => setPaymentAmount(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {submitting ? "جاري التسجيل..." : "تأكيد وإيداع المحفظة"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setPaymentClient(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Add/Edit Merchant Client */}
      {clientModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setClientModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-lg space-y-4 text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editId ? "تعديل بيانات المنشأة والتاجر" : "إضافة منشأة محاسبية وتفعيل رقابي جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">اسم المنشأة أو التاجر</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بقالة الياسمين"
                    value={cCompanyName}
                    onChange={(e) => setCCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">رقم الجوال الفعال (للدخول)</label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل رقم الجوال المباشر للتاجر"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">تاريخ تفعيل الرقابة والترخيص</label>
                  <input
                    type="date"
                    required
                    value={cStartDate}
                    onChange={(e) => setCStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    required
                    value={cEndDate}
                    onChange={(e) => setCEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    الاشتراك الشهري ($) {editId ? "(مبلغ ثابت لا يمكن تعديله)" : "(يُدخل لأول مرة عند إضافة التاجر)"}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editId}
                    readOnly={!!editId}
                    placeholder="أدخل قيمة الاشتراك الشهري المتفق عليه..."
                    value={cSubValue}
                    onChange={(e) => setCSubValue(e.target.value)}
                    onBlur={(e) => setCSubValue(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold ${
                      editId ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-slate-50 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400">
                    {editId
                      ? "قيمة الاشتراك الشهري ثابتة ومحددة عند إنشاء التاجر أول مرة ولا يمكن تغييرها."
                      : "عند حفظ البطاقة لأول مرة، سيتم تثبيت الاشتراك وتنزيل هذا المبلغ كذمة ومستحق على التاجر (سند صرف تلقائي)."}
                  </p>
                </div>

              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">العنوان الجغرافي التفصيلي</label>
                <input
                  type="text"
                  placeholder="مثال: دمشق - الميدان - بجانب المشفى"
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">بيان ملحوظات خاصة</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات تفصيلية..."
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ وحيازة التاجر بالرقابة"}
                </button>
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Add/Edit Accountant with Merchant Search (Req 16) */}
      {accModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setAccModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-lg space-y-4 text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editId ? "تعديل بيانات المحاسب" : "إضافة وترخيص محاسب جديد بالمنظومة"}
              </h3>
              <button
                type="button"
                onClick={() => setAccModalOpen(false)}

                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountant} className="space-y-4 text-right">
              {!editId ? (
                // Adding Accountant
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-xs font-semibold text-amber-700 leading-relaxed mb-4">
                  💡 أدخل اسم المستخدم الخاص بزميلك (الذي سجل مسبقاً كمدير). سيقوم النظام فوراً بربط حسابه تلقائياً كمحاسب مساعد لديك واستيراد اسمه الكامل، هاتفه، ورقم تليجرامه!
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editId && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اسم المحاسب الكامل</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد عبد الله"
                      disabled={!!editId}
                      value={aFullName}
                      onChange={(e) => setAFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    {!editId ? "اسم المستخدم لحساب المدير (المحاسب المساعد)" : "اسم المستخدم"}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editId}
                    placeholder="أدخل اسم المستخدم بدقة"
                    value={aUsername}
                    onChange={(e) => setAUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-60"
                  />
                </div>

                {editId && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">رقم جوال المحاسب</label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم جوال المحاسب"
                      value={aPhone}
                      onChange={(e) => setAPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">الراتب الشهري المعتمد ($)</label>
                  <input
                    type="text"
                    value={aSalary}
                      onChange={(e) => setASalary(e.target.value)}
                      onBlur={(e) => setASalary(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">معرف تليجرام الشخصي (بدون @)</label>
                  <input
                    type="text"
                    placeholder="مثال: ahmad_telegram"
                    value={aTelegramId}
                    onChange={(e) => setATelegramId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">العنوان الشخصي للمحاسب</label>
                  <input
                    type="text"
                    placeholder="مثال: حي الروضة"
                    value={aAddress}
                    onChange={(e) => setAAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {editId && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h4 className="text-sm font-extrabold text-slate-800">الحركات المالية بين المدير والمحاسب</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openAccTransfer('pay')} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-bold transition-all">صرف للمحاسب</button>
                    <button type="button" onClick={() => openAccStatement()} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold transition-all">كشف الحساب</button>
                  </div>
                </div>
              )}

              {!editId && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">تحديد المنشآت المحجوزة للمحاسب فورياً</label>
                    <input
                      type="text"
                      placeholder="ابحث عن تاجر لربطه..."
                      value={accMerchantSearch}
                      onChange={(e) => setAccMerchantSearch(e.target.value)}
                      className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] w-40"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2.5 space-y-1.5 bg-slate-50">
                    {filterAccMerchants.map((c) => (
                      <label key={c.client_id} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={aSelectedClients.includes(c.client_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setASelectedClients([...aSelectedClients, c.client_id]);
                            } else {
                              setASelectedClients(aSelectedClients.filter((id) => id !== c.client_id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span>{c.company_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {submitting ? "جاري الترخيص..." : "حفظ المحاسب وتفعيل حسابه"}
                </button>
                <button
                  type="button"
                  onClick={() => setAccModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL - Accountant Transfer */}
      {showAccTransferModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAccTransferModal(false); }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {accTransferAction === "pay" ? "صرف مبلغ للمحاسب" : "قبض مبلغ من المحاسب"}
              </h3>
              <button type="button" onClick={() => setShowAccTransferModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAccTransferSubmit} className="space-y-4 text-right">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">المبلغ ($)</label>
                <input
                  type="text"
                  required
                  value={accTransferAmount}
                  onChange={(e) => setAccTransferAmount(parseCommasToNumberString(e.target.value))}
                  onBlur={(e) => setAccTransferAmount(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">سبب الحركة</label>
                <input
                  type="text"
                  required
                  value={accTransferNotes}
                  onChange={(e) => setAccTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
              >
                {submitting ? "جاري التنفيذ..." : "تأكيد العملية"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Accountant Statement */}
      {showAccStatementModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAccStatementModal(false); }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                كشف الحساب — {accStatementAccountant?.full_name || "المحاسب"}
              </h3>
              <div className="flex items-center gap-2">
                {accStatementData.length > 0 && (
                  <ExportButton
                    title={`كشف حساب المحاسب - ${accStatementAccountant?.full_name || ""}`}
                    filename={`كشف_حساب_المحاسب_${accStatementAccountant?.full_name || "المساعد"}`}
                    columns={[
                      { header: "التاريخ", key: "created_at", formatter: (val) => formatDate(val) },
                      { header: "البيان", key: "description" },
                      { header: "النوع", key: "tx_type" },
                      { header: "المبلغ ($)", key: "amountForAccountant", formatter: (val) => formatNumber(val) },
                      { header: "الرصيد التراكمي ($)", key: "running_balance", formatter: (val) => formatNumber(val) },
                    ]}
                    data={accStatementData}
                    elementId="accountantStatementModalContainer"
                  />
                )}
                <button type="button" onClick={() => setShowAccStatementModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div id="accountantStatementModalContainer">
              <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold">
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5">النوع</th>
                  <th className="p-2.5">المبلغ</th>
                  <th className="p-2.5">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody>
                {accStatementData.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-400">لا توجد حركات مسجلة بعد.</td></tr>
                ) : accStatementData.map((tx: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="p-2.5 text-slate-500">{formatDate(tx.created_at)}</td>
                    <td className="p-2.5 text-slate-700 font-semibold">{tx.description}</td>
                    <td className={`p-2.5 font-bold ${tx.tx_type === "صرف" ? "text-red-600" : "text-emerald-600"}`}>{tx.tx_type}</td>
                    <td className="p-2.5 font-mono font-bold">{formatNumber(tx.amountForAccountant)}$</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700">{formatNumber(tx.running_balance)}$</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Accountant Clients Permissions Assignment Modal with Search (Req 16) */}
      {assignModalOpen && assignAccId && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAssignModalOpen(false);
              setAssignAccId(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-auto cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">تحديث منافذ وصلاحيات المحاسب على المنشآت</h3>
              
              <div className="flex items-center gap-1.5">
                {/* Filter search in assignments modal */}
                <input
                  type="text"
                  placeholder="ابحث عن منشأة..."
                  value={accMerchantSearch}
                  onChange={(e) => setAccMerchantSearch(e.target.value)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setAssignAccId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50">
              {filterAccMerchants.map((c) => (
                <label key={c.client_id} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={assignSelectedIds.includes(c.client_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAssignSelectedIds([...assignSelectedIds, c.client_id]);
                      } else {
                        setAssignSelectedIds(assignSelectedIds.filter((id) => id !== c.client_id));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>{c.company_name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSavePermissions}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                تطبيق الصلاحيات وتحديث المنافذ
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignModalOpen(false);
                  setAssignAccId(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Super Admin Wallet Recharge */}
      {chargeModalOpen && chargeTargetId && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setChargeModalOpen(false);
              setChargeTargetId(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-auto cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">إدارة رصيد محفظة المدير المالي</h3>
              <button
                type="button"
                onClick={() => {
                  setChargeModalOpen(false);
                  setChargeTargetId(null);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveRecharge} className="space-y-4 text-right">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">المدير المستهدف</span>
                <span className="text-xs font-extrabold text-slate-800">{chargeTargetName}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">نوع العملية المالية</label>
                <select
                  value={chargeActionType}
                  onChange={(e) => setChargeActionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="charge">💰 شحن الرصيد الفعلي للمحفظة</option>
                  <option value="bonus">🎁 إضافة رصيد بونص/هدية</option>
                  <option value="deduct_balance">💸 خصم من الرصيد الفعلي للمحفظة</option>
                  <option value="deduct_bonus">📉 خصم من رصيد البونص/الهدايا</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {chargeActionType.startsWith("deduct") ? "القيمة المراد خصمها ($)" : "القيمة المراد إضافتها ($)"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 100"
                  value={chargeAmt}
                      onChange={(e) => setChargeAmt(e.target.value)}
                      onBlur={(e) => setChargeAmt(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">البيان / تفاصيل السند</label>
                <input
                  type="text"
                  required
                  placeholder={
                    chargeActionType === "charge" ? "مثال: دفعة نقدية مستلمة كاش" :
                    chargeActionType === "bonus" ? "مثال: مكافأة الأداء الشهري المتميز" :
                    chargeActionType === "deduct_balance" ? "مثال: تسوية رصيد خاطئ" :
                    "مثال: انتهاء صلاحية عرض البونص"
                  }
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all ${
                    chargeActionType.startsWith("deduct") 
                      ? "bg-rose-600 hover:bg-rose-700" 
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {submitting 
                    ? "جاري المعالجة..." 
                    : chargeActionType.startsWith("deduct") 
                      ? "تأكيد خصم الرصيد" 
                      : "تأكيد إضافة الرصيد"
                  }
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChargeModalOpen(false);
                    setChargeTargetId(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Transfer Funds to Another User */}
      {transferModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget && !transferLoading) {
              setTransferModalOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-auto cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">تحويل رصيد لمستخدم آخر</h3>
                  <p className="text-[11px] text-slate-400 font-medium">خصم من رصيد الكاش بمحفظتك وإضافته لحساب المستلم</p>
                </div>
              </div>
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUserWalletTransfer} className="space-y-4 text-right">
              {/* Balance Badge */}
              <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">رصيدك المتاح بالكاش:</span>
                <span className="text-sm font-extrabold font-mono text-purple-700">
                  {wallet ? formatNumber(wallet.balance) : "0"}$
                </span>
              </div>

              {/* Recipient Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  اسم المستخدم المحول له (المستلم) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ادخل اسم المستخدم بالضبط، مثال: user123"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-right"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  يجب أن يكون اسم مستخدم مسجل مسبقاً في الموقع.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  المبلغ المراد تحويله ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="مثال: 50"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  سبب التحويل / البيان <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="اكتب سبب التحويل، مثال: سلفة نقدية أو تسديد مقابل خدمة..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {transferLoading ? (
                    <span>جاري التحويل...</span>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>دفع وتحويل الآن</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={transferLoading}
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Journal Transaction Details */}
      {selectedJournalTx && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedJournalTx(null);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-[70] overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                تفاصيل السند المالي رقم #{selectedJournalTx.tx_id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedJournalTx(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1 text-right">
                  <span className="text-slate-500 text-[11px] font-bold block">المبلغ</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-800" dir="ltr">{formatNumber(selectedJournalTx.amount)} {selectedJournalTx.currency}</span>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-slate-500 text-[11px] font-bold block">الرصيد التراكمي حينها</span>
                  <span className="text-lg font-bold font-mono text-blue-600" dir="ltr">{formatNumber(selectedJournalTx.displayBal)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">نوع الحركة</label>
                <div className="inline-block px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-50">
                  <span className={selectedJournalTx.isPositive ? "text-emerald-600" : "text-red-500"}>
                    {selectedJournalTx.isPositive ? "📥 سند قبض" : "📤 سند صرف"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">تاريخ ووقت الحركة</label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-sm text-slate-700">
                  {formatDate(selectedJournalTx.created_at || selectedJournalTx.date)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">التفاصيل والبيان المعتمد</label>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedJournalTx.notes || "-"}
                </div>
              </div>
              
              {selectedJournalTx.attachments && selectedJournalTx.attachments.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-slate-500 text-xs font-bold block">المرفق (إن وجد)</label>
                  <button
                    onClick={() => openAttachment(selectedJournalTx.attachments![0].file_data, selectedJournalTx.attachments![0].file_name)}
                    className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2.5 rounded-xl transition-all"
                  >
                    عرض المرفق / الإيصال
                  </button>
                </div>
              ) : selectedJournalTx.receipt_url && selectedJournalTx.receipt_url !== "لا يوجد مرفق" ? (
                <div className="space-y-2">
                  <label className="text-slate-500 text-xs font-bold block">المرفق (إن وجد)</label>
                  <a
                    href={selectedJournalTx.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2.5 rounded-xl transition-all"
                  >
                    عرض المرفق / الإيصال
                  </a>
                </div>
              ) : null}
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedJournalTx(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Statement Modal */}
      {subStatementModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">كشف حساب المنشأة والمدير</h2>
                  <p className="text-xs text-slate-500 font-medium">المنشأة: {subStatementClient?.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {subStatementTxs.length > 0 && (
                  <ExportButton
                    title={`كشف حساب - ${subStatementClient?.company_name || "المنشأة"}`}
                    filename={`كشف_حساب_${subStatementClient?.company_name || "المنشأة"}`}
                    columns={[
                      { header: "رقم السند", key: "tx_id" },
                      { header: "نوع الحركة", key: "tx_type" },
                      { header: "المبلغ", key: "amount", formatter: (val) => formatNumberWithCommas(val) },
                      { header: "العملة", key: "currency" },
                      { header: "البيان", key: "notes" },
                      { header: "تاريخ الحركة", key: "created_at", formatter: (val) => formatDate(val) },
                    ]}
                    data={subStatementTxs}
                    elementId="subStatementModalContainer"
                  />
                )}
                <button
                  onClick={() => setSubStatementModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto" id="subStatementModalContainer">
              {subStatementLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  <p className="mt-4 text-sm text-slate-500 font-bold">جاري تحميل الكشف...</p>
                </div>
              ) : subStatementTxs.length > 0 ? (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">الرصيد التراكمي</th>
                      <th className="p-3">العملة</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3">تاريخ الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {(() => {
                      let currentBal = 0;
                      return subStatementTxs.map((tx: any) => {
                        const isPositive = tx.tx_type === "قبض";
                        const amount = Number(tx.amount);
                        if (isPositive) {
                          currentBal += amount;
                        } else {
                          currentBal -= amount;
                        }
                        return (
                          <tr 
                            key={tx.tx_id} 
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedJournalTx({ ...tx, displayBal: currentBal, isPositive })}
                          >
                            <td className="p-3 font-mono text-slate-400 text-xs">#{tx.tx_id}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                {isPositive ? "📥 سند قبض" : "📤 سند صرف"}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-slate-800 font-mono">{formatNumberWithCommas(tx.amount)}</td>
                            <td className="p-3 font-extrabold text-blue-600 font-mono" dir="ltr">{formatNumberWithCommas(currentBal)}</td>
                            <td className="p-3 text-slate-500 font-bold text-xs">{tx.currency}</td>
                            <td className="p-3 text-slate-600 font-bold text-xs">{tx.notes}</td>
                            <td className="p-3 text-slate-400 font-mono text-xs">{formatDate(tx.created_at)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-400 font-bold">
                  لا توجد حركات مالية مسجلة بين التاجر والمدير حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Daily Journal Ledger modal (detailed transaction auditor) */}
      {journalModalOpen && activeJournalClient && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setJournalModalOpen(false);
              setActiveJournalClient(null);
              setActiveJournalTxs([]);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-800 my-8 cursor-default" dir="rtl">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>دفتر يومية التاجر (الرقابة المحاسبية للسندات)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">المنشأة: <span className="font-bold text-slate-700">{activeJournalClient.company_name}</span> | كود الترخيص: <span className="font-mono font-bold text-slate-600">#{activeJournalClient.client_id}</span></p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* A. Export Button to Excel & PDF */}
                <ExportButton
                  title={`دفتر يومية التاجر - ${activeJournalClient.company_name}`}
                  filename={`دفتر_يومية_${activeJournalClient.company_name}`}
                  columns={[
                    { header: "رقم السند", key: "tx_id" },
                    { header: "تاريخ السند", key: "created_at", formatter: (val) => val ? formatDateTime(val) : "-" },
                    { header: "نوع السند", key: "tx_type" },
                    { header: "المبلغ", key: "amount", formatter: (val) => formatNumber(val) },
                    { header: "العملة", key: "currency" },
                    { header: "البيان والملحوظات", key: "notes" },
                    { header: "رقم القيد المرجعي", key: "voucher_num" },
                    { header: "حالة السند", key: "status" },
                  ]}
                  data={filteredJournalTxs}
                  elementId="merchantJournalModalTableContainer"
                  buttonText="تصدير (إكسل)"
                />

                <button
                  type="button"
                  onClick={() => {
                    setJournalModalOpen(false);
                    setActiveJournalClient(null);
                    setActiveJournalTxs([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* C. Search Field & Status Filter Toolbar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 my-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={journalSearchQuery}
                  onChange={(e) => setJournalSearchQuery(e.target.value)}
                  placeholder="ابحث حسب المبلغ، البيان، رقم السند، أو رقم القيد..."
                  className="w-full pr-9 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {journalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setJournalSearchQuery("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500">حالة السند:</span>
                <select
                  value={journalStatusFilter}
                  onChange={(e) => setJournalStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">جميع الحالات ({activeJournalTxs.length})</option>
                  <option value="مرحل">✅ مرحل</option>
                  <option value="قيد الترحيل">🔄 قيد الترحيل</option>
                  <option value="قيد التدقيق">🔍 قيد التدقيق</option>
                  <option value="غير مرحل">❌ غير مرحل</option>
                </select>
              </div>
            </div>

            {/* Modal Body & Table Container */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1" id="merchantJournalModalTableContainer">
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-right border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-100 font-extrabold select-none">
                    
                    {/* B. Sortable Column Headers */}
                    <th 
                      onClick={() => handleJournalSort("tx_id")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز"
                    >
                      <div className="flex items-center gap-1">
                        <span>رقم السند</span>
                        {renderSortIndicator("tx_id")}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleJournalSort("created_at")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز"
                    >
                      <div className="flex items-center gap-1">
                        <span>التاريخ</span>
                        {renderSortIndicator("created_at")}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleJournalSort("tx_type")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز"
                    >
                      <div className="flex items-center gap-1">
                        <span>نوع السند</span>
                        {renderSortIndicator("tx_type")}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleJournalSort("amount")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز حسب المبلغ"
                    >
                      <div className="flex items-center gap-1">
                        <span>القيمة المالية والعملة</span>
                        {renderSortIndicator("amount")}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleJournalSort("notes")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز حسب البيان"
                    >
                      <div className="flex items-center gap-1">
                        <span>البيان والملحوظات</span>
                        {renderSortIndicator("notes")}
                      </div>
                    </th>

                    <th className="p-3 text-center">
                      المستند والوثيقة المرفقة
                    </th>

                    <th 
                      onClick={() => handleJournalSort("voucher_num")}
                      className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز"
                    >
                      <div className="flex items-center gap-1">
                        <span>رقم ترحيل السند اليومي</span>
                        {renderSortIndicator("voucher_num")}
                      </div>
                    </th>

                    <th 
                      onClick={() => handleJournalSort("status")}
                      className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      title="انقر للفرز حسب الحالة"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>حالة السند والرقابة</span>
                        {renderSortIndicator("status")}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="text-xs text-slate-700 divide-y divide-slate-100 font-medium">
                  {journalLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold animate-pulse">
                        جاري فحص المستندات والسندات...
                      </td>
                    </tr>
                  ) : filteredJournalTxs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        {activeJournalTxs.length === 0 ? "لا توجد أي سندات مالية مسجلة في هذا الدفتر بعد." : "لا توجد سندات مطابقة لمعايير البحث أو التصفية الحالية."}
                      </td>
                    </tr>
                  ) : (
                    filteredJournalTxs.map((tx) => {
                      const isPositive = tx.tx_type === "قبض";
                      return (
                        <tr key={tx.tx_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 text-slate-400 font-bold font-mono">#{tx.tx_id}</td>
                          <td className="p-3 text-slate-500 font-mono text-[10px]">
                            {tx.created_at ? formatDateTime(tx.created_at) : "-"}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${isPositive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"}`}>
                              {isPositive ? "📥 سند قبض" : "📤 سند صرف"}
                            </span>
                          </td>
                          <td className="p-3 font-extrabold text-slate-800 font-mono">
                            {formatNumber(tx.amount)} {tx.currency}
                          </td>
                          <td className="p-3 text-slate-600 font-medium max-w-xs truncate" title={tx.notes}>
                            {tx.notes || "-"}
                          </td>
                          <td className="p-3 text-center">
                            {tx.attachments && tx.attachments.length > 0 ? (
                              <button
                                onClick={() => openAttachment(tx.attachments![0].file_data, tx.attachments![0].file_name)}
                                className="text-blue-600 hover:underline font-bold text-[10px] bg-blue-50 px-2.5 py-1 rounded-lg inline-block transition-colors"
                                title={tx.attachments[0].file_name}
                              >
                                📎 فتح المرفق
                              </button>
                            ) : tx.receipt_url && tx.receipt_url !== "لا يوجد مرفق" ? (
                              <a
                                href={tx.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-bold text-[10px] bg-blue-50 px-2.5 py-1 rounded-lg inline-block transition-colors"
                              >
                                📎 فتح المرفق
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px]">بلا مستند</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                id={`voucher-input-${tx.tx_id}`}
                                type="text"
                                placeholder="رقم القيد"
                                defaultValue={tx.voucher_num || ""}
                                onBlur={(e) => handleUpdateTxStatus(tx.tx_id, tx.status || "غير مرحل", e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center w-24 font-mono text-[11px] focus:outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => {
                                  const input = document.getElementById(`voucher-input-${tx.tx_id}`) as HTMLInputElement;
                                  if (input) handleUpdateTxStatus(tx.tx_id, tx.status || "غير مرحل", input.value);
                                }}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors"
                                title="حفظ القيد المرجعي"
                              >
                                💾
                              </button>
                            </div>
                          </td>

                          {/* D. Color-Coded Status Selection Badge */}
                          <td className="p-3 text-center">
                            <select
                              value={tx.status || "غير مرحل"}
                              onChange={(e) => {
                                const input = document.getElementById(`voucher-input-${tx.tx_id}`) as HTMLInputElement;
                                const currentVoucher = input ? input.value : (tx.voucher_num || "");
                                handleUpdateTxStatus(tx.tx_id, e.target.value, currentVoucher);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shadow-2xs transition-all cursor-pointer focus:outline-none ${getStatusBadgeStyle(tx.status)}`}
                            >
                              <option value="مرحل" className="bg-white text-slate-800">✅ مرحل</option>
                              <option value="قيد الترحيل" className="bg-white text-slate-800">🔄 قيد الترحيل</option>
                              <option value="قيد التدقيق" className="bg-white text-slate-800">🔍 قيد التدقيق</option>
                              <option value="غير مرحل" className="bg-white text-slate-800">❌ غير مرحل</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* MODAL - Subscription Differences Report */}
      {showDiffReportModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDiffReportModal(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-3 shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">تقرير تفاصيل الفروقات والالتزامات المالية للاشتراكات</h3>
                <p className="text-xs text-slate-500">مراجعة الفروقات بين مبالغ الاشتراكات الشهرية المتفق عليها للمنشآت والمبالغ المحصلة فعلياً.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDiffReportModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                title="إغلاق التقرير"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-5 mt-4 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">إجمالي الاشتراكات الشهرية المستهدفة</span>
                  <span className="text-lg font-extrabold text-blue-600 font-mono">
                    ${formatNumber(clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0))}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">إجمالي المبالغ المحصلة فعلياً</span>
                  <span className="text-lg font-extrabold text-emerald-600 font-mono">
                    ${formatNumber(clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0))}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">إجمالي فروقات العجز المتبقي</span>
                  <span className="text-lg font-extrabold text-red-600 font-mono">
                    ${formatNumber(clients.reduce((acc, c) => acc + (c.subscription_value || 0), 0) - clients.reduce((acc, c) => acc + (c.paid_amount || 0), 0))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 border-b border-slate-100 font-extrabold">
                      <th className="p-3.5">المنشأة والتاجر</th>
                      <th className="p-3.5 text-center">الاشتراك الشهري</th>
                      <th className="p-3.5 text-center">المحصل الفعلي</th>
                      <th className="p-3.5 text-center">الباقي المستحق</th>
                      <th className="p-3.5 text-center">حالة الحساب</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                    {clients.map((c) => {
                      const remaining = (c.subscription_value || 0) - (c.paid_amount || 0);
                      return (
                        <tr key={c.client_id} className={`hover:bg-slate-50/50 ${remaining > 0 ? "bg-red-50/20" : ""}`}>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                openSelectedClientCard(c);
                              }}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-right"
                            >
                              {c.company_name}
                              <span className="text-[10px] text-slate-400 block font-normal mt-0.5">كود: #{c.client_id} | الجوال: {c.phone}</span>
                            </button>
                          </td>
                          <td className="p-3.5 text-center font-bold font-mono text-slate-800">${formatNumber(c.subscription_value)}</td>
                          <td className="p-3.5 text-center font-bold font-mono text-emerald-600">${formatNumber(c.paid_amount)}</td>
                          <td className="p-3.5 text-center font-extrabold font-mono">
                            <span className={remaining > 0 ? "text-red-600 bg-red-50 px-2 py-0.5 rounded" : "text-slate-400"}>
                              ${formatNumber(remaining)}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleClientStatus(c.client_id, c.status)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all ${c.status === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"}`}
                            >
                              {c.status === "Active" ? "نشط (اضغط للتعطيل)" : "معطل (اضغط للتفعيل)"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Detailed Client Control Card */}
      {selectedClientForCard && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedClientForCard(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col text-slate-800 my-8 cursor-default" dir="rtl">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                  <span>🏥 بطاقة العميل والتفاصيل الشاملة والصلاحيات</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">كود: #{selectedClientForCard.client_id}</span>
                </h3>
                <p className="text-[11px] text-slate-400">إدارة الملف والاشتراك وتسجيل الدفعات / الخصومات مباشرة في كشف الحساب.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientForCard(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-4 space-y-6">

            {/* Editing Toggle & View Block */}
            {!cardIsEditing ? (
              // View mode block
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic user info cards */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-400">البيانات الأساسية للمنشأة</h4>
                    <div className="text-xs space-y-1 text-slate-700">
                      <div>🏢 <b>اسم المنشأة/التاجر:</b> {selectedClientForCard.company_name}</div>
                      <div>📞 <b>رقم جوال الدخول:</b> {selectedClientForCard.phone}</div>
                      <div>📍 <b>العنوان التفصيلي:</b> {selectedClientForCard.address || "غير مدخل"}</div>
                      <div>📝 <b>ملاحظات الرقابة:</b> {selectedClientForCard.notes || "لا توجد ملحوظات"}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-400">تفاصيل الترخيص والاشتراك</h4>
                    <div className="text-xs space-y-1 text-slate-700">
                      <div>💰 <b>قيمة الاشتراك الشهري:</b> ${formatNumber(selectedClientForCard.subscription_value)}</div>
                      <div>📥 <b>إجمالي المحصل الفعلي:</b> ${formatNumber(selectedClientForCard.paid_amount)}</div>
                      <div className="text-red-600 font-bold">📊 <b>العجز المتبقي المستحق:</b> ${formatNumber((selectedClientForCard.subscription_value || 0) - (selectedClientForCard.paid_amount || 0))}</div>
                      <div>📅 <b>فترة الصلاحية:</b> <span className={getDateStyleClass(selectedClientForCard.end_date)}>{formatDate(selectedClientForCard.start_date)} - {formatDate(selectedClientForCard.end_date)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Edit Toggle & Statement Buttons */}
                <div className="flex justify-start gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCardIsEditing(true)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[11px] px-3 py-2 rounded-xl border border-blue-200 transition-all flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل بيانات العميل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openSubStatement(selectedClientForCard);
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] px-3 py-2 rounded-xl border border-amber-200 transition-all flex items-center gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    كشف حساب الحركات (التاجر والمدير)
                  </button>
                </div>

                {/* Addition / Deduction Form */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <span>💵 لوحة تسجيل العمليات المالية للاشتراك الشهري (إضافة / خصم دفعة)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">أي حركة تسجل هنا يتم إدراج سند قبض أو صرف تلقائي معتمد ومرحل في كشف حساب التاجر وكشف المدير المالي.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">قيمة الحركة المالية ($)</label>
                      <input
                        type="text"
                        placeholder="أدخل قيمة المبلغ المستلم أو المخصوم..."
                        value={subAmount}
                      onChange={(e) => setSubAmount(e.target.value)}
                      onBlur={(e) => setSubAmount(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block">بيان وشرح الحركة (يظهر في كشف الحساب)</label>
                      <input
                        type="text"
                        placeholder="أدخل سبب الحركة بالتفصيل..."
                        value={subNotes}
                        onChange={(e) => setSubNotes(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleCardRecordTransaction("add")}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-50 flex items-center justify-center gap-1.5"
                    >
                      <span>📥 تسجيل وإيداع دفعة إضافية (قبض)</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleCardRecordTransaction("deduct")}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-50 flex items-center justify-center gap-1.5"
                    >
                      <span>📤 تسجيل خصم/مسترجع مالي (صرف)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Edit mode block
              <form onSubmit={handleSaveCardClientEdits} className="space-y-4 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اسم المنشأة أو التاجر</label>
                    <input
                      type="text"
                      required
                      value={cardCompanyName}
                      onChange={(e) => setCardCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">رقم الجوال للعميل</label>
                    <input
                      type="text"
                      required
                      value={cardPhone}
                      onChange={(e) => setCardPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">تاريخ تفعيل الرقابة</label>
                    <input
                      type="date"
                      required
                      value={cardStartDate}
                      onChange={(e) => setCardStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">تاريخ انتهاء الترخيص</label>
                    <input
                      type="date"
                      required
                      value={cardEndDate}
                      onChange={(e) => setCardEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الاشتراك الشهري ($) (ثابت غير قابل للتعديل)</label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={cardSubValue}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400">قيمة الاشتراك الشهري محددة عند تعريف المنشأة أول مرة ولا يمكن تغييرها.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">حالة العميل المباشرة</label>
                  <select
                    value={cardStatus}
                    onChange={(e) => setCardStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">نشط ومفعل</option>
                    <option value="Inactive">معطل وموقوف</option>
                  </select>
                </div>


                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">العنوان الجغرافي للشركة</label>
                  <input
                    type="text"
                    value={cardAddress}
                    onChange={(e) => setCardAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {isSuperAdmin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">المساحة السحابية المسموحة (MB)</label>
                    <input
                      type="number"
                      required
                      value={cardStorageLimit}
                      onChange={(e) => setCardStorageLimit(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}


                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">البيان والملحوظات الخاصة بالرقابة</label>
                  <textarea
                    rows={2}
                    value={cardNotes}
                    onChange={(e) => setCardNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {submitting ? "جاري حفظ التغييرات..." : "حفظ التعديلات وتثبيتها"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardIsEditing(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    إلغاء التعديل
                  </button>
                </div>
              </form>
            )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Super Admin: Manager Admin Full Details & Edit Control */}
      
      {/* MODAL - Manager Transaction Details */}
      {selectedManagerTx && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedManagerTx(null);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-[80] overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 w-full max-w-md space-y-4 text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                تفاصيل الحركة المالية
              </h3>
              <button
                type="button"
                onClick={() => setSelectedManagerTx(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1 text-right">
                  <span className="text-slate-500 text-[11px] font-bold block">المبلغ</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-800" dir="ltr">{formatNumber(selectedManagerTx.amount)}$</span>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-slate-500 text-[11px] font-bold block">الرصيد بعد الحركة</span>
                  <span className="text-lg font-bold font-mono text-blue-600" dir="ltr">{formatNumber(selectedManagerTx.balance_after)}$</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">نوع الحركة</label>
                <div className="inline-block px-3 py-1.5 rounded-lg font-bold text-sm bg-slate-50">
                  <span className={selectedManagerTx.isPositive ? "text-emerald-600" : "text-rose-600"}>
                    {selectedManagerTx.isPositive ? "📥 إيداع / قبض" : "📤 سحب / دفع"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">تاريخ ووقت الحركة</label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-sm text-slate-700">
                  {formatDate(selectedManagerTx.created_at)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500 text-xs font-bold block">التفاصيل والبيان المعتمد</label>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedManagerTx.description || "-"}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedManagerTx(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Super Admin: Manager Admin Full Details & Edit Control */}
      {/* Public Manager Profile Modal */}
      {publicManagerModalOpen && (
        <div 
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setPublicManagerModalOpen(false)}
        >
          {loadingPublicManager ? (
             <div className="bg-[#141416] rounded-3xl p-8 flex justify-center items-center">
               <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
             </div>
          ) : selectedPublicManager ? (
          <div 
            className="bg-[#141416] rounded-3xl border border-zinc-800 p-6 md:p-8 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-6 relative text-right"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Close button */}
            <button 
              onClick={() => setPublicManagerModalOpen(false)}
              className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-extrabold uppercase mx-auto shadow-md">
                {selectedPublicManager.profile_image_url ? (
                  <img src={selectedPublicManager.profile_image_url} alt={selectedPublicManager.full_name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  selectedPublicManager.full_name?.charAt(0) || "M"
                )}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-zinc-100">{selectedPublicManager.full_name}</h3>
                <p className="text-xs text-amber-500 font-bold mt-1">معرف النظام: @{selectedPublicManager.username}</p>
              </div>
            </div>

            {selectedPublicManager.is_private ? (
              <div className="border-t border-zinc-800/60 pt-5 space-y-4 text-center">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-2xl text-sm font-bold">
                  هذا المدير لم يقم بتفعيل البروفايل العام الخاص به.
                </div>
              </div>
            ) : (
            <div className="border-t border-zinc-800/60 pt-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest block uppercase">الخبرة والنبذة المهنية</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {selectedPublicManager.bio || "لم يكتب نبذة بروفايل بعد."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-center">
                  <span className="text-zinc-500 block text-[10px] font-bold">سنوات الخبرة</span>
                  <span className="font-extrabold text-zinc-200 text-sm">{selectedPublicManager.years_exp ? `${selectedPublicManager.years_exp} عام` : "غير محدد"}</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/60 text-center">
                  <span className="text-zinc-500 block text-[10px] font-bold">اللغات</span>
                  <span className="font-extrabold text-zinc-200 text-sm">{selectedPublicManager.languages || "العربية"}</span>
                </div>
              </div>
            </div>
            )}

            {/* Direct Instant Contact Buttons */}
            <div className="space-y-3 border-t border-zinc-800/60 pt-5">
              <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest block uppercase text-center">قنوات الاتصال المباشر والتوظيف</span>
                
              <div className="grid grid-cols-2 gap-3 mt-4">
                <a
                  href={`https://wa.me/${selectedPublicManager.phone?.replace(/[\s+]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  واتساب
                </a>
                  
                <a
                  href={`https://t.me/${selectedPublicManager.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold py-3 rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  تليغرام
                </a>
              </div>

              {selectedPublicManager.phone && (
                <a
                  href={`tel:${selectedPublicManager.phone}`}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold py-3 rounded-xl transition-all text-center border border-zinc-800 cursor-pointer mt-3"
                >
                  <Phone className="w-4 h-4 text-amber-500" />
                  اتصال هاتفي مباشر
                </a>
              )}

              <div className="flex justify-center gap-6 pt-5 mt-2">
                {selectedPublicManager.facebook_url && (
                  <a href={selectedPublicManager.facebook_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-500 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {selectedPublicManager.instagram_url && (
                  <a href={selectedPublicManager.instagram_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-pink-500 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {selectedPublicManager.linkedin_url && (
                  <a href={selectedPublicManager.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-400 transition-colors bg-zinc-900 p-2.5 rounded-full border border-zinc-800">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
          ) : null}
        </div>
      )}

      {managerDetailsModalOpen && selectedManagerId && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setManagerDetailsModalOpen(false);
            }
          }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col text-slate-800 overflow-hidden manager-details-modal my-auto cursor-default" dir="rtl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-extrabold">الملف التعريفي وكشف الحساب والتحكم بالمدير المالي</h3>
              </div>
              <button 
                type="button"
                onClick={() => setManagerDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content container */}
            {loadingManagerDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                <p className="text-xs font-bold text-slate-500">جاري جلب تفاصيل كشف الحساب والبيانات...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Right column: Edit form (Full Control) */}
                <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-slate-100 lg:pl-6 text-right">
                  <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-start">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    صلاحيات التحكم وتعديل كافة بيانات المدير
                  </h4>

                  <form onSubmit={handleSaveManagerDetails} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block">الاسم الكامل للمدير</label>
                        <input
                          type="text"
                          required
                          value={editMgrFullName}
                          onChange={(e) => setEditMgrFullName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block">اسم المستخدم</label>
                        <input
                          type="text"
                          required
                          value={editMgrUsername}
                          onChange={(e) => setEditMgrUsername(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block">رقم الهاتف</label>
                        <input
                          type="text"
                          required
                          value={editMgrPhone}
                          onChange={(e) => setEditMgrPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block">تعيين كلمة مرور جديدة</label>
                        <input
                          type="password"
                          placeholder="اتركه فارغاً لعدم التغيير"
                          value={editMgrPassword}
                          onChange={(e) => setEditMgrPassword(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>
                    </div>

                    {editMgrUsername !== superAdminUsername && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500 block">حالة حساب المدير</label>
                            <select
                              value={editMgrStatus}
                              onChange={(e) => setEditMgrStatus(e.target.value as any)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            >
                              <option value="Active">نشط ومفعل</option>
                              <option value="Inactive">معطل موقوف</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500 block">الاشتراك الشهري المستحق ($)</label>
                            <input
                              type="text"
                              required
                              value={editMgrSubValue}
                              onChange={(e) => setEditMgrSubValue(e.target.value)}
                              onBlur={(e) => setEditMgrSubValue(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500 block">المسدد نقداً للااشتراك ($)</label>
                            <input
                              type="text"
                              required
                              value={editMgrPaidAmount}
                              onChange={(e) => setEditMgrPaidAmount(e.target.value)}
                              onBlur={(e) => setEditMgrPaidAmount(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-red-500 block">المتبقي غير المسدد ($)</label>
                            <div className="w-full px-3 py-1.5 bg-red-50/50 border border-red-100 rounded-xl text-xs font-mono font-bold text-red-600 text-right">
                              {formatNumber(parseFloat(parseCommasToNumberString(String(editMgrSubValue || "0"))) - parseFloat(parseCommasToNumberString(String(editMgrPaidAmount || "0"))))}$
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500 block">تاريخ بداية اشتراك النظام</label>
                            <input
                              type="date"
                              value={editMgrStartDate}
                              onChange={(e) => setEditMgrStartDate(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-slate-500 block">تاريخ نهاية ترخيص النظام</label>
                            <input
                              type="date"
                              value={editMgrEndDate}
                              onChange={(e) => setEditMgrEndDate(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-3 bg-blue-50/30 p-3 rounded-xl border border-blue-100/50">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 block">تعديل رصيد المحفظة الفعلي ($)</label>
                        <input
                          type="text"
                          required
                          value={editMgrWalletBalance}
                          onChange={(e) => setEditMgrWalletBalance(e.target.value)}
                          onBlur={(e) => setEditMgrWalletBalance(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                          className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                        />
                      </div>
                      {editMgrUsername !== superAdminUsername && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-600 block">تعديل رصيد الهدايا/البونص ($)</label>
                          <input
                            type="text"
                            required
                            value={editMgrWalletBonus}
                            onChange={(e) => setEditMgrWalletBonus(e.target.value)}
                            onBlur={(e) => setEditMgrWalletBonus(formatNumberWithCommas(parseCommasToNumberString(e.target.value)))}
                            className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        {submitting ? "جاري الحفظ..." : "حفظ وتثبيت كافة التعديلات"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerDetailsModalOpen(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                      >
                        إغلاق
                      </button>
                    </div>
                  </form>
                </div>

                {/* Left column: Financial Account Statement (كشف الحساب والعمليات للمالك) */}
                <div className="lg:col-span-7 flex flex-col h-full space-y-3.5 text-right">
                  {/* Header & Tabs */}
                  <div className="border-b border-slate-100 pb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      <span>كشف حركات محفظة المدير (للمالك)</span>
                    </h4>

                    {/* Statement Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setOwnerStatementTab("cash")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          ownerStatementTab === "cash"
                            ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        💵 كشف الكاش ({selectedManagerTransactions.filter((tx: any) => {
                          const typeStr = String(tx.type || "").toLowerCase();
                          const descStr = String(tx.description || "");
                          return !(typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص"));
                        }).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOwnerStatementTab("bonus")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          ownerStatementTab === "bonus"
                            ? "bg-white text-purple-700 shadow-sm border border-purple-100"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        🎁 كشف البونص ({selectedManagerTransactions.filter((tx: any) => {
                          const typeStr = String(tx.type || "").toLowerCase();
                          const descStr = String(tx.description || "");
                          return typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص");
                        }).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOwnerStatementTab("all")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          ownerStatementTab === "all"
                            ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        📋 الكشف الكلي ({selectedManagerTransactions.length})
                      </button>
                    </div>

                    {selectedManagerTransactions.length > 0 && (
                      <ExportButton
                        title={`كشف حركات محفظة المدير - ${selectedManagerDetails?.full_name || ""}`}
                        filename={`كشف_حساب_المدير_${selectedManagerDetails?.username || "المحفظة"}`}
                        columns={[
                          { header: "رقم الحركة", key: "tx_id" },
                          { header: "النوع", key: "type" },
                          { header: "المبلغ ($)", key: "amount", formatter: (val) => formatNumber(val) },
                          { header: "البيان والتفاصيل", key: "description" },
                          { header: "التاريخ", key: "created_at", formatter: (val) => formatDate(val) },
                        ]}
                        data={selectedManagerTransactions.filter((tx: any) => {
                          const typeStr = String(tx.type || "").toLowerCase();
                          const descStr = String(tx.description || "");
                          const isBonus = typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص");
                          if (ownerStatementTab === "cash") return !isBonus;
                          if (ownerStatementTab === "bonus") return isBonus;
                          return true;
                        })}
                        elementId="ownerManagerStatementContainer"
                      />
                    )}
                  </div>

                  {/* Summary row */}
                  <div className={"grid gap-2.5 " + (selectedManagerDetails?.username === superAdminUsername ? "grid-cols-1" : "grid-cols-3")}>
                    <div 
                      onClick={() => setOwnerStatementTab("cash")}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        ownerStatementTab === "cash"
                          ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] text-slate-500 font-extrabold block">الرصيد النقدي الفعلي (انقر للتصفية)</span>
                      <span className="text-sm font-extrabold text-emerald-600 font-mono">{formatNumber(selectedManagerDetails?.wallet_balance ?? 0)}$</span>
                    </div>
                    {selectedManagerDetails?.username !== superAdminUsername && (
                      <>
                        <div 
                          onClick={() => setOwnerStatementTab("bonus")}
                          className={`p-2.5 rounded-xl text-center shadow-sm cursor-pointer transition-all ${
                            ownerStatementTab === "bonus"
                              ? "bg-purple-900 border border-purple-400 ring-2 ring-purple-300"
                              : "bg-purple-950 border border-purple-900 hover:bg-purple-900"
                          }`}
                        >
                          <span className="text-[10px] text-purple-200 font-extrabold block">رصيد الهدايا والبونص (انقر للتصفية)</span>
                          <span className="text-sm font-extrabold text-amber-300 font-mono">{formatNumber(selectedManagerDetails?.wallet_bonus ?? 0)}$</span>
                        </div>
                        <div 
                          onClick={() => setOwnerStatementTab("all")}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            ownerStatementTab === "all"
                              ? "bg-blue-100 border-blue-300 ring-2 ring-blue-400"
                              : "bg-blue-50/70 border-blue-100 hover:bg-blue-100/50"
                          }`}
                        >
                          <span className="text-[10px] text-blue-600 font-extrabold block">إجمالي رصيد المحفظة (الكل)</span>
                          <span className="text-sm font-extrabold text-blue-700 font-mono">{formatNumber((selectedManagerDetails?.wallet_balance ?? 0) + (selectedManagerDetails?.wallet_bonus ?? 0))}$</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Scrollable table of transactions */}
                  <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[300px]" id="ownerManagerStatementContainer">
                    <div className="overflow-auto max-h-[380px] flex-1">
                      {(() => {
                        const isBonusTx = (tx: any) => {
                          const typeStr = String(tx.type || "").toLowerCase();
                          const descStr = String(tx.description || "");
                          return typeStr.includes("bonus") || typeStr === "deduct bonus" || descStr.includes("بونص") || descStr.includes("مكافأة") || descStr.includes("البونص");
                        };

                        const cashList = selectedManagerTransactions.filter((tx: any) => !isBonusTx(tx));
                        const bonusList = selectedManagerTransactions.filter(isBonusTx);

                        let displayList: any[] = [];
                        let sourceList = ownerStatementTab === "cash" ? cashList : ownerStatementTab === "bonus" ? bonusList : selectedManagerTransactions;
                        
                        let runningSum = 0;
                        displayList = [...sourceList].reverse().map((tx: any) => {
                          const amt = parseFloat(parseCommasToNumberString(String(tx.amount || 0)));
                          const isB = isBonusTx(tx);
                          runningSum += amt;
                          return { ...tx, numericAmt: amt, displayBal: runningSum, isBonus: isB };
                        }).reverse();

                        return (
                          <table className="w-full text-right border-collapse wallet-transactions-table min-w-[680px]">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                              <tr className="text-[10px] text-slate-400 border-b border-slate-100 font-extrabold select-none bg-white">
                                <th className="p-2.5 text-center">التاريخ والوقت</th>
                                <th className="p-2.5 text-center">نوع الحركة</th>
                                <th className="p-2.5 text-center">مصدر الرصيد</th>
                                <th className="p-2.5 text-center">البيان والتفاصيل</th>
                                <th className="p-2.5 text-center">المبلغ</th>
                                <th className="p-2.5 text-center">الرصيد بعد</th>
                              </tr>
                            </thead>
                            <tbody className="text-[11px] text-slate-700 divide-y divide-slate-100/75 bg-white font-medium">
                              {displayList.length > 0 ? (
                                displayList.map((tx: any, idx: number) => {
                                  const isPositive = tx.numericAmt >= 0;
                                  return (
                                    <tr 
                                      key={tx.id || idx} 
                                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                                      onClick={() => setSelectedManagerTx({ ...tx, isPositive })}
                                    >
                                      <td className="p-2.5 text-center text-slate-400 font-mono text-[10px]">
                                        {formatDate(tx.created_at)}
                                      </td>
                                      <td className="p-2.5 font-semibold text-center">
                                        {tx.isBonus ? (
                                          isPositive ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100 inline-block text-center">
                                              🎁 بونص (قبض)
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 inline-block text-center">
                                              📤 دفع (من البونص)
                                            </span>
                                          )
                                        ) : (
                                          isPositive ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block text-center">
                                              📥 قبض (كاش)
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-500 border border-red-100 inline-block text-center">
                                              📤 دفع (كاش)
                                            </span>
                                          )
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${tx.isBonus ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                          {tx.isBonus ? "🎁 بونص" : "💵 كاش"}
                                        </span>
                                      </td>
                                      <td className="p-2.5 font-medium max-w-[200px] truncate text-center" title={tx.description}>
                                        {tx.description}
                                      </td>
                                      <td className={`p-2.5 text-center font-bold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                        {isPositive ? "+" : ""}{formatNumber(tx.numericAmt)}$
                                      </td>
                                      <td className="p-2.5 text-center font-semibold text-slate-600 font-mono" dir="ltr">
                                        {formatNumber(tx.displayBal)}$
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">
                                    {ownerStatementTab === "cash" && "لا توجد حركات كاش مسجلة لهذا المدير."}
                                    {ownerStatementTab === "bonus" && "لا توجد حركات بونص مسجلة لهذا المدير."}
                                    {ownerStatementTab === "all" && "لا توجد حركات مالية مسجلة في محفظة هذا المدير."}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
      {/* Gallery Modal */}
      {galleryModalOpen && galleryClientId && (
        <div 
          onClick={(e) => {
            if ((e.target as any).id === "gallery-overlay") setGalleryModalOpen(false);
          }}
          id="gallery-overlay"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                  <Image className="w-5 h-5 text-sky-500" />
                  <span>معرض المرفقات والصور للفواتير</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">المنشأة: <strong className="text-sky-600">{galleryClientName}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 mt-4 space-y-4">
              {loadingGallery ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
                </div>
              ) : galleryAttachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryAttachments.map((att: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow group relative">
                      <div className="aspect-[4/3] bg-slate-200 rounded-xl overflow-hidden mb-3 relative">
                        {att.file_url ? (
                          <img 
                            src={att.file_url} 
                            alt={att.file_name} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                            onClick={() => window.open(att.file_url, "_blank")}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-slate-400">
                            <Image className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700 truncate" title={att.file_name}>{att.file_name || "مرفق غير مسمى"}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full font-mono">
                            {(att.size_mb || 0).toFixed(2)} MB
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(att.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 space-y-2 bg-slate-50 rounded-3xl border border-slate-100">
                  <Image className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">لا يوجد مرفقات لهذا التاجر حالياً.</p>
                  <p className="text-xs">لم يتم رفع أي فواتير أو إيصالات في حساب هذا التاجر.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setChangePasswordModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 w-full max-w-md flex flex-col text-slate-800 my-8 cursor-default" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">تغيير كلمة المرور</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-extrabold text-slate-500 block">كلمة المرور القديمة</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-extrabold text-slate-500 block">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-extrabold text-slate-500 block">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                >
                  {submitting ? "جاري التغيير..." : "تأكيد وتغيير"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
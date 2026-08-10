export interface AuthUser {
  id: number;
  mainId: number;
  username: string;
  fullName: string;
}

export interface AuthState {
  userId: number | null;
  mainId: number | null;
  role: "admin" | "accountant" | "client" | "";
  isSuperAdmin: boolean;
  username?: string;
  fullName?: string;
  token?: string;
}

export interface ClientMerchant {
  manager?: { full_name: string; username?: string };
  client_id: number;
  main_id: number;
  company_name: string;
  phone: string;
  address?: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
  subscription_value: number;
  paid_amount: number;
  status: "Active" | "Inactive";
  created_at: string;
  sys_status: "Active" | "Inactive" | "Suspended";
  sys_start_date?: string;
  sys_end_date?: string;
  sys_sub_value: number;
  sys_paid_amount: number;
  is_free_tier: boolean;
  monthly_tx_count: number;
  tx_limit: number;
  total_paid_to_manager?: number;
  assigned_accountants?: string;
  public_access_token?: string;
}

export interface Accountant {
  accountant_id: number;
  main_id: number;
  telegram_id?: string;
  username: string;
  full_name: string;
  phone?: string;
  address?: string;
  employment_date?: string;
  salary: number;
  status: "Active" | "Inactive";
  sys_status: "Active" | "Inactive";
  assigned_clients?: Array<{
    client_id: number;
    company_name: string;
    link_status: string;
  }>;
}

export interface ManagerAdmin {
  main_id: number;
  username: string;
  full_name: string;
  phone?: string;
  status: "Active" | "Inactive";
  start_date?: string;
  end_date?: string;
  subscription_value: number;
  paid_amount: number;
  wallet_balance: number;
  wallet_bonus: number;
  client_count?: number;
  accountant_count?: number;
}

export interface Transaction {
  tx_id: number;
  client_id: number;
  main_id: number;
  tx_type: "قبض" | "صرف";
  currency: string;
  amount: number;
  notes: string;
  receipt_url?: string;
  attachments?: any[];
  status: "مرحل" | "غير مرحل" | "قيد التدقيق" | "قيد الترحيل" | string;
  telegram_msg_id?: string;
  voucher_num?: string;
  created_at: string;
}
export const defaultPackages = {
  basic: [
    { id: "b1", title: "إضافة تاجر / منشأة", price: "$10", duration: "شهرياً", features: ["لوحة تحكم خاصة للتاجر", "تسجيل الحركات المباشرة والمرفقات", "25 MB مساحة سحابية افتراضية للمرفقات", "تصدير التقارير الفورية"] },
    { id: "b2", title: "إضافة مساعد محاسب", price: "$5", duration: "شهرياً", features: ["وصول مقيد لصلاحيات المحاسب", "إدارة يومية للتجار المسندين إليه", "تتبع أداء المحاسب وحركاته"] }
  ],
  bundles: [
    { id: "bu1", title: "باقة البداية", description: "مناسبة للمكاتب الصغيرة.", price: "$50", oldPrice: "$60", features: "5 تجار + 2 محاسبين", popular: false },
    { id: "bu2", title: "باقة النمو", description: "مناسبة للنمو المتسارع.", price: "$100", oldPrice: "$150", features: "10 تجار + 4 محاسبين", popular: true },
    { id: "bu3", title: "باقة الأعمال", description: "مكاتب المحاسبة الكبرى.", price: "$200", oldPrice: "$350", features: "30 تاجر + 10 محاسبين", popular: false }
  ],
  addons: [
    { id: "a1", title: "حزمة 1 غيغابايت إضافية", description: "ممتازة للتجار الصغار ومكاتب الخدمات المحدودة.", price: "$1.99", duration: "شهرياً" },
    { id: "a2", title: "حزمة 5 غيغابايت إضافية", description: "للتجار ذوي الحركة الكثيفة والمرفقات الكبيرة والمستندات المتعددة.", price: "$6.99", duration: "شهرياً" }
  ]
};

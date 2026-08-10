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

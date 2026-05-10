import { PaymentType, TransactionType } from "@/lib/types";

export type Language = "en" | "ar";

export const LANGUAGE_COOKIE = "site-language";

export const commonDictionary = {
  search: { en: "Search", ar: "بحث" },
  appointments: { en: "Appointments", ar: "المواعيد" },
  favorites: { en: "Favorites", ar: "المفضلة" },
  compare: { en: "Compare", ar: "مقارنة" },
  community: { en: "Community", ar: "المجتمع" },
  seller: { en: "Seller", ar: "البائع" },
  admin: { en: "Admin", ar: "الإدارة" },
  buyer: { en: "Buyer", ar: "المشتري" },
  login: { en: "Login", ar: "تسجيل الدخول" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  loggingOut: { en: "Logging out...", ar: "جارٍ تسجيل الخروج..." },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  openProfileMenu: { en: "Open profile menu", ar: "فتح قائمة الملف الشخصي" },
  showProfile: { en: "Show Profile", ar: "عرض الملف الشخصي" },
  noPhoneAdded: { en: "No phone added", ar: "لم يتم إضافة رقم هاتف" },
  developer: { en: "Developer", ar: "المطور" },
  home: { en: "Home", ar: "الرئيسية" },
  notify: { en: "Notify", ar: "تنبيهات" },
  aiAssistant: { en: "AI Assistant", ar: "المساعد الذكي" },
  assistant: { en: "Assistant", ar: "المساعد" },
  typeYourQuestion: { en: "Type your question", ar: "اكتب سؤالك" },
  send: { en: "Send", ar: "إرسال" },
  assistantGreeting: {
    en: "Hi, I can help you find properties. Budget? Buy, rent, or vacation?",
    ar: "مرحباً، يمكنني مساعدتك في العثور على عقار. ما الميزانية؟ شراء أم إيجار أم مصيف؟"
  },
  switchToArabic: { en: "Switch to Arabic", ar: "التبديل إلى العربية" },
  switchToEnglish: { en: "Switch to English", ar: "التبديل إلى الإنجليزية" },
  trustLayer: { en: "Cheque & Key Trust Layer", ar: "طبقة الثقة من شيك آند كي" },
  heroTitle: {
    en: "Find verified properties with secure cash and installment plans.",
    ar: "اعثر على عقارات موثقة بخطط دفع نقدي وتقسيط آمنة."
  },
  heroDescription: {
    en: "Inspired by marketplace speed and pro filters. Every public listing is admin-approved and stamped verified.",
    ar: "تجربة سريعة مع فلاتر احترافية. كل إعلان عام تتم مراجعته من الإدارة ويحمل علامة التوثيق."
  },
  verifiedListings: { en: "Verified listings", ar: "إعلانات موثقة" },
  verifiedListingsDesc: {
    en: "Every listing is reviewed by admin before it appears in public search.",
    ar: "يتم مراجعة كل إعلان من الإدارة قبل ظهوره في البحث العام."
  },
  securePayments: { en: "Secure payments & installments", ar: "مدفوعات وتقسيط آمن" },
  securePaymentsDesc: {
    en: "Compare cash vs installment plans with down payment and monthly commitment visibility.",
    ar: "قارن بين الدفع النقدي وخطط التقسيط مع وضوح الدفعة المقدمة والالتزام الشهري."
  },
  noUpdatesYet: { en: "No updates yet.", ar: "لا توجد تحديثات بعد." },
  featuredAreas: { en: "Featured Areas", ar: "المناطق المميزة" },
  verifiedInstallments: { en: "Verified listings and installment options", ar: "إعلانات موثقة وخيارات تقسيط" },
  browseCategories: { en: "Browse Categories", ar: "تصفح الفئات" },
  featuredListings: { en: "Featured Listings", ar: "العقارات المميزة" },
  viewAll: { en: "View all", ar: "عرض الكل" },
  recommendedForYou: { en: "Recommended for You", ar: "مقترح لك" },
  minPrice: { en: "Min Price", ar: "أقل سعر" },
  maxPrice: { en: "Max Price", ar: "أعلى سعر" },
  buy: { en: "Buy", ar: "شراء" },
  rent: { en: "Rent", ar: "إيجار" },
  vacation: { en: "Vacation", ar: "مصيف" },
  verified: { en: "Verified", ar: "موثق" },
  goodDeal: { en: "Good deal", ar: "صفقة جيدة" },
  sqm: { en: "sqm", ar: "م²" },
  beds: { en: "beds", ar: "غرف" },
  baths: { en: "baths", ar: "حمامات" },
  listedBy: { en: "Listed by", ar: "أضيف بواسطة" },
  viewDetails: { en: "View Details", ar: "عرض التفاصيل" },
  cash: { en: "Cash", ar: "كاش" },
  installments: { en: "Installments", ar: "تقسيط" }
} as const;

export type CommonTranslationKey = keyof typeof commonDictionary;

export function normalizeLanguage(value?: string | null): Language {
  return value === "ar" ? "ar" : "en";
}

export function t(language: Language, key: CommonTranslationKey) {
  return commonDictionary[key][language];
}

const transactionLabels: Record<TransactionType, { en: string; ar: string }> = {
  BUY: { en: "Buy", ar: "شراء" },
  RENT: { en: "Rent", ar: "إيجار" },
  VACATION: { en: "Vacation", ar: "مصيف" }
};

const paymentTypeLabels: Record<PaymentType, { en: string; ar: string }> = {
  CASH: { en: "Cash", ar: "كاش" },
  INSTALLMENTS: { en: "Installments", ar: "تقسيط" }
};

const locationLabels: Record<string, { en: string; ar: string }> = {
  Cairo: { en: "Cairo", ar: "القاهرة" },
  Giza: { en: "Giza", ar: "الجيزة" },
  "New Cairo": { en: "New Cairo", ar: "القاهرة الجديدة" },
  Heliopolis: { en: "Heliopolis", ar: "مصر الجديدة" },
  Maadi: { en: "Maadi", ar: "المعادي" },
  "6th of October": { en: "6th of October", ar: "6 أكتوبر" },
  SheikhZayed: { en: "Sheikh Zayed", ar: "الشيخ زايد" },
  "Fifth Settlement": { en: "Fifth Settlement", ar: "التجمع الخامس" },
  "North 90 Street": { en: "North 90 Street", ar: "شارع التسعين الشمالي" },
  "South Academy": { en: "South Academy", ar: "جنوب الأكاديمية" },
  Korba: { en: "Korba", ar: "الكوربة" },
  "El Nozha": { en: "El Nozha", ar: "النزهة" },
  "Ard El Golf": { en: "Ard El Golf", ar: "أرض الجولف" },
  Degla: { en: "Degla", ar: "دجلة" },
  Sarayat: { en: "Sarayat", ar: "سرايات" },
  "Zahraa Maadi": { en: "Zahraa Maadi", ar: "زهراء المعادي" },
  "Beverly Hills": { en: "Beverly Hills", ar: "بيفرلي هيلز" },
  "October Gardens": { en: "October Gardens", ar: "حدائق أكتوبر" },
  "Al Ashgar": { en: "Al Ashgar", ar: "الأشجار" },
  Allegria: { en: "Allegria", ar: "أليجريا" },
  "Zayed 2000": { en: "Zayed 2000", ar: "زايد 2000" },
  Greens: { en: "Greens", ar: "جرينز" }
};

export function translateTransaction(value: TransactionType, language: Language) {
  return transactionLabels[value][language];
}

export function translatePaymentType(value: PaymentType, language: Language) {
  return paymentTypeLabels[value][language];
}

export function translateLocation(value: string, language: Language) {
  return locationLabels[value]?.[language] ?? value;
}

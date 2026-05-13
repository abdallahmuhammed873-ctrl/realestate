import type {
  CompletionStatus,
  Furnishing,
  PaymentType,
  Property,
  PropertyType,
  TransactionType
} from "@/lib/types";

export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

export const LANGUAGE_COOKIE = "site-language";
export const LANGUAGE_STORAGE_KEY = "site-language";

type TranslationEntry = Record<Language, string>;
type TranslationSection = Record<string, TranslationEntry>;

const navigation = {
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
  home: { en: "Home", ar: "الرئيسية" },
  notify: { en: "Alerts", ar: "التنبيهات" },
  switchToArabic: { en: "AR", ar: "العربية" },
  switchToEnglish: { en: "EN", ar: "English" },
  languageToggleLabel: { en: "Switch language", ar: "تبديل اللغة" }
} satisfies TranslationSection;

const profile = {
  openProfileMenu: { en: "Open profile menu", ar: "فتح قائمة الملف الشخصي" },
  showProfile: { en: "Show Profile", ar: "عرض الملف الشخصي" },
  noPhoneAdded: { en: "No phone added", ar: "لم يتم إضافة رقم هاتف" },
  developer: { en: "Developer", ar: "المطور" }
} satisfies TranslationSection;

const chatbot = {
  aiAssistant: { en: "AI Assistant", ar: "المساعد الذكي" },
  assistant: { en: "Assistant", ar: "المساعد" },
  typeYourQuestion: { en: "Type your question", ar: "اكتب سؤالك" },
  send: { en: "Send", ar: "إرسال" },
  assistantGreeting: {
    en: "Hi, I can help you find properties. Budget? Buy, rent, or vacation?",
    ar: "مرحباً، يمكنني مساعدتك في العثور على عقار. ما الميزانية؟ شراء أم إيجار أم مصيف؟"
  }
} satisfies TranslationSection;

const home = {
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
  recommendedForYou: { en: "Recommended for You", ar: "مقترح لك" }
} satisfies TranslationSection;

const search = {
  minPrice: { en: "Min Price", ar: "أقل سعر" },
  maxPrice: { en: "Max Price", ar: "أعلى سعر" },
  keyword: { en: "Keyword", ar: "كلمة مفتاحية" },
  transaction: { en: "Transaction", ar: "نوع العملية" },
  propertyType: { en: "Property Type", ar: "نوع العقار" },
  city: { en: "City", ar: "المدينة" },
  area: { en: "Area", ar: "المنطقة" },
  district: { en: "District", ar: "الحي" },
  minArea: { en: "Min Area", ar: "أقل مساحة" },
  maxArea: { en: "Max Area", ar: "أكبر مساحة" },
  minBeds: { en: "Min Beds", ar: "أقل غرف" },
  maxBeds: { en: "Max Beds", ar: "أكثر غرف" },
  minBaths: { en: "Min Baths", ar: "أقل حمامات" },
  maxBaths: { en: "Max Baths", ar: "أكثر حمامات" },
  referenceLat: { en: "Reference Lat", ar: "خط العرض المرجعي" },
  referenceLng: { en: "Reference Lng", ar: "خط الطول المرجعي" },
  distanceKm: { en: "Distance (km)", ar: "المسافة (كم)" },
  payment: { en: "Payment", ar: "الدفع" },
  downPaymentMax: { en: "Down Payment <=", ar: "الدفعة المقدمة <=" },
  yearsMax: { en: "Years <=", ar: "السنوات <=" },
  monthlyMax: { en: "Monthly <=", ar: "القسط الشهري <=" },
  furnishing: { en: "Furnishing", ar: "التشطيب" },
  completion: { en: "Completion", ar: "التسليم" },
  amenities: { en: "Amenities", ar: "المميزات" },
  reset: { en: "Reset", ar: "إعادة ضبط" },
  filters: { en: "Filters", ar: "الفلاتر" },
  close: { en: "Close", ar: "إغلاق" },
  listingsFound: { en: "listings found", ar: "عقار مطابق" },
  noResultsMatched: { en: "No results matched. Try broadening filters.", ar: "لا توجد نتائج مطابقة. جرّب توسيع الفلاتر." },
  prev: { en: "Prev", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  pageXofY: { en: "Page {page} / {pages}", ar: "الصفحة {page} / {pages}" },
  sortFeatured: { en: "Featured", ar: "مميز" },
  sortNewest: { en: "Newest", ar: "الأحدث" },
  sortPriceAsc: { en: "Price Low to High", ar: "السعر من الأقل للأعلى" },
  sortPriceDesc: { en: "Price High to Low", ar: "السعر من الأعلى للأقل" },
  sortAreaDesc: { en: "Largest Area", ar: "أكبر مساحة" },
  sortDistanceAsc: { en: "Nearest", ar: "الأقرب" }
} satisfies TranslationSection;

const property = {
  buy: { en: "Buy", ar: "شراء" },
  rent: { en: "Rent", ar: "إيجار" },
  vacation: { en: "Vacation", ar: "مصيف" },
  verified: { en: "Verified", ar: "موثق" },
  verifiedByPlatform: { en: "Verified by platform", ar: "موثق من المنصة" },
  goodDeal: { en: "Good deal", ar: "صفقة جيدة" },
  sqm: { en: "sqm", ar: "م²" },
  beds: { en: "beds", ar: "غرف" },
  baths: { en: "baths", ar: "حمامات" },
  listedBy: { en: "Listed by", ar: "أضيف بواسطة" },
  viewDetails: { en: "View Details", ar: "عرض التفاصيل" },
  cash: { en: "Cash", ar: "كاش" },
  installments: { en: "Installments", ar: "تقسيط" },
  details: { en: "Details", ar: "التفاصيل" },
  mapAndDistance: { en: "Map & Distance", ar: "الخريطة والمسافة" },
  coordinates: { en: "Coordinates", ar: "الإحداثيات" },
  bookViewing: { en: "Book Viewing", ar: "احجز معاينة" },
  appointmentRequested: { en: "Appointment Requested", ar: "تم طلب المعاينة" },
  appointmentRequestedDesc: {
    en: "We sent your request to the seller. You will receive a notification update soon.",
    ar: "أرسلنا طلبك إلى البائع. ستصلك إشعارات بالتحديث قريباً."
  },
  bookViewingTitle: { en: "Book a Viewing", ar: "احجز معاينة" },
  contactName: { en: "Contact name", ar: "اسم التواصل" },
  contactPhone: { en: "Contact phone", ar: "رقم التواصل" },
  notesOptional: { en: "Notes (optional)", ar: "ملاحظات (اختياري)" },
  confirm: { en: "Confirm", ar: "تأكيد" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  closeButton: { en: "Close", ar: "إغلاق" },
  phoneValidation: {
    en: "Phone number must be 11 digits and start with 01.",
    ar: "رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ 01."
  },
  submitFailed: { en: "Failed to submit request.", ar: "فشل إرسال الطلب." },
  previousPhoto: { en: "Previous photo", ar: "الصورة السابقة" },
  nextPhoto: { en: "Next photo", ar: "الصورة التالية" },
  showImage: { en: "Show image {index}", ar: "عرض الصورة {index}" },
  imageAlt: { en: "{title} image {index}", ar: "صورة {title} رقم {index}" },
  panoramaTitle: { en: "360 Tour", ar: "جولة 360" },
  panoramaDescription: {
    en: "Interactive panorama view for this property.",
    ar: "عرض بانورامي تفاعلي لهذا العقار."
  },
  panoramaAlt: { en: "{title} 360 panorama", ar: "بانوراما 360 لعقار {title}" },
  panoramaAltIndexed: { en: "{title} 360 panorama {index}", ar: "بانوراما 360 لعقار {title} رقم {index}" },
  panoramaViewLabel: { en: "360 View {index}", ar: "عرض 360 رقم {index}" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  call: { en: "Call", ar: "اتصال" },
  recommendedForYou: { en: "Recommended for you", ar: "مقترح لك" },
  savedListings: { en: "Saved Listings", ar: "العقارات المحفوظة" },
  loginToViewFavorites: { en: "Login to view favorites", ar: "سجّل الدخول لعرض المفضلة" },
  saveListingsHint: {
    en: "Save listings, compare later, and get recommendations.",
    ar: "احفظ العقارات، وقارن لاحقاً، واحصل على توصيات."
  },
  goToLogin: { en: "Go to Login", ar: "اذهب إلى تسجيل الدخول" },
  noFavoritesYet: { en: "No favorites yet.", ar: "لا توجد عقارات مفضلة بعد." },
  compareProperties: { en: "Compare Properties", ar: "مقارنة العقارات" },
  noComparedPropertiesYet: { en: "No compared properties yet.", ar: "لا توجد عقارات للمقارنة بعد." },
  clearCompare: { en: "Clear Compare", ar: "مسح المقارنة" },
  field: { en: "Field", ar: "الحقل" },
  priceLabel: { en: "Price", ar: "السعر" },
  location: { en: "Location", ar: "الموقع" },
  typeLabel: { en: "Type", ar: "النوع" },
  bedsBaths: { en: "Beds/Baths", ar: "غرف/حمامات" },
  areaLabel: { en: "Area", ar: "المساحة" },
  paymentLabel: { en: "Payment", ar: "الدفع" },
  furnishingLabel: { en: "Furnishing", ar: "التشطيب" }
} satisfies TranslationSection;

const seller = {
  sellerAccessRequired: { en: "Seller access required. Login as seller.", ar: "مطلوب حساب بائع. سجّل الدخول كبائع." },
  createListing: { en: "Create Listing", ar: "إنشاء إعلان" },
  title: { en: "Title", ar: "العنوان" },
  titleEnglishOptional: { en: "Title (English, optional)", ar: "العنوان (إنجليزي، اختياري)" },
  titleArabicOptional: { en: "Title (Arabic, optional)", ar: "العنوان (عربي، اختياري)" },
  description: { en: "Description", ar: "الوصف" },
  descriptionEnglishOptional: { en: "Description (English, optional)", ar: "الوصف (إنجليزي، اختياري)" },
  descriptionArabicOptional: { en: "Description (Arabic, optional)", ar: "الوصف (عربي، اختياري)" },
  address: { en: "Address", ar: "العنوان" },
  latitude: { en: "Lat", ar: "خط العرض" },
  longitude: { en: "Lng", ar: "خط الطول" },
  pickLocationOnMap: { en: "Pick Location on Map", ar: "حدد الموقع على الخريطة" },
  mapHelper: {
    en: "Click on map or drag marker to set exact property location.",
    ar: "اضغط على الخريطة أو حرّك العلامة لتحديد موقع العقار بدقة."
  },
  price: { en: "Price", ar: "السعر" },
  rentPrice: { en: "Rent Price", ar: "سعر الإيجار" },
  downPayment: { en: "Down Payment", ar: "الدفعة المقدمة" },
  years: { en: "Years", ar: "السنوات" },
  monthly: { en: "Monthly", ar: "القسط الشهري" },
  areaSqmLabel: { en: "Area sqm", ar: "المساحة م²" },
  amenitiesCommaSeparated: { en: "Amenities comma separated", ar: "المميزات مفصولة بفواصل" },
  propertyPhotos: { en: "Property Photos", ar: "صور العقار" },
  propertyPhotosHelp: {
    en: "Upload up to 12 JPG, PNG, or WebP images. Each file must be 6MB or smaller.",
    ar: "ارفع حتى 12 صورة JPG أو PNG أو WebP. يجب ألا يتجاوز كل ملف 6 ميجابايت."
  },
  panoramaFiles: { en: "360 Panorama Files", ar: "ملفات بانوراما 360" },
  panoramaFilesHelp: {
    en: "Upload up to 6 panorama images. Wide equirectangular JPG, PNG, or WebP files work best.",
    ar: "ارفع حتى 6 صور بانوراما. تعمل الصور العريضة المتساوية الاستطالة JPG أو PNG أو WebP بشكل أفضل."
  },
  viewerLabel: { en: "Viewer label", ar: "اسم العرض" },
  photoLabel: { en: "Photo label", ar: "اسم الصورة" },
  panoramaAltText: { en: "360 alt text", ar: "نص بديل 360" },
  photoAltText: { en: "Photo alt text", ar: "نص بديل للصورة" },
  remove: { en: "Remove", ar: "حذف" },
  optionalPanoramaHint: {
    en: "Optional. Add one or more wide equirectangular images for the 360 viewer.",
    ar: "اختياري. أضف صورة أو أكثر بانورامية عريضة لعارض 360."
  },
  uploadPhotoHint: {
    en: "Upload one or more standard listing photos from your device.",
    ar: "ارفع صورة أو أكثر من صور الإعلان من جهازك."
  },
  uploadingMedia: { en: "Uploading media...", ar: "جارٍ رفع الوسائط..." },
  submitForApproval: { en: "Submit for Approval", ar: "إرسال للمراجعة" },
  proceedToPay: { en: "Proceed to Pay", ar: "المتابعة للدفع" },
  fillRequiredFields: {
    en: "Please fill all required fields before submitting.",
    ar: "يرجى تعبئة كل الحقول المطلوبة قبل الإرسال."
  },
  uploadOnePhoto: {
    en: "Please upload at least one standard property photo.",
    ar: "يرجى رفع صورة عقار عادية واحدة على الأقل."
  },
  waitForUploads: { en: "Please wait for uploads to finish.", ar: "يرجى انتظار اكتمال رفع الملفات." },
  uploadPhotoLimit: { en: "You can upload up to 12 photos per listing.", ar: "يمكنك رفع حتى 12 صورة لكل إعلان." },
  uploadPanoramaLimit: {
    en: "You can upload up to 6 panorama files per listing.",
    ar: "يمكنك رفع حتى 6 ملفات بانوراما لكل إعلان."
  },
  uploadFailed: {
    en: "Could not upload one or more files. Please try again.",
    ar: "تعذر رفع ملف أو أكثر. حاول مرة أخرى."
  },
  tempCleanupFailed: {
    en: "File removed locally, but the temporary upload could not be cleaned up.",
    ar: "تم حذف الملف من الواجهة، لكن تعذر تنظيف الرفع المؤقت."
  },
  sourceLanguageTitle: { en: "Primary language content", ar: "محتوى اللغة الأساسية" }
} satisfies TranslationSection;

const footer = {
  appDescription: {
    en: "Verified properties with trusted payment and installment workflows.",
    ar: "عقارات موثقة مع مسارات دفع وتقسيط موثوقة."
  },
  downloadOnThe: { en: "Download on the", ar: "حمّل من" },
  getItOn: { en: "GET IT ON", ar: "حمّل عبر" },
  appStore: { en: "App Store", ar: "آب ستور" },
  googlePlay: { en: "Google Play", ar: "جوجل بلاي" },
  appStoreAria: { en: "Download on the App Store", ar: "حمّل من آب ستور" },
  googlePlayAria: { en: "Get it on Google Play", ar: "حمّل من جوجل بلاي" },
  linkComingSoon: { en: "{label} link coming soon", ar: "رابط {label} قريباً" },
  explore: { en: "Explore", ar: "استكشف" },
  aboutUs: { en: "About us", ar: "من نحن" },
  account: { en: "Account", ar: "الحساب" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  followUs: { en: "Follow us", ar: "تابعنا" },
  thankYou: { en: "Thank you for visiting.", ar: "شكراً لزيارتك." }
} satisfies TranslationSection;

const admin = {
  adminAccessRequired: { en: "Admin access required.", ar: "مطلوب حساب إدارة." }
} satisfies TranslationSection;

export const dictionaries = {
  navigation,
  profile,
  chatbot,
  home,
  search,
  property,
  seller,
  footer,
  admin
} as const;

function flattenSections(source: Record<string, TranslationSection>) {
  return Object.values(source).reduce<Record<string, TranslationEntry>>((acc, section) => {
    for (const [key, value] of Object.entries(section)) acc[key] = value;
    return acc;
  }, {});
}

export const commonDictionary = flattenSections(dictionaries);
export type CommonTranslationKey = keyof typeof commonDictionary;

export function normalizeLanguage(value?: string | null): Language {
  return value === "ar" ? "ar" : "en";
}

export function getLanguageDirection(language: Language): Direction {
  return language === "ar" ? "rtl" : "ltr";
}

export function t(language: Language, key: CommonTranslationKey, params?: Record<string, string | number>) {
  const template = commonDictionary[key]?.[language] ?? commonDictionary[key]?.en ?? String(key);
  if (!params) return template;

  return Object.entries(params).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
    template
  );
}

const transactionLabels: Record<TransactionType, TranslationEntry> = {
  BUY: property.buy,
  RENT: property.rent,
  VACATION: property.vacation
};

const paymentTypeLabels: Record<PaymentType, TranslationEntry> = {
  CASH: property.cash,
  INSTALLMENTS: property.installments
};

const propertyTypeLabels: Record<PropertyType, TranslationEntry> = {
  APARTMENT: { en: "Apartment", ar: "شقة" },
  VILLA: { en: "Villa", ar: "فيلا" },
  DUPLEX: { en: "Duplex", ar: "دوبلكس" },
  PENTHOUSE: { en: "Penthouse", ar: "بنتهاوس" },
  CHALET: { en: "Chalet", ar: "شاليه" },
  LAND: { en: "Land", ar: "أرض" },
  COMMERCIAL: { en: "Commercial", ar: "تجاري" }
};

const furnishingLabels: Record<Furnishing, TranslationEntry> = {
  FULLY: { en: "Fully", ar: "مفروش" },
  SEMI: { en: "Semi", ar: "نصف تشطيب" },
  UNFURNISHED: { en: "Unfurnished", ar: "بدون فرش" }
};

const completionStatusLabels: Record<CompletionStatus, TranslationEntry> = {
  OFF_PLAN: { en: "Off-plan", ar: "تحت الإنشاء" },
  READY: { en: "Ready", ar: "جاهز" }
};

const sortLabels: Record<string, TranslationEntry> = {
  FEATURED: search.sortFeatured,
  NEWEST: search.sortNewest,
  PRICE_ASC: search.sortPriceAsc,
  PRICE_DESC: search.sortPriceDesc,
  AREA_DESC: search.sortAreaDesc,
  DISTANCE_ASC: search.sortDistanceAsc
};

const locationLabels: Record<string, TranslationEntry> = {
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

const amenityLabels: Record<string, TranslationEntry> = {
  "A/C": { en: "A/C", ar: "تكييف" },
  Balcony: { en: "Balcony", ar: "بلكونة" },
  Parking: { en: "Parking", ar: "جراج" },
  Pool: { en: "Pool", ar: "حمام سباحة" },
  Gym: { en: "Gym", ar: "جيم" },
  "Pets Allowed": { en: "Pets Allowed", ar: "مسموح بالحيوانات" },
  Elevator: { en: "Elevator", ar: "مصعد" },
  Security: { en: "Security", ar: "أمن" },
  Garden: { en: "Garden", ar: "حديقة" },
  Storage: { en: "Storage", ar: "مخزن" }
};

export function translateTransaction(value: TransactionType, language: Language) {
  return transactionLabels[value][language];
}

export function translatePaymentType(value: PaymentType, language: Language) {
  return paymentTypeLabels[value][language];
}

export function translatePropertyType(value: PropertyType, language: Language) {
  return propertyTypeLabels[value][language];
}

export function translateFurnishing(value: Furnishing, language: Language) {
  return furnishingLabels[value][language];
}

export function translateCompletionStatus(value: CompletionStatus, language: Language) {
  return completionStatusLabels[value][language];
}

export function translateLocation(value: string, language: Language) {
  return locationLabels[value]?.[language] ?? value;
}

export function translateAmenity(value: string, language: Language) {
  return amenityLabels[value]?.[language] ?? value;
}

export function translateSortOption(value: string, language: Language) {
  return sortLabels[value]?.[language] ?? value;
}

export function getLocalizedContent(
  language: Language,
  source: { defaultValue?: string | null; en?: string | null; ar?: string | null }
) {
  const requested = language === "ar" ? source.ar : source.en;
  const fallback = language === "ar" ? source.en : source.ar;
  return requested?.trim() || source.defaultValue?.trim() || fallback?.trim() || "";
}

export function getLocalizedPropertyTitle(property: Pick<Property, "title" | "titleEn" | "titleAr">, language: Language) {
  return getLocalizedContent(language, {
    defaultValue: property.title,
    en: property.titleEn,
    ar: property.titleAr
  });
}

export function getLocalizedPropertyDescription(
  property: Pick<Property, "description" | "descriptionEn" | "descriptionAr">,
  language: Language
) {
  return getLocalizedContent(language, {
    defaultValue: property.description,
    en: property.descriptionEn,
    ar: property.descriptionAr
  });
}

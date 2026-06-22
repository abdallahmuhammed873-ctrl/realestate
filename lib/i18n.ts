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
  aiPrice: { en: "AI Price", ar: "السعر الذكي" },
  analytics: { en: "Analytics", ar: "التحليلات" },
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
  languageToggleLabel: { en: "Switch language", ar: "تبديل اللغة" },
  switchToDarkMode: { en: "Switch to dark mode", ar: "التبديل إلى الوضع الداكن" },
  switchToLightMode: { en: "Switch to light mode", ar: "التبديل إلى الوضع الفاتح" },
  darkMode: { en: "Dark", ar: "داكن" },
  lightMode: { en: "Light", ar: "فاتح" }
} satisfies TranslationSection;

const profile = {
  sellerProfile: { en: "Seller Profile", ar: "ملف البائع" },
  developerProfile: { en: "Developer Profile", ar: "ملف المطور" },
  adminProfile: { en: "Admin Profile", ar: "ملف الإدارة" },
  role: { en: "Role", ar: "الدور" },
  company: { en: "Company", ar: "الشركة" },
  profileUpdated: { en: "Profile updated.", ar: "تم تحديث الملف الشخصي." },
  profilePictureUpdated: { en: "Profile picture updated.", ar: "تم تحديث صورة الملف الشخصي." },
  profilePictureRemoved: { en: "Profile picture removed.", ar: "تمت إزالة صورة الملف الشخصي." },
  failedToUpdateProfile: { en: "Failed to update profile.", ar: "تعذر تحديث الملف الشخصي." },
  failedToUpdateAvatar: { en: "Failed to update avatar.", ar: "تعذر تحديث الصورة الشخصية." },
  failedToUploadAvatar: { en: "Failed to upload avatar.", ar: "تعذر رفع الصورة الشخصية." },
  failedToRemoveAvatar: { en: "Failed to remove avatar.", ar: "تعذر إزالة الصورة الشخصية." },
  addProfilePicture: { en: "Add Profile Picture", ar: "إضافة صورة شخصية" },
  removePicture: { en: "Remove Picture", ar: "إزالة الصورة" },
  editProfile: { en: "Edit Profile", ar: "تعديل الملف الشخصي" },
  cancelEdit: { en: "Cancel Edit", ar: "إلغاء التعديل" },
  saveChanges: { en: "Save Changes", ar: "حفظ التغييرات" },
  saving: { en: "Saving...", ar: "جارٍ الحفظ..." },
  uploading: { en: "Uploading...", ar: "جارٍ الرفع..." },
  profileImageAlt: { en: "{name} profile", ar: "الملف الشخصي لـ {name}" },
  myPosts: { en: "My Posts", ar: "\u0645\u0646\u0634\u0648\u0631\u0627\u062a\u064a" },
  companyPosts: { en: "Company Posts", ar: "\u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629" },
  backToProfile: { en: "Back to Profile", ar: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a" },
  propertyPosts: { en: "Property Posts", ar: "\u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a" },
  noCommunityPostsYet: { en: "No community posts yet.", ar: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0645\u062c\u062a\u0645\u0639 \u0628\u0639\u062f." },
  noCompanyPostsYet: { en: "No company posts yet.", ar: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0644\u0644\u0634\u0631\u0643\u0629 \u0628\u0639\u062f." },
  newListing: { en: "New Listing", ar: "إعلان جديد" },
  noListingsYet: { en: "No listings yet.", ar: "لا توجد إعلانات بعد." },
  updatedAtLabel: { en: "Updated: {value}", ar: "آخر تحديث: {value}" },
  createdByLabel: { en: "Created by: {name}", ar: "تم الإنشاء بواسطة: {name}" },
  companyUserSuffix: { en: "(Company User)", ar: "(مستخدم شركة)" },
  deleting: { en: "Deleting...", ar: "جارٍ الحذف..." },
  deleteListing: { en: "Delete", ar: "حذف" },
  editListing: { en: "Edit Listing", ar: "تعديل الإعلان" },
  deleteListingConfirm: {
    en: "Delete this listing? This will remove it from the platform.",
    ar: "هل تريد حذف هذا الإعلان؟ سيتم إزالته من المنصة."
  },
  failedToDeleteListing: { en: "Failed to delete listing.", ar: "تعذر حذف الإعلان." },
  userProfile: { en: "User Profile", ar: "الملف الشخصي" },
  openProfileMenu: { en: "Open profile menu", ar: "فتح قائمة الملف الشخصي" },
  showProfile: { en: "Show Profile", ar: "عرض الملف الشخصي" },
  noPhoneAdded: { en: "No phone added", ar: "لم يتم إضافة رقم هاتف" },
  developer: { en: "Developer", ar: "المطور" }
} satisfies TranslationSection;

const soldActions = {
  soldListing: { en: "Sold", ar: "\u0645\u0628\u0627\u0639" },
  markingSold: { en: "Marking sold...", ar: "\u062c\u0627\u0631\u064d \u062a\u0639\u0644\u064a\u0645\u0647 \u0643\u0645\u0628\u0627\u0639..." },
  soldListingConfirm: {
    en: "Are you sure you want to mark this property as sold?",
    ar: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0623\u0646\u0643 \u062a\u0631\u064a\u062f \u062a\u0639\u0644\u064a\u0645 \u0647\u0630\u0627 \u0627\u0644\u0639\u0642\u0627\u0631 \u0643\u0645\u0628\u0627\u0639\u061f"
  },
  failedToMarkSold: { en: "Failed to mark property as sold.", ar: "\u062a\u0639\u0630\u0631 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0639\u0642\u0627\u0631 \u0643\u0645\u0628\u0627\u0639." },
  propertyMarkedSold: { en: "Property marked as sold.", ar: "\u062a\u0645 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0639\u0642\u0627\u0631 \u0643\u0645\u0628\u0627\u0639." }
} satisfies TranslationSection;

const chatbot = {
  sending: { en: "Sending...", ar: "جارٍ الإرسال..." },
  you: { en: "You", ar: "أنت" },
  assistantError: {
    en: "Sorry, I could not complete that request right now.",
    ar: "عذرًا، تعذر إكمال هذا الطلب الآن."
  },
  openAssistant: { en: "Open AI assistant", ar: "فتح المساعد الذكي" },
  closeAssistant: { en: "Close AI assistant", ar: "إغلاق المساعد الذكي" },
  aiAssistant: { en: "AI Assistant", ar: "المساعد الذكي" },
  assistant: { en: "Assistant", ar: "المساعد" },
  assistantSubtitle: {
    en: "Smarter property guidance with faster next steps.",
    ar: "إرشاد عقاري أذكى مع خطوات أسرع."
  },
  assistantReady: { en: "Ready", ar: "جاهز" },
  assistantSearching: { en: "Searching", ar: "يبحث" },
  assistantThinking: {
    en: "Checking listings and matching your request...",
    ar: "يجري فحص العقارات ومطابقة طلبك..."
  },
  assistantInputHint: {
    en: "Try budget, city, deal type, or property type in one message.",
    ar: "اذكر الميزانية أو المدينة أو نوع العملية أو نوع العقار في رسالة واحدة."
  },
  assistantNoResultsHint: {
    en: "Tip: add a budget, neighborhood, or property type to get a better match.",
    ar: "نصيحة: أضف الميزانية أو الحي أو نوع العقار للحصول على نتائج أدق."
  },
  assistantTryThese: { en: "Try one of these", ar: "جرّب أحد هذه الاقتراحات" },
  clearChat: { en: "Clear chat", ar: "مسح المحادثة" },
  typeYourQuestion: {
    en: "Ask for area, budget, and deal type",
    ar: "اسأل عن المنطقة والميزانية ونوع العملية"
  },
  send: { en: "Send", ar: "إرسال" },
  assistantGreeting: {
    en: "Tell me the city, budget, and whether you want to buy, rent, or vacation. I will narrow the best matches for you.",
    ar: "اذكر المدينة والميزانية وهل تريد شراء أم إيجار أم مصيف، وسأقوم بتضييق أفضل النتائج لك."
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
  has360View: { en: "360 View", ar: "عرض 360" },
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
  sellerDashboard: { en: "Seller Dashboard", ar: "لوحة البائع" },
  companyUsers: { en: "Company Users", ar: "مستخدمو الشركة" },
  yourListings: { en: "Your Listings", ar: "إعلاناتك" },
  companyUsersOnly: { en: "Only company-signed-up accounts can manage users.", ar: "فقط الحسابات المسجلة كشركات يمكنها إدارة المستخدمين." },
  sellerOrDeveloperAccessRequired: { en: "Seller or developer access required. Login first.", ar: "مطلوب حساب بائع أو مطور. سجّل الدخول أولًا." },
  listingPayment: { en: "Listing Payment", ar: "دفع الإعلان" },
  backToListingDetails: { en: "Back to Listing Details", ar: "العودة إلى تفاصيل الإعلان" },
  payToPublishListing: { en: "Pay to Publish Listing", ar: "ادفع لنشر الإعلان" },
  paymentAfterSuccess: {
    en: "Your listing will be submitted for admin approval after successful payment.",
    ar: "سيتم إرسال إعلانك إلى الإدارة للموافقة بعد نجاح عملية الدفع."
  },
  listingFeeNotice: {
    en: "In order to submit your listing, you have to pay listing fees of 500 EGP.",
    ar: "لإرسال إعلانك، يجب دفع رسوم إعلان بقيمة 500 جنيه مصري."
  },
  noListingDraftForPayment: {
    en: "No listing details found for payment. Please go back and click Next again.",
    ar: "لم يتم العثور على تفاصيل الإعلان للدفع. يُرجى العودة والضغط على التالي مرة أخرى."
  },
  noListingDraftFound: {
    en: "No listing draft found. Please return to listing details and click Next again.",
    ar: "لم يتم العثور على مسودة الإعلان. يُرجى العودة إلى تفاصيل الإعلان والضغط على التالي مرة أخرى."
  },
  cardholderName: { en: "Cardholder Name", ar: "اسم حامل البطاقة" },
  cardNumberLabel: { en: "Card Number (16 digits)", ar: "رقم البطاقة (16 رقمًا)" },
  expiryLabel: { en: "MM/YY", ar: "شهر/سنة" },
  cvvLabel: { en: "CVV (3 digits)", ar: "رمز CVV (3 أرقام)" },
  allPaymentFieldsRequired: { en: "All payment fields are required.", ar: "جميع حقول الدفع مطلوبة." },
  cardNumberExact: { en: "Card number must be exactly 16 digits.", ar: "يجب أن يكون رقم البطاقة 16 رقمًا بالضبط." },
  expiryFormat: { en: "Expiry must be in MM/YY format.", ar: "يجب أن يكون تاريخ الانتهاء بصيغة شهر/سنة." },
  expiryMonthRange: { en: "Expiry month must be between 01 and 12.", ar: "يجب أن يكون شهر الانتهاء بين 01 و12." },
  cvvExact: { en: "CVV must be exactly 3 digits.", ar: "يجب أن يكون رمز CVV مكوّنًا من 3 أرقام." },
  usingSavedCard: { en: "Using saved card ending {digits}.", ar: "يتم استخدام بطاقة محفوظة تنتهي بـ {digits}." },
  paymentAcceptedListingFailed: {
    en: "Payment accepted, but listing submission failed.",
    ar: "تم قبول الدفع، لكن تعذر إرسال الإعلان."
  },
  paymentSuccessfulListingSubmitted: {
    en: "Payment successful. Listing submitted for admin approval.",
    ar: "تم الدفع بنجاح. أُرسل الإعلان إلى الإدارة للموافقة."
  },
  processingPayment: { en: "Processing Payment...", ar: "جارٍ معالجة الدفع..." },
  payAndSubmitForApproval: { en: "Pay & Submit for Approval", ar: "ادفع وأرسل للموافقة" },
  listingSubmitted: { en: "Listing Submitted", ar: "تم إرسال الإعلان" },
  listingSubmittedThanks: {
    en: "Thanks for completing the listing, please wait for 2-3 business days until an admin review!",
    ar: "شكرًا لإكمال الإعلان. يُرجى الانتظار من يومين إلى ثلاثة أيام عمل حتى تتم مراجعته من الإدارة."
  },
  goToDashboard: { en: "Go to Dashboard", ar: "الذهاب إلى اللوحة" },
  addCompanyUser: { en: "Add Company User", ar: "إضافة مستخدم شركة" },
  createUsersUnderCompany: { en: "Create users under your company account.", ar: "أنشئ مستخدمين تحت حساب شركتك." },
  userName: { en: "User name", ar: "اسم المستخدم" },
  userEmail: { en: "User email", ar: "بريد المستخدم" },
  userPhoneOptional: { en: "User phone (optional)", ar: "هاتف المستخدم (اختياري)" },
  addUser: { en: "Add User", ar: "إضافة مستخدم" },
  noCompanyUsersFound: { en: "No company users found.", ar: "لا يوجد مستخدمون للشركة." },
  deactivated: { en: "Deactivated", ar: "معطل" },
  reactivate: { en: "Reactivate", ar: "إعادة التفعيل" },
  deactivate: { en: "Deactivate", ar: "تعطيل" },
  addUserFailed: { en: "Failed to add user.", ar: "تعذر إضافة المستخدم." },
  updateUserFailed: { en: "Failed to update user.", ar: "تعذر تحديث المستخدم." },
  nameEmailPasswordRequired: { en: "Name, email, and password are required.", ar: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة." },
  approve: { en: "Approve", ar: "موافقة" },
  cancelRequest: { en: "Cancel request", ar: "إلغاء الطلب" },
  reschedule: { en: "Reschedule", ar: "إعادة الجدولة" },
  closeEdit: { en: "Close Edit", ar: "إغلاق التعديل" },
  edit: { en: "Edit", ar: "تعديل" },
  suggestSlotsHint: { en: "Suggest up to 3 slots for buyer to choose.", ar: "اقترح حتى 3 مواعيد ليختار المشتري منها." },
  sendSuggestedSlots: { en: "Send Suggested Slots", ar: "إرسال المواعيد المقترحة" },
  failedToUpdateAppointment: { en: "Failed to update appointment", ar: "تعذر تحديث الموعد" },
  sellerAccessRequired: { en: "Seller access required. Login as seller.", ar: "مطلوب حساب بائع. سجّل الدخول كبائع." },
  createListing: { en: "Create Listing", ar: "إنشاء إعلان" },
  title: { en: "Title", ar: "العنوان" },
  titleEnglishOptional: { en: "Title (English, optional)", ar: "العنوان (إنجليزي، اختياري)" },
  titleArabicOptional: { en: "Title (Arabic, optional)", ar: "العنوان (عربي، اختياري)" },
  description: { en: "Description", ar: "الوصف" },
  descriptionEnglishOptional: { en: "Description (English, optional)", ar: "الوصف (إنجليزي، اختياري)" },
  descriptionArabicOptional: { en: "Description (Arabic, optional)", ar: "الوصف (عربي، اختياري)" },
  projectNameOptional: { en: "Project name (optional)", ar: "اسم المشروع (اختياري)" },
  unitCodeOptional: { en: "Unit code (optional)", ar: "كود الوحدة (اختياري)" },
  projectUnitHint: {
    en: "Add project and unit details when they matter for admin review or inventory matching.",
    ar: "أضف تفاصيل المشروع والوحدة عندما تكون مهمة للمراجعة أو لمطابقة المخزون."
  },
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
  adminOverview: { en: "Admin Overview", ar: "نظرة عامة للإدارة" },
  pendingApprovals: { en: "Pending approvals", ar: "الموافقات المعلقة" },
  openPendingQueue: { en: "Open Pending Queue", ar: "فتح قائمة المراجعة المعلقة" },
  viewSellerProfiles: { en: "View Seller Profiles", ar: "عرض ملفات البائعين" },
  viewDeveloperProfiles: { en: "View Developer Profiles", ar: "عرض ملفات المطورين" },
  viewBuyerProfiles: { en: "View Buyer Profiles", ar: "عرض ملفات المشترين" },
  openApprovedQueue: { en: "Open Approved Queue", ar: "فتح قائمة المقبول" },
  openRejectedQueue: { en: "Open Rejected Queue", ar: "فتح قائمة المرفوض" },
  allPendingListings: { en: "All Pending Listings", ar: "جميع الإعلانات المعلقة" },
  pendingReview: { en: "Pending Review", ar: "قيد المراجعة" },
  feesPaid: { en: "Fees Paid", ar: "تم دفع الرسوم" },
  feesUnpaid: { en: "Fees Unpaid", ar: "الرسوم غير مدفوعة" },
  sellerLabel: { en: "Seller: {name} ({email})", ar: "البائع: {name} ({email})" },
  companyLabel: { en: "Company: {name}", ar: "الشركة: {name}" },
  sourceManual: { en: "Manual listing", ar: "إعلان يدوي" },
  sourceImported: { en: "Imported inventory", ar: "مخزون مستورد" },
  inventoryStatusLabel: { en: "Inventory status: {value}", ar: "حالة المخزون: {value}" },
  updatedAtLabel: { en: "Updated: {value}", ar: "آخر تحديث: {value}" },
  reviewListing: { en: "Review Listing", ar: "مراجعة الإعلان" },
  noPendingListings: { en: "No pending listings.", ar: "لا توجد إعلانات معلقة." },
  approvedStatus: { en: "Approved", ar: "مقبول" },
  rejectedStatus: { en: "Rejected", ar: "مرفوض" },
  noApprovedListings: { en: "No approved listings.", ar: "لا توجد إعلانات مقبولة." },
  noRejectedListings: { en: "No rejected listings.", ar: "لا توجد إعلانات مرفوضة." },
  reviewedAt: { en: "Reviewed: {value}", ar: "تمت المراجعة: {value}" },
  notesLabel: { en: "Notes: {value}", ar: "ملاحظات: {value}" },
  viewListing: { en: "View listing", ar: "عرض الإعلان" },
  pendingApprovalsPage: { en: "Pending Approvals", ar: "الموافقات المعلقة" },
  approvedQueue: { en: "Approved Queue", ar: "قائمة المقبول" },
  rejectedQueue: { en: "Rejected Queue", ar: "قائمة المرفوض" },
  sellerProfiles: { en: "Seller Profiles", ar: "ملفات البائعين" },
  buyerProfiles: { en: "Buyer Profiles", ar: "ملفات المشترين" },
  developerProfiles: { en: "Developer Profiles", ar: "ملفات المطورين" },
  addBuyer: { en: "Add Buyer", ar: "إضافة مشترٍ" },
  createBuyerManually: { en: "Create a buyer account manually.", ar: "أنشئ حساب مشترٍ يدويًا." },
  buyerName: { en: "Buyer name", ar: "اسم المشتري" },
  buyerEmail: { en: "Buyer email", ar: "بريد المشتري" },
  buyerPhoneOptional: { en: "Buyer phone (optional)", ar: "هاتف المشتري (اختياري)" },
  buyerPassword: { en: "Buyer password", ar: "كلمة مرور المشتري" },
  addBuyerFailed: { en: "Failed to add buyer.", ar: "تعذر إضافة المشتري." },
  updateBuyerFailed: { en: "Failed to update buyer.", ar: "تعذر تحديث المشتري." },
  removeBuyerFailed: { en: "Failed to remove buyer.", ar: "تعذر إزالة المشتري." },
  noBuyerProfiles: { en: "No buyer profiles found.", ar: "لا توجد ملفات مشترين." },
  searchTitle: { en: "Search", ar: "بحث" },
  searchBuyersByName: { en: "Search buyers by name.", ar: "ابحث عن المشترين بالاسم." },
  searchSellersByName: { en: "Search sellers by name.", ar: "ابحث عن البائعين بالاسم." },
  searchDevelopersByName: { en: "Search developers by name.", ar: "ابحث عن المطورين بالاسم." },
  searchBuyerName: { en: "Search buyer name...", ar: "ابحث باسم المشتري..." },
  searchSellerName: { en: "Search seller name...", ar: "ابحث باسم البائع..." },
  searchDeveloperName: { en: "Search developer name...", ar: "ابحث باسم المطور..." },
  clearSearch: { en: "Clear", ar: "مسح" },
  showingResults: { en: "Showing {visible} of {total}", ar: "عرض {visible} من {total}" },
  noBuyersMatch: { en: "No buyers match “{value}”.", ar: "لا يوجد مشترون يطابقون “{value}”." },
  noSellersMatch: { en: "No sellers match “{value}”.", ar: "لا يوجد بائعون يطابقون “{value}”." },
  noDevelopersMatch: { en: "No developers match “{value}”.", ar: "لا يوجد مطورون يطابقون “{value}”." },
  noPhoneProvided: { en: "No phone provided", ar: "لا يوجد رقم هاتف" },
  blocked: { en: "Blocked", ar: "محظور" },
  active: { en: "Active", ar: "نشط" },
  unblock: { en: "Unblock", ar: "إلغاء الحظر" },
  block: { en: "Block", ar: "حظر" },
  remove: { en: "Remove", ar: "إزالة" },
  favoritesStat: { en: "Favorites: {count}", ar: "المفضلة: {count}" },
  appointmentsStat: { en: "Appointments: {count}", ar: "المواعيد: {count}" },
  savedSearchesStat: { en: "Saved searches: {count}", ar: "عمليات البحث المحفوظة: {count}" },
  addUserTitle: { en: "Add User", ar: "إضافة مستخدم" },
  createSellerManually: { en: "Create a seller user manually.", ar: "أنشئ مستخدم بائع يدويًا." },
  userEmailLabel: { en: "User email", ar: "بريد المستخدم" },
  userPasswordLabel: { en: "User password", ar: "كلمة مرور المستخدم" },
  noSellerProfiles: { en: "No seller profiles found.", ar: "لا توجد ملفات بائعين." },
  openProfile: { en: "Open Profile", ar: "فتح الملف" },
  totalStat: { en: "Total: {count}", ar: "الإجمالي: {count}" },
  approvedStat: { en: "Approved: {count}", ar: "مقبول: {count}" },
  pendingStat: { en: "Pending: {count}", ar: "معلق: {count}" },
  rejectedStat: { en: "Rejected: {count}", ar: "مرفوض: {count}" },
  addDeveloper: { en: "Add Developer", ar: "إضافة مطور" },
  createDeveloperManually: { en: "Create a developer account manually.", ar: "أنشئ حساب مطور يدويًا." },
  developerName: { en: "Developer name", ar: "اسم المطور" },
  developerEmail: { en: "Developer email", ar: "بريد المطور" },
  developerPhoneOptional: { en: "Developer phone (optional)", ar: "هاتف المطور (اختياري)" },
  developerPassword: { en: "Developer password", ar: "كلمة مرور المطور" },
  addDeveloperFailed: { en: "Failed to add developer.", ar: "تعذر إضافة المطور." },
  updateDeveloperFailed: { en: "Failed to update developer.", ar: "تعذر تحديث المطور." },
  removeDeveloperFailed: { en: "Failed to remove developer.", ar: "تعذر إزالة المطور." },
  noDeveloperProfiles: { en: "No developer profiles found.", ar: "لا توجد ملفات مطورين." },
  addBuyerValidation: { en: "Name and email are required.", ar: "الاسم والبريد الإلكتروني مطلوبان." },
  passwordMinValidation: { en: "Password must be at least 6 characters.", ar: "يجب أن تكون كلمة المرور 6 أحرف على الأقل." },
  adminNotes: { en: "Admin notes", ar: "ملاحظات الإدارة" },
  approveAction: { en: "Approve", ar: "موافقة" },
  rejectAction: { en: "Reject", ar: "رفض" },
  adminLogin: { en: "Admin Login", ar: "دخول الإدارة" },
  adminLoginRestricted: { en: "This login is restricted to admin accounts only.", ar: "هذا الدخول مخصص لحسابات الإدارة فقط." },
  adminEmailOrPhone: { en: "Admin email or phone", ar: "بريد أو هاتف الإدارة" },
  continueAsAdmin: { en: "Continue as Admin", ar: "المتابعة كإدارة" },
  adminLoginFailed: {
    en: "Admin login failed. Use admin@example.com and password 123456.",
    ar: "فشل دخول الإدارة. استخدم admin@example.com وكلمة المرور 123456."
  },
  adminDemoCredentials: { en: "Use admin@example.com / 123456.", ar: "استخدم admin@example.com / 123456." },
  adminAccessRequired: { en: "Admin access required.", ar: "مطلوب حساب إدارة." }
} satisfies TranslationSection;

const aiPrice = {
  priceEstimatorEyebrow: { en: "AI Price Estimator", ar: "مقدر السعر بالذكاء الاصطناعي" },
  priceEstimatorTitle: { en: "Estimate a fair property price", ar: "قدّر السعر العادل للعقار" },
  priceEstimatorDescription: {
    en: "Compare your property details against approved marketplace data to estimate price, expected range, and confidence.",
    ar: "قارن تفاصيل عقارك ببيانات السوق المعتمدة لتقدير السعر والنطاق المتوقع ودرجة الثقة."
  },
  areaSqm: { en: "Area in square meters", ar: "المساحة بالمتر المربع" },
  bedrooms: { en: "Bedrooms", ar: "غرف النوم" },
  bathrooms: { en: "Bathrooms", ar: "الحمامات" },
  furnishingStatus: { en: "Furnishing status", ar: "حالة الفرش" },
  completionStatusLabel: { en: "Finishing / completion status", ar: "حالة التشطيب / التسليم" },
  paymentTypeLabel: { en: "Payment type", ar: "نوع الدفع" },
  notSpecified: { en: "Not specified", ar: "غير محدد" },
  anyType: { en: "Any type", ar: "أي نوع" },
  anyPayment: { en: "Any payment", ar: "أي طريقة دفع" },
  estimatePrice: { en: "Estimate Price", ar: "تقدير السعر" },
  estimating: { en: "Estimating...", ar: "جارٍ التقدير..." },
  basedOnSimilarProperties: { en: "Based on similar properties", ar: "بناءً على عقارات مشابهة" },
  basedOnCityAverage: { en: "Based on city and type averages", ar: "بناءً على متوسط المدينة والنوع" },
  basedOnAiGuidance: { en: "Based on AI market guidance", ar: "بناءً على إرشاد السوق بالذكاء الاصطناعي" },
  estimatedPrice: { en: "Estimated Price", ar: "السعر المتوقع" },
  expectedRange: { en: "Expected Range", ar: "النطاق المتوقع" },
  confidenceScore: { en: "Confidence Score", ar: "درجة الثقة" },
  priceEstimatorEmptyHint: {
    en: "Enter property details to calculate a fair price from approved listings, with AI guidance when the database has no close match.",
    ar: "أدخل تفاصيل العقار لحساب سعر عادل من الإعلانات المعتمدة، مع إرشاد بالذكاء الاصطناعي إذا لم توجد مطابقة قريبة في قاعدة البيانات."
  },
  recentEstimates: { en: "Recent Estimates", ar: "آخر التقديرات" },
  confidenceValue: { en: "Confidence {value}", ar: "الثقة {value}" },
  recentEstimateSummary: { en: "{type} in {location}, {areaSqm} sqm", ar: "{type} في {location}، {areaSqm} متر مربع" },
  investmentPlannerEyebrow: { en: "AI Investment Planner", ar: "مخطط الاستثمار بالذكاء الاصطناعي" },
  investmentPlannerTitle: { en: "Plan what you can buy from your salary", ar: "خطط لما يمكنك شراؤه من راتبك" },
  investmentPlannerDescription: {
    en: "Add your salary and desired features. Gemini will create plans when configured, and the system will still use matching database properties when available.",
    ar: "أضف راتبك والمواصفات المطلوبة. سيُنشئ Gemini خططًا عند تفعيله، وسيظل النظام يستخدم العقارات المطابقة من قاعدة البيانات عند توفرها."
  },
  monthlySalary: { en: "Monthly salary", ar: "الراتب الشهري" },
  monthlyExpenses: { en: "Monthly expenses", ar: "المصاريف الشهرية" },
  currentSavings: { en: "Current savings", ar: "المدخرات الحالية" },
  areaOrDistrict: { en: "Area or district", ar: "المنطقة أو الحي" },
  preferredPayment: { en: "Preferred payment", ar: "طريقة الدفع المفضلة" },
  riskLevel: { en: "Risk level", ar: "مستوى المخاطرة" },
  lowRisk: { en: "Low risk", ar: "مخاطرة منخفضة" },
  mediumRisk: { en: "Medium risk", ar: "مخاطرة متوسطة" },
  highRisk: { en: "High risk", ar: "مخاطرة عالية" },
  desiredFeatures: { en: "Features you want", ar: "المواصفات المطلوبة" },
  createInvestmentPlan: { en: "Create Investment Plan", ar: "إنشاء خطة استثمار" },
  creatingPlan: { en: "Creating plan...", ar: "جارٍ إنشاء الخطة..." },
  yourBuyingPlan: { en: "Your Buying Plan", ar: "خطة الشراء الخاصة بك" },
  geminiAiPlan: { en: "Gemini AI plan", ar: "خطة Gemini بالذكاء الاصطناعي" },
  localFallbackPlan: { en: "Local fallback plan", ar: "خطة محلية بديلة" },
  affordability: { en: "Affordability", ar: "القدرة الشرائية" },
  affordabilityLow: { en: "LOW", ar: "منخفضة" },
  affordabilityMedium: { en: "MEDIUM", ar: "متوسطة" },
  affordabilityHigh: { en: "HIGH", ar: "مرتفعة" },
  monthlyBudget: { en: "Monthly Budget", ar: "الميزانية الشهرية" },
  affordablePrice: { en: "Affordable Price", ar: "السعر المناسب" },
  planYearsLabel: { en: "{title} - about {years} years", ar: "{title} - حوالي {years} سنة" },
  planPaymentLine: {
    en: "Save {monthlySaving} monthly, target down payment {downPaymentTarget}, expected installment {installment}.",
    ar: "ادخر {monthlySaving} شهريًا، والدفعة المقدمة المستهدفة {downPaymentTarget}، والقسط المتوقع {installment}."
  },
  recommendations: { en: "Recommendations", ar: "التوصيات" },
  suitableDatabaseMatches: { en: "Suitable Database Matches", ar: "مطابقات مناسبة من قاعدة البيانات" },
  matchedPropertyLine: {
    en: "{price} | {city}, {area} | {bedrooms} beds | {areaSqm} sqm",
    ar: "{price} | {city}، {area} | {bedrooms} غرف | {areaSqm} متر مربع"
  },
  priceEstimatorGenericError: { en: "Could not calculate an estimate right now.", ar: "تعذر حساب التقدير الآن." },
  plannerGenericError: { en: "Could not create an investment plan right now.", ar: "تعذر إنشاء خطة الاستثمار الآن." },
  priceEstimatorValidationRequired: {
    en: "Please enter property type, city, and a valid area in square meters.",
    ar: "يرجى إدخال نوع العقار والمدينة ومساحة صحيحة بالمتر المربع."
  },
  investmentPlannerSalaryValidation: { en: "Please enter a valid monthly salary.", ar: "يرجى إدخال راتب شهري صحيح." },
  placeholderNewCairo: { en: "New Cairo", ar: "القاهرة الجديدة" },
  placeholderFifthSettlement: { en: "Fifth Settlement", ar: "التجمع الخامس" },
  placeholderNorthInvestors: { en: "North Investors", ar: "المستثمرين الشمالية" },
  placeholderAreaSqm: { en: "150", ar: "150" },
  placeholderBedrooms: { en: "3", ar: "3" },
  placeholderBathrooms: { en: "2", ar: "2" },
  placeholderSalary: { en: "30000", ar: "30000" },
  placeholderExpenses: { en: "12000", ar: "12000" },
  placeholderSavings: { en: "250000", ar: "250000" },
  placeholderNotes: {
    en: "Near university, good resale, ready to move, balcony...",
    ar: "قريب من الجامعة، إعادة بيع جيدة، جاهز للسكن، بلكونة..."
  },
  priceEstimateExplanationSimilar: {
    en: "Based on {count} similar approved properties in {location}. The estimate adjusts for size, rooms, furnishing, completion status, and payment type when provided.",
    ar: "بناءً على {count} عقارات معتمدة مشابهة في {location}. يراعي التقدير المساحة والغرف والفرش وحالة التسليم ونوع الدفع عند توفرها."
  },
  priceEstimateExplanationCityAverage: {
    en: "Based on {count} approved {propertyType} properties in {city}. The estimate adjusts for size, rooms, furnishing, completion status, and payment type when provided.",
    ar: "بناءً على {count} عقارات معتمدة من نوع {propertyType} في {city}. يراعي التقدير المساحة والغرف والفرش وحالة التسليم ونوع الدفع عند توفرها."
  },
  priceEstimateAiGuidanceExplanation: {
    en: "No enough matching approved database properties were found, so this is general AI market guidance. Treat it as a planning range, not a verified valuation.",
    ar: "لم يتم العثور على عقارات معتمدة كافية ومطابقة في قاعدة البيانات، لذلك فهذا إرشاد عام للسوق بالذكاء الاصطناعي. اعتبره نطاقًا للتخطيط وليس تقييمًا موثقًا."
  },
  plannerConservativePlan: { en: "Conservative plan", ar: "خطة محافظة" },
  plannerBalancedPlan: { en: "Balanced plan", ar: "خطة متوازنة" },
  plannerFastPlan: { en: "Fast plan", ar: "خطة سريعة" },
  plannerConservativeRecommendation: {
    en: "Build a stronger down payment first, then choose a unit with lower monthly installments.",
    ar: "كوّن دفعة مقدمة أقوى أولًا، ثم اختر وحدة بأقساط شهرية أقل."
  },
  plannerBalancedRecommendation: {
    en: "Best fit if you can keep expenses stable and avoid taking on extra debt.",
    ar: "أنسب خيار إذا استطعت تثبيت مصاريفك وتجنب ديون إضافية."
  },
  plannerFastRecommendation: {
    en: "Only use this if your income is stable and you have emergency savings.",
    ar: "استخدم هذه الخطة فقط إذا كان دخلك مستقرًا ولديك مدخرات للطوارئ."
  },
  plannerHighRecommendation: {
    en: "Your income looks strong for this target, so compare locations and resale value instead of only chasing the cheapest price.",
    ar: "دخلك يبدو مناسبًا لهذا الهدف، لذلك قارن بين المواقع وقيمة إعادة البيع بدلًا من البحث عن الأرخص فقط."
  },
  plannerMediumRecommendation: {
    en: "Your target looks possible, but the payment plan matters. Prefer longer installments or a slightly smaller unit.",
    ar: "هدفك يبدو ممكنًا، لكن خطة الدفع مهمة. فضّل أقساطًا أطول أو وحدة أصغر قليلًا."
  },
  plannerLowRecommendation: {
    en: "The target is currently high compared with your salary. Increase savings, reduce the target price, or choose an earlier-stage/off-plan unit.",
    ar: "الهدف مرتفع حاليًا مقارنة براتبك. زد المدخرات أو اخفض السعر المستهدف أو اختر وحدة تحت الإنشاء."
  },
  plannerPaymentRule: {
    en: "Keep total property payments below about 30-35% of monthly salary for safer cash flow.",
    ar: "حافظ على إجمالي مدفوعات العقار دون 30-35% تقريبًا من الراتب الشهري لتدفق نقدي أكثر أمانًا."
  },
  plannerMatchedRecommendation: {
    en: "The database found properties close to your request, so start by comparing their payment plans and locations.",
    ar: "وجدت قاعدة البيانات عقارات قريبة من طلبك، فابدأ بمقارنة خطط الدفع والمواقع."
  },
  plannerNoMatchRecommendation: {
    en: "No close database match was found, so treat this as a planning guide and search broader areas or property types.",
    ar: "لم يتم العثور على مطابقة قريبة في قاعدة البيانات، لذلك اعتبرها إرشادات تخطيط وابحث في مناطق أو أنواع عقارات أوسع."
  },
  plannerHighSummary: {
    en: "You appear financially ready for similar properties, assuming stable income and reasonable expenses.",
    ar: "تبدو جاهزًا ماليًا لعقارات مشابهة، بافتراض ثبات الدخل ومعقولية المصاريف."
  },
  plannerMediumSummary: {
    en: "You may be able to buy, but should use a careful installment/down-payment plan.",
    ar: "قد تتمكن من الشراء، لكنك تحتاج إلى خطة دقيقة للأقساط والدفعة المقدمة."
  },
  plannerLowSummary: {
    en: "Buying this target soon may be difficult without more savings or a lower-priced option.",
    ar: "شراء هذا الهدف قريبًا قد يكون صعبًا دون مدخرات أكبر أو خيار بسعر أقل."
  },
  plannerMatchReason: {
    en: "Closest database match based on your preferred type, location, rooms, and payment type.",
    ar: "أقرب مطابقة في قاعدة البيانات حسب النوع والموقع والغرف وطريقة الدفع المفضلة."
  }
} satisfies TranslationSection;

const analyticsDashboard = {
  analyticsDashboardEyebrow: { en: "Admin Analytics Dashboard", ar: "لوحة تحليلات الإدارة" },
  analyticsDashboardTitle: { en: "System performance and activity", ar: "أداء النظام والنشاط" },
  backToAdmin: { en: "Back to Admin", ar: "العودة إلى الإدارة" },
  cityFilter: { en: "City filter", ar: "فلتر المدينة" },
  listingStatus: { en: "Listing status", ar: "حالة الإعلان" },
  allStatuses: { en: "All statuses", ar: "كل الحالات" },
  apply: { en: "Apply", ar: "تطبيق" },
  totalUsers: { en: "Total users", ar: "إجمالي المستخدمين" },
  totalBuyers: { en: "Total buyers", ar: "إجمالي المشترين" },
  totalSellers: { en: "Total sellers", ar: "إجمالي البائعين" },
  totalProperties: { en: "Total properties", ar: "إجمالي العقارات" },
  totalListings: { en: "Total listings", ar: "إجمالي الإعلانات" },
  pendingListingsMetric: { en: "Pending listings", ar: "إعلانات قيد المراجعة" },
  approvedListingsMetric: { en: "Approved listings", ar: "إعلانات معتمدة" },
  rejectedListingsMetric: { en: "Rejected listings", ar: "إعلانات مرفوضة" },
  totalAppointments: { en: "Total appointments", ar: "إجمالي المواعيد" },
  totalFavorites: { en: "Total favorites", ar: "إجمالي المفضلة" },
  totalPriceEstimates: { en: "Total price estimates", ar: "إجمالي تقديرات الأسعار" },
  appointmentsByStatus: { en: "Appointments by status", ar: "المواعيد حسب الحالة" },
  listingsByStatus: { en: "Listings by status", ar: "الإعلانات حسب الحالة" },
  propertiesByCity: { en: "Properties by city", ar: "العقارات حسب المدينة" },
  mostViewedProperties: { en: "Most viewed properties", ar: "العقارات الأكثر مشاهدة" },
  mostFavoritedProperties: { en: "Most favorited properties", ar: "العقارات الأكثر إضافة للمفضلة" },
  newestUsers: { en: "Newest users", ar: "أحدث المستخدمين" },
  newestProperties: { en: "Newest properties", ar: "أحدث العقارات" },
  propertyColumn: { en: "Property", ar: "العقار" },
  locationColumn: { en: "Location", ar: "الموقع" },
  viewsColumn: { en: "Views", ar: "المشاهدات" },
  priceColumn: { en: "Price", ar: "السعر" },
  favoritesColumn: { en: "Favorites", ar: "المفضلة" },
  nameColumn: { en: "Name", ar: "الاسم" },
  roleColumn: { en: "Role", ar: "الدور" },
  joinedColumn: { en: "Joined", ar: "تاريخ الانضمام" },
  statusColumn: { en: "Status", ar: "الحالة" },
  createdColumn: { en: "Created", ar: "تاريخ الإنشاء" },
  noDataAvailable: { en: "No data available.", ar: "لا توجد بيانات متاحة." },
  statusDraft: { en: "DRAFT", ar: "مسودة" },
  statusPending: { en: "PENDING", ar: "قيد المراجعة" },
  statusApproved: { en: "APPROVED", ar: "معتمد" },
  statusRejected: { en: "REJECTED", ar: "مرفوض" },
  statusConfirmed: { en: "CONFIRMED", ar: "مؤكد" },
  statusCancelled: { en: "CANCELLED", ar: "ملغي" },
  statusRescheduled: { en: "RESCHEDULED", ar: "تمت إعادة الجدولة" },
  advancedFilters: { en: "Advanced slicers", ar: "فلاتر متقدمة" },
  dateRange: { en: "Date range", ar: "نطاق التاريخ" },
  startDate: { en: "Start date", ar: "تاريخ البدء" },
  endDate: { en: "End date", ar: "تاريخ الانتهاء" },
  governorateFilter: { en: "Governorate", ar: "المحافظة" },
  propertyTypeFilter: { en: "Property type", ar: "نوع العقار" },
  transactionTypeFilter: { en: "Transaction type", ar: "نوع المعاملة" },
  sellerFilter: { en: "Seller", ar: "البائع" },
  developerFilter: { en: "Developer", ar: "المطور" },
  buyerFilter: { en: "Buyer", ar: "المشتري" },
  userTypeFilter: { en: "User type", ar: "نوع المستخدم" },
  priceRange: { en: "Property price range", ar: "نطاق سعر العقار" },
  aiPriceRange: { en: "AI price range", ar: "نطاق السعر الذكي" },
  minPrice: { en: "Min price", ar: "أقل سعر" },
  maxPrice: { en: "Max price", ar: "أعلى سعر" },
  minAiPrice: { en: "Min AI price", ar: "أقل سعر ذكي" },
  maxAiPrice: { en: "Max AI price", ar: "أعلى سعر ذكي" },
  clearAllFilters: { en: "Clear all filters", ar: "مسح كل الفلاتر" },
  activeFilters: { en: "Active filters", ar: "الفلاتر النشطة" },
  noActiveFilters: { en: "No active filters", ar: "لا توجد فلاتر نشطة" },
  refreshDashboard: { en: "Refresh dashboard", ar: "تحديث اللوحة" },
  refreshing: { en: "Refreshing...", ar: "جارٍ التحديث..." },
  lastUpdated: { en: "Last updated", ar: "آخر تحديث" },
  propertyAnalytics: { en: "Property analytics", ar: "تحليلات العقارات" },
  userAnalytics: { en: "User analytics", ar: "تحليلات المستخدمين" },
  activityAnalytics: { en: "Activity analytics", ar: "تحليلات النشاط" },
  aiPriceAnalytics: { en: "AI Price analytics", ar: "تحليلات السعر الذكي" },
  searchAnalytics: { en: "Search analytics", ar: "تحليلات البحث" },
  performanceAnalytics: { en: "Performance analytics", ar: "تحليلات الأداء" },
  propertiesByGovernorate: { en: "Properties by governorate", ar: "العقارات حسب المحافظة" },
  propertiesByType: { en: "Properties by type", ar: "العقارات حسب النوع" },
  propertiesByTransaction: { en: "Properties by transaction", ar: "العقارات حسب المعاملة" },
  topCitiesByListings: { en: "Top cities by listings", ar: "أكثر المدن حسب الإعلانات" },
  topPropertyTypes: { en: "Top property types", ar: "أكثر أنواع العقارات" },
  averagePriceByCity: { en: "Average property price by city", ar: "متوسط سعر العقار حسب المدينة" },
  averagePriceByPropertyType: { en: "Average property price by type", ar: "متوسط سعر العقار حسب النوع" },
  totalDevelopers: { en: "Total developers", ar: "إجمالي المطورين" },
  activeUsersMetric: { en: "Active users", ar: "مستخدمون نشطون" },
  inactiveUsersMetric: { en: "Inactive users", ar: "مستخدمون غير نشطين" },
  totalSearches: { en: "Total searches", ar: "إجمالي عمليات البحث" },
  averagePropertyPrice: { en: "Average property price", ar: "متوسط سعر العقار" },
  averageAiPredictedPrice: { en: "Average AI predicted price", ar: "متوسط السعر المتوقع ذكياً" },
  newUsersPerMonth: { en: "New users per month", ar: "مستخدمون جدد شهرياً" },
  userGrowthTrend: { en: "User growth trend", ar: "اتجاه نمو المستخدمين" },
  userRoleMix: { en: "User role mix", ar: "توزيع أدوار المستخدمين" },
  userRegistrationSources: { en: "User registration sources", ar: "مصادر تسجيل المستخدمين" },
  activeVsInactiveUsers: { en: "Active vs inactive users", ar: "المستخدمون النشطون مقابل غير النشطين" },
  listingsCreatedPerMonth: { en: "Listings created per month", ar: "الإعلانات المنشأة شهرياً" },
  listingStatusPerMonth: { en: "Listing statuses per month", ar: "حالات الإعلانات شهرياً" },
  dailyActivityTrend: { en: "Daily activity trend", ar: "اتجاه النشاط اليومي" },
  weeklyActivityTrend: { en: "Weekly activity trend", ar: "اتجاه النشاط الأسبوعي" },
  monthlyActivityTrend: { en: "Monthly activity trend", ar: "اتجاه النشاط الشهري" },
  aiPredictionsPerDay: { en: "AI price predictions per day", ar: "توقعات السعر الذكي يومياً" },
  aiPredictionsPerMonth: { en: "AI price predictions per month", ar: "توقعات السعر الذكي شهرياً" },
  averagePredictedPriceByCity: { en: "Average predicted price by city", ar: "متوسط السعر المتوقع حسب المدينة" },
  averagePredictedPriceByPropertyType: { en: "Average predicted price by type", ar: "متوسط السعر المتوقع حسب النوع" },
  highestPredictedPriceAreas: { en: "Highest predicted price areas", ar: "أعلى المناطق في السعر المتوقع" },
  aiUsageTrend: { en: "AI usage trend", ar: "اتجاه استخدام الذكاء الاصطناعي" },
  mostSearchedCities: { en: "Most searched cities", ar: "أكثر المدن بحثاً" },
  mostSearchedPropertyTypes: { en: "Most searched property types", ar: "أكثر أنواع العقارات بحثاً" },
  searchActivityTrend: { en: "Search activity trend", ar: "اتجاه نشاط البحث" },
  searchRequestsPerDay: { en: "Search requests per day", ar: "طلبات البحث يومياً" },
  totalPropertiesGrowth: { en: "Total properties growth", ar: "نمو إجمالي العقارات" },
  totalUsersGrowth: { en: "Total users growth", ar: "نمو إجمالي المستخدمين" },
  approvalRate: { en: "Approval rate", ar: "معدل القبول" },
  rejectionRate: { en: "Rejection rate", ar: "معدل الرفض" },
  listingConversionFunnel: { en: "Listing conversion funnel", ar: "قمع تحويل الإعلانات" },
  systemActivityOverview: { en: "System activity overview", ar: "ملخص نشاط النظام" },
  priceAreaScatter: { en: "Price vs area scatter", ar: "تشتت السعر مقابل المساحة" },
  activityHeatmap: { en: "Activity heatmap", ar: "خريطة حرارية للنشاط" },
  directOrUnknown: { en: "Direct / unknown", ar: "مباشر / غير معروف" },
  activeLabel: { en: "Active", ar: "نشط" },
  inactiveLabel: { en: "Inactive", ar: "غير نشط" },
  listingsCreated: { en: "Listings created", ar: "إعلانات منشأة" },
  valueColumn: { en: "Value", ar: "القيمة" },
  countColumn: { en: "Count", ar: "العدد" },
  propertyViewEvent: { en: "Property views", ar: "مشاهدات العقارات" },
  propertyFavoriteEvent: { en: "Property favorites", ar: "إضافات للمفضلة" },
  propertyCompareEvent: { en: "Property compares", ar: "مقارنات العقارات" },
  appointmentRequestEvent: { en: "Appointment requests", ar: "طلبات المواعيد" },
  searchEvent: { en: "Searches", ar: "عمليات البحث" },
  priceEstimateEvent: { en: "AI price estimates", ar: "تقديرات السعر الذكي" }
} satisfies TranslationSection;

const soldAnalytics = {
  soldPropertyAnalytics: { en: "Sold property analytics", ar: "تحليلات العقارات المباعة" },
  totalSoldProperties: { en: "Total sold properties", ar: "إجمالي العقارات المباعة" },
  averageDaysUntilSale: { en: "Average days until sale", ar: "متوسط الأيام حتى البيع" },
  totalSoldRevenueValue: { en: "Total sold value", ar: "إجمالي قيمة المبيعات" },
  soldPropertiesByCity: { en: "Sold properties by city", ar: "العقارات المباعة حسب المدينة" },
  soldPropertiesByGovernorate: { en: "Sold properties by governorate", ar: "العقارات المباعة حسب المحافظة" },
  soldPropertiesByType: { en: "Sold properties by type", ar: "العقارات المباعة حسب النوع" },
  soldPropertiesByDeveloper: { en: "Sold properties by developer", ar: "العقارات المباعة حسب المطور" },
  soldPropertiesBySeller: { en: "Sold properties by seller", ar: "العقارات المباعة حسب البائع" },
  soldPropertiesPerMonth: { en: "Sold properties per month", ar: "العقارات المباعة شهريا" },
  soldPropertiesPerYear: { en: "Sold properties per year", ar: "العقارات المباعة سنويا" },
  fastestSellingPropertyTypes: { en: "Fastest selling property types", ar: "أسرع أنواع العقارات بيعا" },
  highestSellingCities: { en: "Highest selling cities", ar: "أعلى المدن مبيعا" },
  soldValueByMonth: { en: "Sold value by month", ar: "قيمة المبيعات حسب الشهر" },
  propertySoldEvent: { en: "Properties sold", ar: "عقارات مباعة" },
  daysUnit: { en: "days", ar: "أيام" }
} satisfies TranslationSection;

const auth = {
  loginRegister: { en: "Login / Register", ar: "تسجيل الدخول / إنشاء حساب" },
  loginOrResetHint: {
    en: "Login with your email/phone or reset your password using OTP.",
    ar: "سجّل الدخول بالبريد أو الهاتف أو أعد تعيين كلمة المرور باستخدام رمز OTP."
  },
  emailOrPhone: { en: "Email or phone", ar: "البريد الإلكتروني أو الهاتف" },
  password: { en: "Password", ar: "كلمة المرور" },
  hidePassword: { en: "Hide password", ar: "إخفاء كلمة المرور" },
  showPassword: { en: "Show password", ar: "إظهار كلمة المرور" },
  continueButton: { en: "Continue", ar: "متابعة" },
  signUp: { en: "Sign Up", ar: "إنشاء حساب" },
  forgotPassword: { en: "Forgot password?", ar: "هل نسيت كلمة المرور؟" },
  loginFailed: { en: "Login failed.", ar: "فشل تسجيل الدخول." },
  demoCredentialsHint: {
    en: "Use buyer@example.com or seller@example.com. Default demo password: 123456",
    ar: "استخدم buyer@example.com أو seller@example.com. كلمة المرور التجريبية الافتراضية: 123456"
  },
  closeSignUp: { en: "Close sign up", ar: "إغلاق إنشاء الحساب" },
  createAccountContinue: { en: "Create your account to continue.", ar: "أنشئ حسابك للمتابعة." },
  name: { en: "Name", ar: "الاسم" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  phoneNumber: { en: "Phone number", ar: "رقم الهاتف" },
  confirmPassword: { en: "Confirm password", ar: "تأكيد كلمة المرور" },
  hideConfirmPassword: { en: "Hide confirm password", ar: "إخفاء تأكيد كلمة المرور" },
  showConfirmPassword: { en: "Show confirm password", ar: "إظهار تأكيد كلمة المرور" },
  buyerOption: { en: "Buyer", ar: "مشتري" },
  sellerOption: { en: "Seller", ar: "بائع" },
  developerOption: { en: "Developer", ar: "مطور" },
  companyName: { en: "Company name", ar: "اسم الشركة" },
  createAccount: { en: "Create account", ar: "إنشاء الحساب" },
  signupFailed: { en: "Signup failed. Please try again.", ar: "فشل إنشاء الحساب. حاول مرة أخرى." },
  passwordConfirmationMismatch: { en: "Password and confirmation must match.", ar: "يجب أن تتطابق كلمة المرور مع التأكيد." },
  forgotPasswordTitle: { en: "Forgot Password", ar: "نسيت كلمة المرور" },
  forgotPasswordHint: { en: "Reset your password using OTP sent to your email.", ar: "أعد تعيين كلمة المرور باستخدام رمز OTP المرسل إلى بريدك الإلكتروني." },
  accountEmail: { en: "Account email", ar: "بريد الحساب" },
  sendOtp: { en: "Send OTP", ar: "إرسال OTP" },
  sendingOtp: { en: "Sending...", ar: "جارٍ الإرسال..." },
  failedToSendOtp: { en: "Failed to send OTP.", ar: "تعذر إرسال رمز OTP." },
  otpSentSuccessfully: { en: "OTP sent successfully.", ar: "تم إرسال رمز OTP بنجاح." },
  enterOtpCode: { en: "Enter OTP code", ar: "أدخل رمز OTP" },
  verifyOtp: { en: "Verify OTP", ar: "التحقق من OTP" },
  verifyingOtp: { en: "Verifying...", ar: "جارٍ التحقق..." },
  failedToVerifyOtp: { en: "Failed to verify OTP.", ar: "تعذر التحقق من رمز OTP." },
  otpVerifiedReady: { en: "OTP verified. You can now set a new password.", ar: "تم التحقق من رمز OTP. يمكنك الآن تعيين كلمة مرور جديدة." },
  newPassword: { en: "New password", ar: "كلمة المرور الجديدة" },
  confirmNewPassword: { en: "Confirm new password", ar: "تأكيد كلمة المرور الجديدة" },
  updating: { en: "Updating...", ar: "جارٍ التحديث..." },
  resetPassword: { en: "Reset Password", ar: "إعادة تعيين كلمة المرور" },
  failedToResetPassword: { en: "Failed to reset password.", ar: "تعذر إعادة تعيين كلمة المرور." },
  backToLogin: { en: "Back to login", ar: "العودة إلى تسجيل الدخول" }
} satisfies TranslationSection;

export const dictionaries = {
  navigation,
  profile,
  soldActions,
  chatbot,
  home,
  search,
  property,
  seller,
  footer,
  admin,
  aiPrice,
  analyticsDashboard,
  soldAnalytics,
  auth
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
  Alexandria: { en: "Alexandria", ar: "الإسكندرية" },
  "North Coast": { en: "North Coast", ar: "الساحل الشمالي" },
  "Ain Sokhna": { en: "Ain Sokhna", ar: "العين السخنة" },
  Hurghada: { en: "Hurghada", ar: "الغردقة" },
  "Sharm El-Sheikh": { en: "Sharm El-Sheikh", ar: "شرم الشيخ" },
  "Sheikh Zayed": { en: "Sheikh Zayed", ar: "الشيخ زايد" },
  SheikhZayed: { en: "Sheikh Zayed", ar: "الشيخ زايد" },
  "Fifth Settlement": { en: "Fifth Settlement", ar: "التجمع الخامس" },
  "South Investors": { en: "South Investors", ar: "المستثمرين الجنوبية" },
  "North Investors": { en: "North Investors", ar: "المستثمرين الشمالية" },
  Mokattam: { en: "Mokattam", ar: "المقطم" },
  "Al Khamayel": { en: "Al Khamayel", ar: "الخمايل" },
  "Al Ahyaa": { en: "Al Ahyaa", ar: "الأحياء" },
  "Nabq Bay": { en: "Nabq Bay", ar: "خليج نبق" },
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

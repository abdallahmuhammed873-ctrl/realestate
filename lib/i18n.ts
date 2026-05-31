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
  yourPropertyPosts: { en: "Your Property Posts", ar: "إعلاناتك العقارية" },
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
  chatbot,
  home,
  search,
  property,
  seller,
  footer,
  admin,
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

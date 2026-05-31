export type Role = "BUYER" | "SELLER" | "ADMIN";
export type ListingStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type TransactionType = "BUY" | "RENT" | "VACATION";
export type PropertyType =
  | "APARTMENT"
  | "VILLA"
  | "DUPLEX"
  | "PENTHOUSE"
  | "CHALET"
  | "LAND"
  | "COMMERCIAL";
export type Furnishing = "FULLY" | "SEMI" | "UNFURNISHED";
export type PaymentType = "CASH" | "INSTALLMENTS";
export type CompletionStatus = "OFF_PLAN" | "READY";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED";
export type PropertySourceType = "MANUAL" | "IMPORTED";
export type PropertyMediaKind = "IMAGE" | "PANORAMA_360" | "SPIN_360_FRAME";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  role: Role;
  isCompanyAccount?: boolean;
  companyOwnerId?: string;
  password?: string;
  blocked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Property = {
  id: string;
  listingId: string;
  title: string;
  titleEn?: string | null;
  titleAr?: string | null;
  description: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  projectName?: string | null;
  unitCode?: string | null;
  inventoryStatus?: string | null;
  transaction: TransactionType;
  type: PropertyType;
  price: number | null;
  rentPrice: number | null;
  currency: string;
  pricePerSqm?: number | null;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  landArea?: number | null;
  gardenArea?: number | null;
  roofArea?: number | null;
  hasGarden?: boolean;
  hasRoof?: boolean;
  lat: number;
  lng: number;
  address: string;
  city: string;
  area: string;
  district: string;
  furnishing: Furnishing;
  paymentType: PaymentType;
  completionStatus: CompletionStatus;
  amenities: string[];
  images: string[];
  media?: PropertyMedia[];
  installmentDownPayment?: number | null;
  installmentYears?: number | null;
  installmentMonthly?: number | null;
  sourceType?: PropertySourceType;
  sourceFile?: string | null;
  sourceSheet?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertyMedia = {
  id: string;
  propertyId: string;
  kind: PropertyMediaKind;
  path: string;
  label?: string | null;
  altText?: string | null;
  sortOrder: number;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Listing = {
  id: string;
  userId: string;
  status: ListingStatus;
  feesPaid?: boolean;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Favorite = {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  userId: string;
  propertyId: string;
  datetime: string;
  status: AppointmentStatus;
  contactName: string;
  contactPhone: string;
  notes?: string;
  suggestedSlots: string[];
  createdAt: string;
  updatedAt: string;
};

export type SavedSearch = {
  id: string;
  userId: string;
  queryJson: string;
  createdAt: string;
};

export type SellerMessage = {
  id: string;
  sellerId: string;
  buyerId: string;
  propertyId: string;
  appointmentId: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export type CommunityPost = {
  id: string;
  userId: string;
  text: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityPostLike = {
  id: string;
  postId: string;
  userId: string;
  reaction: "LIKE" | "LOVE";
  createdAt: string;
};

export type CommunityPostCommentLike = {
  id: string;
  postId: string;
  commentId: string;
  userId: string;
  createdAt: string;
};

export type CommunityPostComment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  parentCommentId?: string | null;
  createdAt: string;
};

export type CommunityListingLike = {
  id: string;
  listingId: string;
  userId: string;
  createdAt: string;
};

export type CommunityListingCommentLike = {
  id: string;
  listingId: string;
  commentId: string;
  userId: string;
  createdAt: string;
};

export type CommunityListingComment = {
  id: string;
  listingId: string;
  userId: string;
  text: string;
  parentCommentId?: string | null;
  createdAt: string;
};

export type PublicPropertyCard = Property & {
  listingStatus: ListingStatus;
  verified: boolean;
  sellerId: string;
  listedByName: string;
  listedByCompanyName?: string;
  listedByPhone?: string;
  distanceKm?: number;
  goodDeal?: boolean;
  has360View?: boolean;
  hasPanorama360?: boolean;
  hasSpin360?: boolean;
};

export type SearchFilters = {
  q?: string;
  transaction?: TransactionType;
  type?: PropertyType[];
  city?: string;
  area?: string;
  district?: string;
  projectName?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  paymentType?: PaymentType;
  furnishing?: Furnishing;
  completionStatus?: CompletionStatus;
  hasGarden?: boolean;
  hasRoof?: boolean;
  has360View?: boolean;
  amenities?: string[];
  lat?: number;
  lng?: number;
  distanceKm?: number;
  downPaymentMax?: number;
  installmentYearsMax?: number;
  installmentMonthlyMax?: number;
  unitCode?: string;
  inventoryStatus?: string;
  page?: number;
  pageSize?: number;
  sort?: "FEATURED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "AREA_DESC" | "DISTANCE_ASC";
};

export type SearchResult = {
  total: number;
  page: number;
  pageSize: number;
  items: PublicPropertyCard[];
};

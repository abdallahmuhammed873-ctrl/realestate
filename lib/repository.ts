import fs from "fs";
import path from "path";
import {
  Appointment,
  CommunityListingComment,
  CommunityListingCommentLike,
  CommunityListingLike,
  CommunityPost,
  CommunityPostComment,
  CommunityPostCommentLike,
  CommunityPostLike,
  Favorite,
  Listing,
  ListingStatus,
  Property,
  PublicPropertyCard,
  SavedSearch,
  SearchFilters,
  SearchResult,
  SellerMessage,
  User
} from "@/lib/types";
import {
  seedAppointments,
  seedCommunityListingComments,
  seedCommunityListingCommentLikes,
  seedCommunityListingLikes,
  seedCommunityPostComments,
  seedCommunityPostCommentLikes,
  seedCommunityPostLikes,
  seedCommunityPosts,
  seedFavorites,
  seedListings,
  seedProperties,
  seedSavedSearches,
  seedSellerMessages,
  seedUsers
} from "@/lib/mock-data";
import { haversineDistanceKm } from "@/lib/utils";
import { isValidPhoneNumber } from "@/lib/utils";

type MockDb = {
  users: User[];
  listings: Listing[];
  properties: Property[];
  favorites: Favorite[];
  appointments: Appointment[];
  savedSearches: SavedSearch[];
  sellerMessages: SellerMessage[];
  communityPosts: CommunityPost[];
  communityPostLikes: CommunityPostLike[];
  communityPostComments: CommunityPostComment[];
  communityPostCommentLikes: CommunityPostCommentLike[];
  communityListingLikes: CommunityListingLike[];
  communityListingComments: CommunityListingComment[];
  communityListingCommentLikes: CommunityListingCommentLike[];
  compareByUser: Record<string, string[]>;
  seenNotificationIdsByUser: Record<string, string[]>;
  passwordResetByEmail: Record<string, { otp: string; otpExpiresAt: number; verifiedToken?: string; verifiedExpiresAt?: number }>;
};

type NotificationItem = {
  id: string;
  text: string;
  createdAt: string;
  href?: string;
};

const globalDb = globalThis as unknown as { __chequeDb?: MockDb };
const DB_FILE = path.join(process.cwd(), ".demo-db.json");

function loadDbFromDisk(): MockDb | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, "utf8");
    if (!raw.trim()) return null;
    const data = JSON.parse(raw) as MockDb;
    if (!data || !Array.isArray(data.users)) return null;
    return data;
  } catch {
    return null;
  }
}

function saveDbToDisk(state: MockDb) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Ignore persistence failures in demo mode.
  }
}

function createDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    listings: structuredClone(seedListings),
    properties: structuredClone(seedProperties),
    favorites: structuredClone(seedFavorites),
    appointments: structuredClone(seedAppointments),
    savedSearches: structuredClone(seedSavedSearches),
    sellerMessages: structuredClone(seedSellerMessages),
    communityPosts: structuredClone(seedCommunityPosts),
    communityPostLikes: structuredClone(seedCommunityPostLikes),
    communityPostComments: structuredClone(seedCommunityPostComments),
    communityPostCommentLikes: structuredClone(seedCommunityPostCommentLikes),
    communityListingLikes: structuredClone(seedCommunityListingLikes),
    communityListingComments: structuredClone(seedCommunityListingComments),
    communityListingCommentLikes: structuredClone(seedCommunityListingCommentLikes),
    compareByUser: {},
    seenNotificationIdsByUser: {},
    passwordResetByEmail: {}
  };
}

function ensureAdminAccount(state: MockDb) {
  const existing = state.users.find((u) => u.role === "ADMIN" && u.email.toLowerCase() === "admin@example.com");
  if (existing) {
    if (!existing.password) existing.password = "123456";
    return;
  }
  const now = new Date().toISOString();
  state.users.push({
    id: "u-admin-1",
    name: "Platform Admin",
    email: "admin@example.com",
    phone: "+201000000003",
    role: "ADMIN",
    isCompanyAccount: false,
    password: "123456",
    blocked: false,
    createdAt: now,
    updatedAt: now
  });
}

function db() {
  if (!globalDb.__chequeDb) {
    const loaded = loadDbFromDisk();
    globalDb.__chequeDb = loaded ?? createDb();
    if (!loaded) saveDbToDisk(globalDb.__chequeDb);
  }
  // Keep backward compatibility with already-initialized in-memory state during dev hot reload.
  if (!globalDb.__chequeDb.passwordResetByEmail) globalDb.__chequeDb.passwordResetByEmail = {};
  if (!globalDb.__chequeDb.communityPosts) globalDb.__chequeDb.communityPosts = [];
  if (!globalDb.__chequeDb.communityPostLikes) globalDb.__chequeDb.communityPostLikes = [];
  if (!globalDb.__chequeDb.communityPostComments) globalDb.__chequeDb.communityPostComments = [];
  if (!globalDb.__chequeDb.communityPostCommentLikes) globalDb.__chequeDb.communityPostCommentLikes = [];
  if (!globalDb.__chequeDb.communityListingLikes) globalDb.__chequeDb.communityListingLikes = [];
  if (!globalDb.__chequeDb.communityListingComments) globalDb.__chequeDb.communityListingComments = [];
  if (!globalDb.__chequeDb.communityListingCommentLikes) globalDb.__chequeDb.communityListingCommentLikes = [];
  ensureAdminAccount(globalDb.__chequeDb);
  return globalDb.__chequeDb;
}

export function getUserById(id?: string | null) {
  if (!id) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export function findUserForLogin(input: { role: "BUYER" | "SELLER" | "ADMIN"; identifier?: string }) {
  const identifier = input.identifier?.trim();
  const emailKey = identifier?.toLowerCase();
  const roleMatches = db().users.filter((u) => u.role === input.role);
  if (!identifier) return roleMatches[0] ?? null;
  const roleMatch = roleMatches.find((u) => u.email.toLowerCase() === emailKey || u.phone === identifier);
  return roleMatch ?? null;
}

export function findUserByIdentifier(identifier?: string) {
  const key = identifier?.trim();
  if (!key) return null;
  const emailKey = key.toLowerCase();
  return db().users.find((u) => u.email.toLowerCase() === emailKey || u.phone === key) ?? null;
}

export function findUserByEmail(email?: string) {
  const key = email?.trim().toLowerCase();
  if (!key) return null;
  return db().users.find((u) => u.email.toLowerCase() === key) ?? null;
}

export function verifyUserPassword(userId: string, password: string) {
  const user = db().users.find((u) => u.id === userId);
  if (!user) return false;
  if (!user.password) return true;
  return user.password === password;
}

export function listSellers() {
  return db().users.filter((u) => u.role === "SELLER" && !u.isCompanyAccount && !u.companyOwnerId);
}

function listingStatsForUser(userId: string) {
  const listings = db().listings.filter((l) => l.userId === userId);
  return {
    total: listings.length,
    approved: listings.filter((l) => l.status === "APPROVED").length,
    pending: listings.filter((l) => l.status === "PENDING").length,
    rejected: listings.filter((l) => l.status === "REJECTED").length
  };
}

export function listSellerProfilesForAdmin() {
  return listSellers().map((seller) => ({
    seller,
    stats: listingStatsForUser(seller.id)
  }));
}

export function listDevelopersForAdmin() {
  return db().users.filter((u) => u.role === "SELLER" && Boolean(u.isCompanyAccount) && !u.companyOwnerId);
}

export function listDeveloperProfilesForAdmin() {
  return listDevelopersForAdmin().map((developer) => ({
    developer,
    stats: listingStatsForUser(developer.id)
  }));
}

export function listBuyerProfilesForAdmin() {
  return db().users
    .filter((u) => u.role === "BUYER")
    .map((buyer) => ({
      buyer,
      stats: {
        favorites: db().favorites.filter((f) => f.userId === buyer.id).length,
        appointments: db().appointments.filter((a) => a.userId === buyer.id).length,
        savedSearches: db().savedSearches.filter((s) => s.userId === buyer.id).length
      }
    }));
}

export function addSellerProfile(input: { name: string; email: string; phone?: string; password: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const password = input.password;
  if (!name || !email) return null;
  if (!password || password.length < 6) return null;
  if (phone && !isValidPhoneNumber(phone)) return null;
  if (db().users.some((u) => u.email.toLowerCase() === email)) return null;

  const now = new Date().toISOString();
  const seller: User = {
    id: `u-seller-${Date.now()}`,
    name,
    email,
    phone,
    role: "SELLER",
    isCompanyAccount: false,
    password,
    blocked: false,
    createdAt: now,
    updatedAt: now
  };
  db().users.push(seller);
  saveDbToDisk(db());
  return seller;
}

export function addDeveloperProfile(input: { name: string; email: string; phone?: string; password: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const password = input.password;
  if (!name || !email) return null;
  if (!password || password.length < 6) return null;
  if (phone && !isValidPhoneNumber(phone)) return null;
  if (db().users.some((u) => u.email.toLowerCase() === email)) return null;

  const now = new Date().toISOString();
  const developer: User = {
    id: `u-developer-${Date.now()}`,
    name,
    email,
    phone,
    role: "SELLER",
    isCompanyAccount: true,
    password,
    blocked: false,
    createdAt: now,
    updatedAt: now
  };
  db().users.push(developer);
  saveDbToDisk(db());
  return developer;
}

export function addBuyerProfile(input: { name: string; email: string; phone?: string; password: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const password = input.password;
  if (!name || !email) return null;
  if (!password || password.length < 6) return null;
  if (phone && !isValidPhoneNumber(phone)) return null;
  if (db().users.some((u) => u.email.toLowerCase() === email)) return null;

  const now = new Date().toISOString();
  const buyer: User = {
    id: `u-buyer-${Date.now()}`,
    name,
    email,
    phone,
    role: "BUYER",
    isCompanyAccount: false,
    password,
    blocked: false,
    createdAt: now,
    updatedAt: now
  };
  db().users.push(buyer);
  saveDbToDisk(db());
  return buyer;
}

export function createUserProfile(input: { name: string; email: string; phone: string; role: "BUYER" | "SELLER"; password: string; isCompanyAccount?: boolean }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!name || !email || !phone) return null;
  if (!isValidPhoneNumber(phone)) return null;
  if (db().users.some((u) => u.email.toLowerCase() === email || u.phone === phone)) return null;

  const now = new Date().toISOString();
  const rolePrefix = input.role === "SELLER" ? "seller" : "buyer";
  const user: User = {
    id: `u-${rolePrefix}-${Date.now()}`,
    name,
    email,
    phone,
    role: input.role,
    isCompanyAccount: Boolean(input.isCompanyAccount),
    password: input.password,
    blocked: false,
    createdAt: now,
    updatedAt: now
  };
  db().users.push(user);
  saveDbToDisk(db());
  return user;
}

export function updateUserProfile(
  userId: string,
  input: { name: string; email: string; phone?: string; avatarUrl?: string | null }
) {
  const user = db().users.find((u) => u.id === userId);
  if (!user) return { ok: false as const, error: "User not found." };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const avatarUrl = (input.avatarUrl ?? null) ? String(input.avatarUrl).trim() : null;

  if (!name || !email) return { ok: false as const, error: "Name and email are required." };
  if (phone && !isValidPhoneNumber(phone)) {
    return { ok: false as const, error: "Phone number must be 11 digits and start with 01." };
  }
  if (avatarUrl) {
    if (!avatarUrl.startsWith("data:image/")) {
      return { ok: false as const, error: "Avatar must be an image." };
    }
    if (avatarUrl.length > 1_000_000) {
      return { ok: false as const, error: "Avatar is too large." };
    }
  }

  const emailTaken = db().users.some((u) => u.id !== userId && u.email.toLowerCase() === email);
  if (emailTaken) return { ok: false as const, error: "Email is already used by another account." };

  const phoneTaken = phone
    ? db().users.some((u) => u.id !== userId && (u.phone ?? "").trim() !== "" && u.phone === phone)
    : false;
  if (phoneTaken) return { ok: false as const, error: "Phone number is already used by another account." };

  user.name = name;
  user.email = email;
  user.phone = phone || undefined;
  user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();

  saveDbToDisk(db());
  return { ok: true as const, user };
}

export function setSellerBlocked(sellerId: string, blocked: boolean) {
  const seller = db().users.find((u) => u.id === sellerId && u.role === "SELLER" && !u.isCompanyAccount);
  if (!seller) return null;
  seller.blocked = blocked;
  seller.updatedAt = new Date().toISOString();
  saveDbToDisk(db());
  return seller;
}

export function setDeveloperBlocked(developerId: string, blocked: boolean) {
  const developer = db().users.find((u) => u.id === developerId && u.role === "SELLER" && Boolean(u.isCompanyAccount));
  if (!developer) return null;
  developer.blocked = blocked;
  developer.updatedAt = new Date().toISOString();
  saveDbToDisk(db());
  return developer;
}

export function setBuyerBlocked(buyerId: string, blocked: boolean) {
  const buyer = db().users.find((u) => u.id === buyerId && u.role === "BUYER");
  if (!buyer) return null;
  buyer.blocked = blocked;
  buyer.updatedAt = new Date().toISOString();
  saveDbToDisk(db());
  return buyer;
}

export function removeSellerProfile(sellerId: string) {
  const seller = db().users.find((u) => u.id === sellerId && u.role === "SELLER" && !u.isCompanyAccount);
  if (!seller) return null;

  const listingIds = db()
    .listings.filter((l) => l.userId === sellerId)
    .map((l) => l.id);
  const propertyIds = db()
    .properties.filter((p) => listingIds.includes(p.listingId))
    .map((p) => p.id);

  db().users = db().users.filter((u) => u.id !== sellerId);
  db().listings = db().listings.filter((l) => l.userId !== sellerId);
  db().properties = db().properties.filter((p) => !listingIds.includes(p.listingId));
  db().appointments = db().appointments.filter((a) => !propertyIds.includes(a.propertyId));
  db().favorites = db().favorites.filter((f) => !propertyIds.includes(f.propertyId) && f.userId !== sellerId);
  db().savedSearches = db().savedSearches.filter((s) => s.userId !== sellerId);
  db().sellerMessages = db().sellerMessages.filter((m) => m.sellerId !== sellerId && m.buyerId !== sellerId);
  delete db().compareByUser[sellerId];
  delete db().seenNotificationIdsByUser[sellerId];

  saveDbToDisk(db());
  return seller;
}

export function removeDeveloperProfile(developerId: string) {
  const developer = db().users.find((u) => u.id === developerId && u.role === "SELLER" && Boolean(u.isCompanyAccount));
  if (!developer) return null;

  const listingIds = db()
    .listings.filter((l) => l.userId === developerId)
    .map((l) => l.id);
  const propertyIds = db()
    .properties.filter((p) => listingIds.includes(p.listingId))
    .map((p) => p.id);

  db().users = db().users.filter((u) => u.id !== developerId);
  db().listings = db().listings.filter((l) => l.userId !== developerId);
  db().properties = db().properties.filter((p) => !listingIds.includes(p.listingId));
  db().appointments = db().appointments.filter((a) => !propertyIds.includes(a.propertyId));
  db().favorites = db().favorites.filter((f) => !propertyIds.includes(f.propertyId) && f.userId !== developerId);
  db().savedSearches = db().savedSearches.filter((s) => s.userId !== developerId);
  db().sellerMessages = db().sellerMessages.filter((m) => m.sellerId !== developerId && m.buyerId !== developerId);
  delete db().compareByUser[developerId];
  delete db().seenNotificationIdsByUser[developerId];

  saveDbToDisk(db());
  return developer;
}

export function removeBuyerProfile(buyerId: string) {
  const buyer = db().users.find((u) => u.id === buyerId && u.role === "BUYER");
  if (!buyer) return null;

  db().users = db().users.filter((u) => u.id !== buyerId);
  db().appointments = db().appointments.filter((a) => a.userId !== buyerId);
  db().favorites = db().favorites.filter((f) => f.userId !== buyerId);
  db().savedSearches = db().savedSearches.filter((s) => s.userId !== buyerId);
  db().sellerMessages = db().sellerMessages.filter((m) => m.buyerId !== buyerId);
  delete db().compareByUser[buyerId];
  delete db().seenNotificationIdsByUser[buyerId];

  saveDbToDisk(db());
  return buyer;
}

export function listCompanyUsers(ownerSellerId: string) {
  return db().users.filter((u) => u.companyOwnerId === ownerSellerId);
}

export function addCompanyUser(ownerSellerId: string, input: { name: string; email: string; phone?: string; password: string }) {
  const owner = db().users.find((u) => u.id === ownerSellerId && u.role === "SELLER");
  if (!owner) return null;

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const password = input.password;
  if (!name || !email || !password || password.length < 6) return null;
  if (phone && !isValidPhoneNumber(phone)) return null;
  if (db().users.some((u) => u.email.toLowerCase() === email || (phone && u.phone === phone))) return null;

  const now = new Date().toISOString();
  const user: User = {
    id: `u-seller-team-${Date.now()}`,
    name,
    email,
    phone,
    role: "SELLER",
    isCompanyAccount: false,
    companyOwnerId: ownerSellerId,
    password,
    blocked: false,
    createdAt: now,
    updatedAt: now
  };
  db().users.push(user);
  saveDbToDisk(db());
  return user;
}

export function setCompanyUserBlocked(ownerSellerId: string, companyUserId: string, blocked: boolean) {
  const companyUser = db().users.find((u) => u.id === companyUserId && u.role === "SELLER" && u.companyOwnerId === ownerSellerId);
  if (!companyUser) return null;
  companyUser.blocked = blocked;
  companyUser.updatedAt = new Date().toISOString();
  saveDbToDisk(db());
  return companyUser;
}

export function requestPasswordResetOtp(email: string) {
  const emailKey = email.trim().toLowerCase();
  const user = db().users.find((u) => u.email.toLowerCase() === emailKey);
  if (!user) return null;
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  db().passwordResetByEmail[emailKey] = {
    otp,
    otpExpiresAt: Date.now() + 10 * 60 * 1000
  };
  saveDbToDisk(db());
  return { otp, userName: user.name, userId: user.id };
}

export function verifyPasswordResetOtp(email: string, otp: string) {
  const emailKey = email.trim().toLowerCase();
  const state = db().passwordResetByEmail[emailKey];
  if (!state) return null;
  if (Date.now() > state.otpExpiresAt) return null;
  if (state.otp !== otp.trim()) return null;
  const token = `reset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  db().passwordResetByEmail[emailKey] = {
    ...state,
    verifiedToken: token,
    verifiedExpiresAt: Date.now() + 10 * 60 * 1000
  };
  saveDbToDisk(db());
  return { token };
}

export function resetPassword(email: string, token: string, newPassword: string) {
  const emailKey = email.trim().toLowerCase();
  const state = db().passwordResetByEmail[emailKey];
  if (!state || !state.verifiedToken || !state.verifiedExpiresAt) return false;
  if (Date.now() > state.verifiedExpiresAt) return false;
  if (state.verifiedToken !== token) return false;
  const user = db().users.find((u) => u.email.toLowerCase() === emailKey);
  if (!user) return false;
  user.password = newPassword;
  user.updatedAt = new Date().toISOString();
  delete db().passwordResetByEmail[emailKey];
  saveDbToDisk(db());
  return true;
}

export function removeCompanyUser(ownerSellerId: string, companyUserId: string) {
  const companyUser = db().users.find((u) => u.id === companyUserId && u.role === "SELLER" && u.companyOwnerId === ownerSellerId);
  if (!companyUser) return null;

  db().users = db().users.filter((u) => u.id !== companyUserId);
  db().favorites = db().favorites.filter((f) => f.userId !== companyUserId);
  db().savedSearches = db().savedSearches.filter((s) => s.userId !== companyUserId);
  db().sellerMessages = db().sellerMessages.filter((m) => m.sellerId !== companyUserId && m.buyerId !== companyUserId);
  delete db().compareByUser[companyUserId];
  delete db().seenNotificationIdsByUser[companyUserId];

  saveDbToDisk(db());
  return companyUser;
}

export function listPendingListings() {
  return db().listings.filter((l) => l.status === "PENDING");
}

export function listPendingListingsDetailed() {
  return db()
    .listings.filter((l) => l.status === "PENDING")
    .map((listing) => {
      const property = db().properties.find((p) => p.listingId === listing.id) ?? null;
      const seller = db().users.find((u) => u.id === listing.userId) ?? null;
      const company = seller?.companyOwnerId ? db().users.find((u) => u.id === seller.companyOwnerId) ?? null : null;
      return { listing, property, seller, company };
    })
    .filter((x): x is { listing: Listing; property: Property; seller: User | null; company: User | null } => Boolean(x.property))
    .sort((a, b) => Date.parse(b.listing.updatedAt) - Date.parse(a.listing.updatedAt));
}

export function getListingWithProperty(listingId: string) {
  const listing = db().listings.find((l) => l.id === listingId);
  if (!listing) return null;
  const property = db().properties.find((p) => p.listingId === listingId) ?? null;
  return { listing, property };
}

export function updateListingStatus(listingId: string, status: Exclude<ListingStatus, "DRAFT" | "PENDING">, adminId: string, notes?: string) {
  const listing = db().listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = status;
  listing.adminNotes = notes ?? null;
  listing.reviewedBy = adminId;
  listing.reviewedAt = new Date().toISOString();
  listing.updatedAt = new Date().toISOString();
  return listing;
}

export function createOrUpdateSellerListing(input: {
  listingId?: string;
  sellerId: string;
  feesPaid?: boolean;
  property: Omit<Property, "id" | "listingId" | "createdAt" | "updatedAt">;
}) {
  const now = new Date().toISOString();
  if (input.listingId) {
    const listing = db().listings.find((l) => l.id === input.listingId && canSellerAccessListing(input.sellerId, l.userId));
    const property = db().properties.find((p) => p.listingId === input.listingId);
    if (!listing || !property) return null;
    listing.status = "PENDING";
    if (typeof input.feesPaid === "boolean") listing.feesPaid = input.feesPaid;
    listing.updatedAt = now;
    Object.assign(property, input.property, { updatedAt: now });
    return { listing, property };
  }
  const listingId = `l-${db().listings.length + 1}`;
  const propertyId = `p-${db().properties.length + 1}`;
  const listing: Listing = {
    id: listingId,
    userId: input.sellerId,
    status: "PENDING",
    feesPaid: Boolean(input.feesPaid),
    createdAt: now,
    updatedAt: now
  };
  const property: Property = {
    id: propertyId,
    listingId,
    ...input.property,
    createdAt: now,
    updatedAt: now
  };
  db().listings.push(listing);
  db().properties.push(property);
  return { listing, property };
}

export function deleteSellerListing(listingId: string, sellerId: string) {
  const listing = db().listings.find((l) => l.id === listingId && canSellerAccessListing(sellerId, l.userId));
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const property = db().properties.find((p) => p.listingId === listing.id) ?? null;

  db().listings = db().listings.filter((l) => l.id !== listing.id);
  db().properties = db().properties.filter((p) => p.listingId !== listing.id);

  const propertyId = property?.id;
  if (propertyId) {
    db().favorites = db().favorites.filter((f) => f.propertyId !== propertyId);
    db().appointments = db().appointments.filter((a) => a.propertyId !== propertyId);
  }

  db().communityListingLikes = db().communityListingLikes.filter((x) => x.listingId !== listing.id);
  db().communityListingCommentLikes = db().communityListingCommentLikes.filter((x) => x.listingId !== listing.id);
  db().communityListingComments = db().communityListingComments.filter((x) => x.listingId !== listing.id);

  saveDbToDisk(db());
  return { ok: true as const };
}

function basePublicCards() {
  return db().properties
    .map((property) => {
      const listing = db().listings.find((l) => l.id === property.listingId);
      if (!listing) return null;
      const seller = db().users.find((u) => u.id === listing.userId);
      const ownerCompany = seller?.companyOwnerId ? db().users.find((u) => u.id === seller.companyOwnerId) : null;
      const valueForDeal = property.transaction === "RENT" ? property.rentPrice ?? 0 : property.price ?? 0;
      return {
        ...property,
        listingStatus: listing.status,
        verified: listing.status === "APPROVED",
        sellerId: listing.userId,
        listedByName: seller?.name ?? "Seller",
        listedByCompanyName: ownerCompany?.name,
        listedByPhone: seller?.phone ?? ownerCompany?.phone,
        goodDeal: property.areaSqm > 0 ? valueForDeal / property.areaSqm < 28000 : false
      } as PublicPropertyCard;
    })
    .filter((x): x is PublicPropertyCard => Boolean(x));
}

function currentPrice(item: PublicPropertyCard) {
  return item.transaction === "RENT" ? item.rentPrice ?? 0 : item.price ?? 0;
}

export function searchProperties(filters: SearchFilters): SearchResult {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(40, filters.pageSize ?? 20));
  let items = basePublicCards().filter((x) => x.listingStatus === "APPROVED");

  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter((x) => `${x.title} ${x.description}`.toLowerCase().includes(q));
  }
  if (filters.transaction) items = items.filter((x) => x.transaction === filters.transaction);
  if (filters.type && filters.type.length > 0) items = items.filter((x) => filters.type?.includes(x.type));
  if (filters.city) items = items.filter((x) => x.city === filters.city);
  if (filters.area) items = items.filter((x) => x.area === filters.area);
  if (filters.district) items = items.filter((x) => x.district === filters.district);
  if (filters.minPrice !== undefined) items = items.filter((x) => currentPrice(x) >= filters.minPrice!);
  if (filters.maxPrice !== undefined) items = items.filter((x) => currentPrice(x) <= filters.maxPrice!);
  if (filters.minArea !== undefined) items = items.filter((x) => x.areaSqm >= filters.minArea!);
  if (filters.maxArea !== undefined) items = items.filter((x) => x.areaSqm <= filters.maxArea!);
  if (filters.minBeds !== undefined) items = items.filter((x) => x.bedrooms >= filters.minBeds!);
  if (filters.maxBeds !== undefined) items = items.filter((x) => x.bedrooms <= filters.maxBeds!);
  if (filters.minBaths !== undefined) items = items.filter((x) => x.bathrooms >= filters.minBaths!);
  if (filters.maxBaths !== undefined) items = items.filter((x) => x.bathrooms <= filters.maxBaths!);
  if (filters.paymentType) items = items.filter((x) => x.paymentType === filters.paymentType);
  if (filters.furnishing) items = items.filter((x) => x.furnishing === filters.furnishing);
  if (filters.completionStatus) items = items.filter((x) => x.completionStatus === filters.completionStatus);
  if (filters.amenities && filters.amenities.length > 0) {
    items = items.filter((x) => filters.amenities!.every((a) => x.amenities.includes(a)));
  }
  if (filters.downPaymentMax !== undefined) {
    items = items.filter((x) => (x.installmentDownPayment ?? Number.MAX_SAFE_INTEGER) <= filters.downPaymentMax!);
  }
  if (filters.installmentYearsMax !== undefined) {
    items = items.filter((x) => (x.installmentYears ?? Number.MAX_SAFE_INTEGER) <= filters.installmentYearsMax!);
  }
  if (filters.installmentMonthlyMax !== undefined) {
    items = items.filter((x) => (x.installmentMonthly ?? Number.MAX_SAFE_INTEGER) <= filters.installmentMonthlyMax!);
  }
  if (filters.lat !== undefined && filters.lng !== undefined) {
    items = items.map((x) => ({ ...x, distanceKm: haversineDistanceKm(filters.lat!, filters.lng!, x.lat, x.lng) }));
    if (filters.distanceKm !== undefined) items = items.filter((x) => (x.distanceKm ?? 0) <= filters.distanceKm!);
  }

  const sort = filters.sort ?? "FEATURED";
  items.sort((a, b) => {
    if (sort === "FEATURED") return Number(b.goodDeal) - Number(a.goodDeal) || currentPrice(a) - currentPrice(b);
    if (sort === "NEWEST") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === "PRICE_ASC") return currentPrice(a) - currentPrice(b);
    if (sort === "PRICE_DESC") return currentPrice(b) - currentPrice(a);
    if (sort === "AREA_DESC") return b.areaSqm - a.areaSqm;
    if (sort === "DISTANCE_ASC") return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    return 0;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    items: items.slice(start, start + pageSize)
  };
}

export function getPublicPropertyById(id: string) {
  return basePublicCards().find((x) => x.id === id && x.listingStatus === "APPROVED") ?? null;
}

export function getPropertyForSeller(id: string, sellerId: string) {
  const p = db().properties.find((x) => x.id === id);
  if (!p) return null;
  const listing = db().listings.find((x) => x.id === p.listingId);
  if (!listing || !canSellerAccessListing(sellerId, listing.userId)) return null;
  return { property: p, listing };
}

export function getSellerListingById(listingId: string, sellerId: string) {
  const listing = db().listings.find((x) => x.id === listingId && canSellerAccessListing(sellerId, x.userId));
  if (!listing) return null;
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return null;
  return { listing, property };
}

export function listSellerDashboard(sellerId: string) {
  const visibleSellerIds = getSellerDashboardScopeIds(sellerId);
  const listings = db().listings.filter((l) => visibleSellerIds.includes(l.userId));
  const byStatus = listings.reduce<Record<ListingStatus, number>>(
    (acc, l) => {
      acc[l.status] += 1;
      return acc;
    },
    { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }
  );
  const detailed = listings.map((listing) => ({
    listing,
    property: db().properties.find((p) => p.listingId === listing.id) ?? null,
    seller: db().users.find((u) => u.id === listing.userId) ?? null
  }));
  return { listings, byStatus, detailed };
}

function getSellerDashboardScopeIds(sellerId: string) {
  const memberIds = db()
    .users.filter((u) => u.role === "SELLER" && u.companyOwnerId === sellerId)
    .map((u) => u.id);
  return memberIds.length > 0 ? [sellerId, ...memberIds] : [sellerId];
}

function canSellerAccessListing(viewerSellerId: string, listingOwnerSellerId: string) {
  if (viewerSellerId === listingOwnerSellerId) return true;
  const ownerOfListing = db().users.find((u) => u.id === listingOwnerSellerId && u.role === "SELLER");
  return Boolean(ownerOfListing && ownerOfListing.companyOwnerId === viewerSellerId);
}

export function listFavorites(userId: string) {
  const favoriteIds = db().favorites.filter((f) => f.userId === userId).map((f) => f.propertyId);
  return basePublicCards().filter((x) => favoriteIds.includes(x.id) && x.listingStatus === "APPROVED");
}

export function toggleFavorite(userId: string, propertyId: string) {
  const existing = db().favorites.find((f) => f.userId === userId && f.propertyId === propertyId);
  if (existing) {
    db().favorites = db().favorites.filter((f) => f.id !== existing.id);
    return { saved: false };
  }
  db().favorites.push({ id: `fav-${db().favorites.length + 1}`, userId, propertyId, createdAt: new Date().toISOString() });
  return { saved: true };
}

export function createAppointment(input: Omit<Appointment, "id" | "status" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    ...input,
    id: `ap-${db().appointments.length + 1}`,
    status: "PENDING",
    suggestedSlots: [],
    createdAt: now,
    updatedAt: now
  };
  db().appointments.push(appointment);
  return appointment;
}

export function createViewingRequestMessage(input: {
  appointmentId: string;
  buyerId: string;
  propertyId: string;
  datetime: string;
  contactName: string;
  contactPhone: string;
  notes?: string;
}) {
  const property = db().properties.find((p) => p.id === input.propertyId);
  if (!property) return null;
  const listing = db().listings.find((l) => l.id === property.listingId);
  if (!listing) return null;

  const now = new Date().toISOString();
  const subject = `New viewing request for ${property.title}`;
  const lines = [
    `Buyer contact: ${input.contactName} (${input.contactPhone})`,
    `Preferred time: ${new Date(input.datetime).toLocaleString()}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null
  ].filter((x): x is string => Boolean(x));
  const body = lines.join("\n");

  const message: SellerMessage = {
    id: `sm-${db().sellerMessages.length + 1}`,
    sellerId: listing.userId,
    buyerId: input.buyerId,
    propertyId: input.propertyId,
    appointmentId: input.appointmentId,
    subject,
    body,
    createdAt: now,
    readAt: null
  };

  db().sellerMessages.push(message);
  return message;
}

export function listSellerMessages(sellerId: string) {
  return db()
    .sellerMessages.filter((m) => m.sellerId === sellerId)
    .map((m) => {
      const property = db().properties.find((p) => p.id === m.propertyId);
      const buyer = db().users.find((u) => u.id === m.buyerId);
      return {
        ...m,
        propertyTitle: property?.title ?? m.propertyId,
        buyerName: buyer?.name ?? "Buyer",
        buyerEmail: buyer?.email ?? ""
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function listSellerAppointments(sellerId: string) {
  return db()
    .appointments.map((appointment) => {
      const property = db().properties.find((p) => p.id === appointment.propertyId);
      if (!property) return null;
      const listing = db().listings.find((l) => l.id === property.listingId);
      if (!listing || listing.userId !== sellerId) return null;
      const buyer = db().users.find((u) => u.id === appointment.userId);
      return {
        appointment,
        property,
        buyer: buyer ?? null
      };
    })
    .filter((x): x is { appointment: Appointment; property: Property; buyer: User | null } => Boolean(x))
    .sort((a, b) => Date.parse(b.appointment.createdAt) - Date.parse(a.appointment.createdAt));
}

export function updateSellerAppointment(
  appointmentId: string,
  sellerId: string,
  input: { action: "APPROVE" | "DENY" | "RESCHEDULE"; datetime?: string; slots?: string[] }
) {
  const appointment = db().appointments.find((a) => a.id === appointmentId);
  if (!appointment) return null;

  const property = db().properties.find((p) => p.id === appointment.propertyId);
  if (!property) return null;

  const listing = db().listings.find((l) => l.id === property.listingId);
  if (!listing || listing.userId !== sellerId) return null;

  const now = new Date().toISOString();
  if (input.action === "APPROVE") {
    appointment.status = "CONFIRMED";
    appointment.suggestedSlots = [];
  }
  if (input.action === "DENY") {
    appointment.status = "CANCELLED";
    appointment.suggestedSlots = [];
  }
  if (input.action === "RESCHEDULE") {
    const normalizedSlots = (input.slots ?? [])
      .map((s) => new Date(s).toISOString())
      .filter((s) => !Number.isNaN(Date.parse(s)));
    if (normalizedSlots.length === 0 && input.datetime) {
      const fallback = new Date(input.datetime).toISOString();
      if (!Number.isNaN(Date.parse(fallback))) normalizedSlots.push(fallback);
    }
    if (normalizedSlots.length === 0) return null;
    appointment.suggestedSlots = Array.from(new Set(normalizedSlots)).slice(0, 5);
    appointment.status = "RESCHEDULED";
  }
  appointment.updatedAt = now;
  return appointment;
}

export function listBuyerAppointments(buyerId: string) {
  return db()
    .appointments.filter((a) => a.userId === buyerId)
    .map((appointment) => {
      const property = db().properties.find((p) => p.id === appointment.propertyId);
      const listing = property ? db().listings.find((l) => l.id === property.listingId) : null;
      const seller = listing ? db().users.find((u) => u.id === listing.userId) : null;
      return {
        appointment,
        property: property ?? null,
        seller: seller ?? null
      };
    })
    .sort((a, b) => Date.parse(b.appointment.createdAt) - Date.parse(a.appointment.createdAt));
}

export function buyerSelectAppointmentSlot(appointmentId: string, buyerId: string, datetime: string) {
  const appointment = db().appointments.find((a) => a.id === appointmentId && a.userId === buyerId);
  if (!appointment) return null;
  const selectedIso = new Date(datetime).toISOString();
  if (Number.isNaN(Date.parse(selectedIso))) return null;
  const allowed = new Set(appointment.suggestedSlots);
  if (!allowed.has(selectedIso)) return null;
  appointment.datetime = selectedIso;
  appointment.status = "PENDING";
  appointment.suggestedSlots = [];
  appointment.updatedAt = new Date().toISOString();
  return appointment;
}

export function createSavedSearch(userId: string, queryJson: string) {
  const entry: SavedSearch = {
    id: `ss-${db().savedSearches.length + 1}`,
    userId,
    queryJson,
    createdAt: new Date().toISOString()
  };
  db().savedSearches.push(entry);
  return entry;
}

export function getRecommendations(userId?: string, currentPropertyId?: string) {
  const source = basePublicCards().filter((x) => x.listingStatus === "APPROVED");
  const favorites = userId ? db().favorites.filter((f) => f.userId === userId) : [];
  const favoriteProperties = source.filter((p) => favorites.some((f) => f.propertyId === p.id));
  const favoriteAreas = new Set(favoriteProperties.map((p) => p.area));
  const favoriteTypes = new Set(favoriteProperties.map((p) => p.type));
  const current = currentPropertyId ? source.find((p) => p.id === currentPropertyId) : null;

  return source
    .filter((x) => x.id !== currentPropertyId)
    .map((x) => {
      let score = 0;
      if (favoriteAreas.has(x.area)) score += 2;
      if (favoriteTypes.has(x.type)) score += 2;
      if (current && current.area === x.area) score += 3;
      if (current && current.type === x.type) score += 1;
      if (x.goodDeal) score += 1;
      return { ...x, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function getCompareIds(userId: string) {
  return db().compareByUser[userId] ?? [];
}

export function setCompareIds(userId: string, ids: string[]) {
  db().compareByUser[userId] = ids.slice(0, 4);
  return db().compareByUser[userId];
}

type CommunityCommentView = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  canDelete: boolean;
  replies?: CommunityCommentView[];
  repliesCount?: number;
  likesCount?: number;
  likedByViewer?: boolean;
};

type CommunityPostView = {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; avatarUrl?: string | null; isDeveloper: boolean; companyName?: string | null };
  likesCount: number;
  likeCount: number;
  loveCount: number;
  commentsCount: number;
  reactionByViewer: "LIKE" | "LOVE" | null;
  comments: CommunityCommentView[];
};

type CommunityListingView = {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  imageUrl?: string;
  city: string;
  area: string;
  district: string;
  transaction: "BUY" | "RENT" | "VACATION";
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string; avatarUrl?: string | null; isDeveloper: boolean };
  likesCount: number;
  likedByViewer: boolean;
  commentsCount: number;
  comments: CommunityCommentView[];
};

function mapCommunityPost(post: CommunityPost, viewerId?: string | null): CommunityPostView {
  const author = getUserById(post.userId);
  const viewerIsAdmin = viewerId ? getUserById(viewerId)?.role === "ADMIN" : false;
  const companyName = author?.companyOwnerId
    ? getUserById(author.companyOwnerId)?.name ?? null
    : author?.isCompanyAccount
      ? author.name
      : null;
  const likes = db().communityPostLikes.filter((x) => x.postId === post.id);
  const likeCount = likes.filter((x) => x.reaction === "LIKE").length;
  const loveCount = likes.filter((x) => x.reaction === "LOVE").length;
  const viewerReaction = viewerId ? likes.find((x) => x.userId === viewerId)?.reaction ?? null : null;
  const comments = db()
    .communityPostComments.filter((x) => x.postId === post.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const commentLikes = db().communityPostCommentLikes.filter((x) => x.postId === post.id);
  const likesCountByCommentId = new Map<string, number>();
  const likedByViewerCommentId = new Set<string>();
  for (const like of commentLikes) {
    likesCountByCommentId.set(like.commentId, (likesCountByCommentId.get(like.commentId) ?? 0) + 1);
    if (viewerId && like.userId === viewerId) likedByViewerCommentId.add(like.commentId);
  }

  const commentViews: CommunityCommentView[] = comments.map((comment) => {
    const u = getUserById(comment.userId);
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      canDelete: Boolean(viewerId && (comment.userId === viewerId || viewerIsAdmin)),
      likesCount: likesCountByCommentId.get(comment.id) ?? 0,
      likedByViewer: Boolean(viewerId && likedByViewerCommentId.has(comment.id)),
      user: {
        id: u?.id ?? "unknown",
        name: u?.name ?? "Unknown user",
        avatarUrl: u?.avatarUrl ?? null
      }
    };
  });

  const viewsById = new Map(commentViews.map((c) => [c.id, c]));
  const topLevel: CommunityCommentView[] = [];
  const repliesByParent = new Map<string, CommunityCommentView[]>();
  for (const raw of comments) {
    const parentId = (raw as { parentCommentId?: string | null }).parentCommentId ?? null;
    if (!parentId) continue;
    const v = viewsById.get(raw.id);
    if (!v) continue;
    const list = repliesByParent.get(parentId) ?? [];
    list.push(v);
    repliesByParent.set(parentId, list);
  }
  for (const raw of comments) {
    const v = viewsById.get(raw.id);
    if (!v) continue;
    const replies = repliesByParent.get(raw.id);
    if (replies?.length) {
      v.replies = replies;
      v.repliesCount = replies.length;
    } else {
      v.repliesCount = 0;
    }
    const parentId = (raw as { parentCommentId?: string | null }).parentCommentId ?? null;
    if (!parentId) topLevel.push(v);
  }

  return {
    id: post.id,
    text: post.text,
    imageUrl: post.imageUrl ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    user: {
      id: author?.id ?? "unknown",
      name: author?.name ?? "Unknown user",
      avatarUrl: author?.avatarUrl ?? null,
      isDeveloper: Boolean(author?.isCompanyAccount),
      companyName
    },
    likesCount: likes.length,
    likeCount,
    loveCount,
    commentsCount: comments.length,
    reactionByViewer: viewerReaction,
    comments: topLevel
  };
}

export function listCommunityPosts(viewerId?: string | null) {
  return db()
    .communityPosts.slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((post) => mapCommunityPost(post, viewerId));
}

function mapCommunityListing(listing: Listing, property: Property, viewerId?: string | null): CommunityListingView {
  const seller = getUserById(listing.userId);
  const viewerIsAdmin = viewerId ? getUserById(viewerId)?.role === "ADMIN" : false;
  const likes = db().communityListingLikes.filter((x) => x.listingId === listing.id);
  const comments = db()
    .communityListingComments.filter((x) => x.listingId === listing.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const commentLikes = db().communityListingCommentLikes.filter((x) => x.listingId === listing.id);
  const likesCountByCommentId = new Map<string, number>();
  const likedByViewerCommentId = new Set<string>();
  for (const like of commentLikes) {
    likesCountByCommentId.set(like.commentId, (likesCountByCommentId.get(like.commentId) ?? 0) + 1);
    if (viewerId && like.userId === viewerId) likedByViewerCommentId.add(like.commentId);
  }

  const commentViews: CommunityCommentView[] = comments.map((comment) => {
    const user = getUserById(comment.userId);
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      canDelete: Boolean(viewerId && (comment.userId === viewerId || viewerIsAdmin)),
      likesCount: likesCountByCommentId.get(comment.id) ?? 0,
      likedByViewer: Boolean(viewerId && likedByViewerCommentId.has(comment.id)),
      user: {
        id: user?.id ?? "unknown",
        name: user?.name ?? "Unknown user",
        avatarUrl: user?.avatarUrl ?? null
      }
    };
  });

  const viewsById = new Map(commentViews.map((c) => [c.id, c]));
  const topLevel: CommunityCommentView[] = [];
  const repliesByParent = new Map<string, CommunityCommentView[]>();
  for (const raw of comments) {
    const parentId = (raw as { parentCommentId?: string | null }).parentCommentId ?? null;
    if (!parentId) continue;
    const v = viewsById.get(raw.id);
    if (!v) continue;
    const list = repliesByParent.get(parentId) ?? [];
    list.push(v);
    repliesByParent.set(parentId, list);
  }
  for (const raw of comments) {
    const v = viewsById.get(raw.id);
    if (!v) continue;
    const replies = repliesByParent.get(raw.id);
    if (replies?.length) {
      v.replies = replies;
      v.repliesCount = replies.length;
    } else {
      v.repliesCount = 0;
    }
    const parentId = (raw as { parentCommentId?: string | null }).parentCommentId ?? null;
    if (!parentId) topLevel.push(v);
  }

  return {
    listingId: listing.id,
    propertyId: property.id,
    title: property.title,
    description: property.description,
    imageUrl: property.images[0],
    city: property.city,
    area: property.area,
    district: property.district,
    transaction: property.transaction,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    seller: {
      id: seller?.id ?? "unknown",
      name: seller?.name ?? "Unknown seller",
      avatarUrl: seller?.avatarUrl ?? null,
      isDeveloper: Boolean(seller?.isCompanyAccount)
    },
    likesCount: likes.length,
    likedByViewer: viewerId ? likes.some((x) => x.userId === viewerId) : false,
    commentsCount: comments.length,
    comments: topLevel
  };
}

export function listCommunityListings(viewerId?: string | null) {
  const propertyByListingId = new Map(db().properties.map((p) => [p.listingId, p]));

  return db()
    .listings
    .filter((listing) => listing.status === "APPROVED")
    .map((listing) => {
      const property = propertyByListingId.get(listing.id);
      if (!property) return null;
      return mapCommunityListing(listing, property, viewerId);
    })
    .filter((x): x is CommunityListingView => Boolean(x))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function toggleCommunityListingLike(listingId: string, userId: string) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const listing = db().listings.find((x) => x.id === listingId && x.status === "APPROVED");
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return { ok: false as const, error: "Listing not found." };

  const existing = db().communityListingLikes.find((x) => x.listingId === listingId && x.userId === userId);
  if (existing) {
    db().communityListingLikes = db().communityListingLikes.filter((x) => x.id !== existing.id);
  } else {
    db().communityListingLikes.push({
      id: `cll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      listingId,
      userId,
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true as const, listing: mapCommunityListing(listing, property, userId) };
}

export function addCommunityListingComment(
  listingId: string,
  userId: string,
  textInput: string,
  parentCommentId?: string | null
) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const listing = db().listings.find((x) => x.id === listingId && x.status === "APPROVED");
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return { ok: false as const, error: "Listing not found." };

  const text = textInput.trim();
  if (!text) return { ok: false as const, error: "Comment is required." };
  if (text.length > 300) return { ok: false as const, error: "Comment must be 300 characters or less." };
  const parentId = (parentCommentId ?? "").trim();
  if (parentId) {
    const parent = db().communityListingComments.find((x) => x.id === parentId && x.listingId === listingId);
    if (!parent) return { ok: false as const, error: "Parent comment not found." };
  }

  db().communityListingComments.push({
    id: `clc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listingId,
    userId,
    text,
    parentCommentId: parentId || null,
    createdAt: new Date().toISOString()
  });
  return { ok: true as const, listing: mapCommunityListing(listing, property, userId) };
}

export function deleteCommunityListingComment(listingId: string, commentId: string, userId: string) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const listing = db().listings.find((x) => x.id === listingId && x.status === "APPROVED");
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return { ok: false as const, error: "Listing not found." };

  const comment = db().communityListingComments.find((x) => x.id === commentId && x.listingId === listingId);
  if (!comment) return { ok: false as const, error: "Comment not found." };
  if (comment.userId !== userId && user.role !== "ADMIN")
    return { ok: false as const, error: "You can only delete your own comment." };

  const toDelete = new Set<string>([commentId]);
  while (true) {
    const before = toDelete.size;
    for (const c of db().communityListingComments) {
      const parentId = (c as { parentCommentId?: string | null }).parentCommentId ?? null;
      if (parentId && toDelete.has(parentId)) toDelete.add(c.id);
    }
    if (toDelete.size === before) break;
  }

  db().communityListingComments = db().communityListingComments.filter((x) => !toDelete.has(x.id));
  db().communityListingCommentLikes = db().communityListingCommentLikes.filter((x) => !toDelete.has(x.commentId));
  return { ok: true as const, listing: mapCommunityListing(listing, property, userId) };
}

export function createCommunityPost(userId: string, input: { text: string; imageUrl?: string }) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "You are not allowed to post." };
  if (user.role !== "SELLER") return { ok: false as const, error: "Only sellers and developers can create posts." };

  const text = input.text.trim();
  const imageUrl = (input.imageUrl ?? "").trim();
  if (!text) return { ok: false as const, error: "Post text is required." };
  if (text.length > 1000) return { ok: false as const, error: "Post text must be 1000 characters or less." };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { ok: false as const, error: "Image URL must start with http:// or https://." };

  const now = new Date().toISOString();
  const post: CommunityPost = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    text,
    imageUrl: imageUrl || null,
    createdAt: now,
    updatedAt: now
  };
  db().communityPosts.push(post);
  return { ok: true as const, post: mapCommunityPost(post, userId) };
}

export function toggleCommunityPostLike(postId: string, userId: string) {
  return setCommunityPostReaction(postId, userId, "LIKE");
}

export function setCommunityPostReaction(postId: string, userId: string, reaction: "LIKE" | "LOVE") {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const post = db().communityPosts.find((x) => x.id === postId);
  if (!post) return { ok: false as const, error: "Post not found." };

  const existing = db().communityPostLikes.find((x) => x.postId === postId && x.userId === userId);
  if (existing && existing.reaction === reaction) {
    db().communityPostLikes = db().communityPostLikes.filter((x) => x.id !== existing.id);
  } else if (existing) {
    existing.reaction = reaction;
    existing.createdAt = new Date().toISOString();
  } else {
    db().communityPostLikes.push({
      id: `cpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId,
      userId,
      reaction,
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true as const, post: mapCommunityPost(post, userId) };
}

export function addCommunityPostComment(postId: string, userId: string, textInput: string, parentCommentId?: string | null) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const post = db().communityPosts.find((x) => x.id === postId);
  if (!post) return { ok: false as const, error: "Post not found." };

  const text = textInput.trim();
  if (!text) return { ok: false as const, error: "Comment is required." };
  if (text.length > 300) return { ok: false as const, error: "Comment must be 300 characters or less." };
  const parentId = (parentCommentId ?? "").trim();
  if (parentId) {
    const parent = db().communityPostComments.find((x) => x.id === parentId && x.postId === postId);
    if (!parent) return { ok: false as const, error: "Parent comment not found." };
  }

  db().communityPostComments.push({
    id: `cpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId,
    userId,
    text,
    parentCommentId: parentId || null,
    createdAt: new Date().toISOString()
  });
  return { ok: true as const, post: mapCommunityPost(post, userId) };
}

export function deleteCommunityPostComment(postId: string, commentId: string, userId: string) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const post = db().communityPosts.find((x) => x.id === postId);
  if (!post) return { ok: false as const, error: "Post not found." };

  const comment = db().communityPostComments.find((x) => x.id === commentId && x.postId === postId);
  if (!comment) return { ok: false as const, error: "Comment not found." };
  if (comment.userId !== userId && user.role !== "ADMIN")
    return { ok: false as const, error: "You can only delete your own comment." };

  const toDelete = new Set<string>([commentId]);
  while (true) {
    const before = toDelete.size;
    for (const c of db().communityPostComments) {
      const parentId = (c as { parentCommentId?: string | null }).parentCommentId ?? null;
      if (parentId && toDelete.has(parentId)) toDelete.add(c.id);
    }
    if (toDelete.size === before) break;
  }

  db().communityPostComments = db().communityPostComments.filter((x) => !toDelete.has(x.id));
  db().communityPostCommentLikes = db().communityPostCommentLikes.filter((x) => !toDelete.has(x.commentId));
  return { ok: true as const, post: mapCommunityPost(post, userId) };
}

export function toggleCommunityPostCommentLike(postId: string, commentId: string, userId: string) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const post = db().communityPosts.find((x) => x.id === postId);
  if (!post) return { ok: false as const, error: "Post not found." };
  const comment = db().communityPostComments.find((x) => x.id === commentId && x.postId === postId);
  if (!comment) return { ok: false as const, error: "Comment not found." };

  const existing = db().communityPostCommentLikes.find((x) => x.postId === postId && x.commentId === commentId && x.userId === userId);
  if (existing) {
    db().communityPostCommentLikes = db().communityPostCommentLikes.filter((x) => x.id !== existing.id);
  } else {
    db().communityPostCommentLikes.push({
      id: `cpcl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId,
      commentId,
      userId,
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true as const, post: mapCommunityPost(post, userId) };
}

export function toggleCommunityListingCommentLike(listingId: string, commentId: string, userId: string) {
  const user = getUserById(userId);
  if (!user || user.blocked) return { ok: false as const, error: "Login required." };
  const listing = db().listings.find((x) => x.id === listingId && x.status === "APPROVED");
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return { ok: false as const, error: "Listing not found." };
  const comment = db().communityListingComments.find((x) => x.id === commentId && x.listingId === listingId);
  if (!comment) return { ok: false as const, error: "Comment not found." };

  const existing = db().communityListingCommentLikes.find(
    (x) => x.listingId === listingId && x.commentId === commentId && x.userId === userId
  );
  if (existing) {
    db().communityListingCommentLikes = db().communityListingCommentLikes.filter((x) => x.id !== existing.id);
  } else {
    db().communityListingCommentLikes.push({
      id: `clcl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      listingId,
      commentId,
      userId,
      createdAt: new Date().toISOString()
    });
  }
  return { ok: true as const, listing: mapCommunityListing(listing, property, userId) };
}

export function listNotifications(userId: string) {
  return listAllNotifications(userId).slice(0, 5);
}

export function getUnreadNotificationsCount(userId: string) {
  const seen = new Set(db().seenNotificationIdsByUser[userId] ?? []);
  return listAllNotifications(userId).filter((n) => !seen.has(n.id)).length;
}

export function markNotificationsSeen(userId: string) {
  const ids = listAllNotifications(userId).map((n) => n.id);
  db().seenNotificationIdsByUser[userId] = ids;
}

export function markNotificationSeen(userId: string, notificationId: string) {
  const seen = new Set(db().seenNotificationIdsByUser[userId] ?? []);
  seen.add(notificationId);
  db().seenNotificationIdsByUser[userId] = Array.from(seen);
}

export function listAllNotificationsWithRead(userId: string) {
  const seen = new Set(db().seenNotificationIdsByUser[userId] ?? []);
  return listAllNotifications(userId).map((n) => ({
    ...n,
    read: seen.has(n.id)
  }));
}

export function listAllNotifications(userId: string): NotificationItem[] {
  const user = getUserById(userId);
  if (!user) return [];

  const propertyById = new Map(db().properties.map((p) => [p.id, p]));
  const listingById = new Map(db().listings.map((l) => [l.id, l]));
  const userById = new Map(db().users.map((u) => [u.id, u]));
  const postById = new Map(db().communityPosts.map((p) => [p.id, p]));
  const commentersByPostId = new Map<string, Set<string>>();
  for (const c of db().communityPostComments) {
    const set = commentersByPostId.get(c.postId) ?? new Set<string>();
    set.add(c.userId);
    commentersByPostId.set(c.postId, set);
  }
  const commentersByListingId = new Map<string, Set<string>>();
  for (const c of db().communityListingComments) {
    const set = commentersByListingId.get(c.listingId) ?? new Set<string>();
    set.add(c.userId);
    commentersByListingId.set(c.listingId, set);
  }

  const savedSearchNotes: NotificationItem[] = db()
    .savedSearches.filter((s) => s.userId === userId)
    .map((s) => ({
      id: `n-ss-${s.id}`,
      text: "Saved search alert is active.",
      createdAt: s.createdAt,
      href: "/search"
    }));

  const communityPostLikeNotes: NotificationItem[] = db()
    .communityPostLikes
    .filter((like) => {
      const post = postById.get(like.postId);
      if (!post) return false;
      const postOwner = userById.get(post.userId);
      const targets = new Set<string>([post.userId]);
      if (postOwner?.companyOwnerId) targets.add(postOwner.companyOwnerId);
      return targets.has(userId) && like.userId !== userId;
    })
    .map((like) => {
      const post = postById.get(like.postId)!;
      const actor = userById.get(like.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-post-like-${like.id}`,
        text: `${actorName} liked your community post.`,
        createdAt: like.createdAt,
        href: `/community?post=${encodeURIComponent(post.id)}`
      };
    });

  const communityPostCommentNotes: NotificationItem[] = db()
    .communityPostComments
    .filter((comment) => {
      const post = postById.get(comment.postId);
      if (!post) return false;
      const postOwner = userById.get(post.userId);
      const targets = new Set<string>([post.userId]);
      if (postOwner?.companyOwnerId) targets.add(postOwner.companyOwnerId);
      return targets.has(userId) && comment.userId !== userId;
    })
    .map((comment) => {
      const post = postById.get(comment.postId)!;
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-post-comment-${comment.id}`,
        text: `${actorName} commented on your community post.`,
        createdAt: comment.createdAt,
        href: `/community?post=${encodeURIComponent(post.id)}`
      };
    });

  const communityPostParticipantCommentNotes: NotificationItem[] = db()
    .communityPostComments
    .filter((comment) => {
      const participants = commentersByPostId.get(comment.postId);
      if (!participants || !participants.has(userId)) return false;
      if (comment.userId === userId) return false;
      const post = postById.get(comment.postId);
      if (!post) return false;
      if (post.userId === userId) return false; // owner already covered by communityPostCommentNotes
      return true;
    })
    .map((comment) => {
      const post = postById.get(comment.postId)!;
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-post-participant-comment-${comment.id}-${userId}`,
        text: `${actorName} commented on a post you commented on.`,
        createdAt: comment.createdAt,
        href: `/community?post=${encodeURIComponent(post.id)}`
      };
    });

  const communityListingLikeNotes: NotificationItem[] = db()
    .communityListingLikes
    .filter((like) => {
      const listing = listingById.get(like.listingId);
      if (!listing) return false;
      const listingOwner = userById.get(listing.userId);
      const targets = new Set<string>([listing.userId]);
      if (listingOwner?.companyOwnerId) targets.add(listingOwner.companyOwnerId);
      return targets.has(userId) && like.userId !== userId;
    })
    .map((like) => {
      const listing = listingById.get(like.listingId)!;
      const property = db().properties.find((p) => p.listingId === listing.id);
      const actor = userById.get(like.userId);
      const actorName = actor?.name ?? "Someone";
      const label = property?.title ?? "your listing";
      return {
        id: `n-community-listing-like-${like.id}`,
        text: `${actorName} liked ${label}.`,
        createdAt: like.createdAt,
        href: `/community?listing=${encodeURIComponent(listing.id)}`
      };
    });

  const communityListingCommentNotes: NotificationItem[] = db()
    .communityListingComments
    .filter((comment) => {
      const listing = listingById.get(comment.listingId);
      if (!listing) return false;
      const listingOwner = userById.get(listing.userId);
      const targets = new Set<string>([listing.userId]);
      if (listingOwner?.companyOwnerId) targets.add(listingOwner.companyOwnerId);
      return targets.has(userId) && comment.userId !== userId;
    })
    .map((comment) => {
      const listing = listingById.get(comment.listingId)!;
      const property = db().properties.find((p) => p.listingId === listing.id);
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      const label = property?.title ?? "your listing";
      return {
        id: `n-community-listing-comment-${comment.id}`,
        text: `${actorName} commented on ${label}.`,
        createdAt: comment.createdAt,
        href: `/community?listing=${encodeURIComponent(listing.id)}`
      };
    });

  const communityListingParticipantCommentNotes: NotificationItem[] = db()
    .communityListingComments
    .filter((comment) => {
      const participants = commentersByListingId.get(comment.listingId);
      if (!participants || !participants.has(userId)) return false;
      if (comment.userId === userId) return false;
      const listing = listingById.get(comment.listingId);
      if (!listing) return false;
      if (listing.userId === userId) return false; // owner already covered by communityListingCommentNotes
      return true;
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-listing-participant-comment-${comment.id}-${userId}`,
        text: `${actorName} commented on a listing you commented on.`,
        createdAt: comment.createdAt,
        href: `/community?listing=${encodeURIComponent(comment.listingId)}`
      };
    });

  const communityPostReplyNotes: NotificationItem[] = db()
    .communityPostComments
    .filter((comment) => {
      const parentId = (comment.parentCommentId ?? "").trim();
      if (!parentId) return false;
      const parent = db().communityPostComments.find((x) => x.id === parentId && x.postId === comment.postId);
      if (!parent) return false;
      return parent.userId === userId && comment.userId !== userId;
    })
    .map((comment) => {
      const post = postById.get(comment.postId);
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-post-reply-${comment.id}`,
        text: `${actorName} replied to your comment.`,
        createdAt: comment.createdAt,
        href: post ? `/community?post=${encodeURIComponent(post.id)}` : "/community"
      };
    });

  const communityListingReplyNotes: NotificationItem[] = db()
    .communityListingComments
    .filter((comment) => {
      const parentId = (comment.parentCommentId ?? "").trim();
      if (!parentId) return false;
      const parent = db().communityListingComments.find((x) => x.id === parentId && x.listingId === comment.listingId);
      if (!parent) return false;
      return parent.userId === userId && comment.userId !== userId;
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-listing-reply-${comment.id}`,
        text: `${actorName} replied to your comment.`,
        createdAt: comment.createdAt,
        href: `/community?listing=${encodeURIComponent(comment.listingId)}`
      };
    });

  const communityPostCommentLikeNotes: NotificationItem[] = db()
    .communityPostCommentLikes
    .filter((like) => {
      const comment = db().communityPostComments.find((c) => c.id === like.commentId && c.postId === like.postId);
      if (!comment) return false;
      return comment.userId === userId && like.userId !== userId;
    })
    .map((like) => {
      const post = postById.get(like.postId);
      const actor = userById.get(like.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-post-comment-like-${like.id}`,
        text: `${actorName} liked your comment.`,
        createdAt: like.createdAt,
        href: post ? `/community?post=${encodeURIComponent(post.id)}` : "/community"
      };
    });

  const communityListingCommentLikeNotes: NotificationItem[] = db()
    .communityListingCommentLikes
    .filter((like) => {
      const comment = db().communityListingComments.find((c) => c.id === like.commentId && c.listingId === like.listingId);
      if (!comment) return false;
      return comment.userId === userId && like.userId !== userId;
    })
    .map((like) => {
      const actor = userById.get(like.userId);
      const actorName = actor?.name ?? "Someone";
      return {
        id: `n-community-listing-comment-like-${like.id}`,
        text: `${actorName} liked your comment.`,
        createdAt: like.createdAt,
        href: `/community?listing=${encodeURIComponent(like.listingId)}`
      };
    });

  if (user.role === "BUYER") {
    const appointmentNotes: NotificationItem[] = db()
      .appointments.filter((a) => a.userId === userId)
      .filter((a) => a.status !== "PENDING")
      .map((a) => {
        const property = propertyById.get(a.propertyId);
        const propertyLabel = property?.title ?? a.propertyId;
        const text =
          a.status === "RESCHEDULED" && a.suggestedSlots.length > 0
            ? `Seller suggested new slots for ${propertyLabel}. Open Appointments to choose one.`
            : a.status === "CONFIRMED"
              ? `Viewing for ${propertyLabel} is confirmed at ${new Date(a.datetime).toLocaleString()}.`
              : a.status === "CANCELLED"
                ? `Viewing for ${propertyLabel} was cancelled by seller.`
                : `Update on ${propertyLabel}.`;
        return {
          id: `n-buyer-ap-${a.id}-${a.updatedAt}`,
          text,
          createdAt: a.updatedAt,
          href: `/appointments?request=${encodeURIComponent(a.id)}`
        };
      });

    return [
      ...appointmentNotes,
      ...savedSearchNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  if (user.role === "SELLER") {
    const appointmentNotes: NotificationItem[] = [];
    db().appointments.forEach((a) => {
      const property = propertyById.get(a.propertyId);
      if (!property) return;
      const listing = listingById.get(property.listingId);
      if (!listing || listing.userId !== userId) return;
      if (a.status !== "PENDING") return;
      const buyer = userById.get(a.userId);
      const buyerLabel = buyer?.name ?? "Buyer";
      const propertyLabel = property.title;
      const text =
        a.updatedAt !== a.createdAt && a.suggestedSlots.length === 0
          ? `${buyerLabel} selected a proposed slot for ${propertyLabel}. Waiting your confirmation.`
          : `New viewing request from ${buyerLabel} for ${propertyLabel}.`;
      appointmentNotes.push({
        id: `n-seller-ap-${a.id}-${a.updatedAt}`,
        text,
        createdAt: a.updatedAt,
        href: `/appointments?request=${encodeURIComponent(a.id)}`
      });
    });

    const listingReviewNotes: NotificationItem[] = db()
      .listings.filter((l) => l.userId === userId && Boolean(l.reviewedAt) && (l.status === "APPROVED" || l.status === "REJECTED"))
      .map((listing) => {
        const property = db().properties.find((p) => p.listingId === listing.id);
        const label = property?.title ?? `Listing ${listing.id}`;
        const text =
          listing.status === "APPROVED"
            ? `Admin approved your listing: ${label}.`
            : `Admin rejected your listing: ${label}. Check notes and update it.`;
        return {
          id: `n-seller-listing-${listing.id}-${listing.reviewedAt ?? listing.updatedAt}`,
          text,
          createdAt: listing.reviewedAt ?? listing.updatedAt,
          href: `/seller/listings/${listing.id}/edit`
        };
      });

    return [
      ...appointmentNotes,
      ...listingReviewNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes,
      ...savedSearchNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  if (user.role === "ADMIN") {
    const adminListingSubmissionNotes: NotificationItem[] = db()
      .listings.filter((l) => l.status === "PENDING")
      .map((listing) => {
        const seller = userById.get(listing.userId);
        const property = db().properties.find((p) => p.listingId === listing.id);
        const label = property?.title ?? `Listing ${listing.id}`;
        const sellerName = seller?.name ?? "Seller";
        const isResubmitted = Date.parse(listing.updatedAt) > Date.parse(listing.createdAt);
        return {
          id: `n-admin-pending-${listing.id}-${listing.updatedAt}`,
          text: isResubmitted
            ? `${sellerName} resubmitted ${label} for review.`
            : `${sellerName} submitted new listing ${label} for review.`,
          createdAt: listing.updatedAt,
          href: `/admin/listings/${listing.id}`
        };
      });

    return [
      ...adminListingSubmissionNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes,
      ...savedSearchNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return [
    ...savedSearchNotes,
    ...communityPostLikeNotes,
    ...communityPostCommentNotes,
    ...communityPostParticipantCommentNotes,
    ...communityListingLikeNotes,
    ...communityListingCommentNotes,
    ...communityListingParticipantCommentNotes,
    ...communityPostReplyNotes,
    ...communityListingReplyNotes,
    ...communityPostCommentLikeNotes,
    ...communityListingCommentLikeNotes
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

import { randomUUID } from "crypto";
import { PasswordResetTokenType, Role } from "@prisma/client";
import type { User } from "../types.ts";
import {
  ensureAdminAccount,
  findUserById,
  getSellerDashboardScopeIds,
  mapListing,
  mapSavedSearch,
  mapUser,
  validateProfileInput
} from "../server/repository-helpers.ts";
import { prisma } from "../server/prisma.ts";

export async function getUserById(id?: string | null) {
  const user = await findUserById(id);
  return mapUser(user);
}

export async function findUserForLogin(input: { role: "BUYER" | "SELLER" | "ADMIN"; identifier?: string }) {
  await ensureAdminAccount();
  const identifier = input.identifier?.trim();
  const emailKey = identifier?.toLowerCase();
  const where = identifier
    ? {
        role: input.role as Role,
        OR: [{ email: emailKey }, { phone: identifier }]
      }
    : {
        role: input.role as Role
      };

  const user = await prisma.user.findFirst({
    where,
    orderBy: { createdAt: "asc" }
  });
  return mapUser(user);
}

export async function findUserByIdentifier(identifier?: string) {
  await ensureAdminAccount();
  const key = identifier?.trim();
  if (!key) return null;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: key.toLowerCase() }, { phone: key }]
    }
  });
  return mapUser(user);
}

export async function findUserByEmail(email?: string) {
  await ensureAdminAccount();
  const key = email?.trim().toLowerCase();
  if (!key) return null;
  const user = await prisma.user.findUnique({
    where: { email: key }
  });
  return mapUser(user);
}

export async function verifyUserPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });
  if (!user) return false;
  if (!user.password) return true;
  return user.password === password;
}

async function listUsersByRole(role: Role, extraWhere: object = {}) {
  const users = await prisma.user.findMany({
    where: {
      role,
      ...extraWhere
    },
    orderBy: { createdAt: "asc" }
  });
  return users.map((user) => mapUser(user)!);
}

async function listingStatsForUser(userId: string) {
  const listings = await prisma.listing.findMany({
    where: { userId },
    select: { status: true }
  });

  return {
    total: listings.length,
    approved: listings.filter((listing) => listing.status === "APPROVED").length,
    pending: listings.filter((listing) => listing.status === "PENDING").length,
    rejected: listings.filter((listing) => listing.status === "REJECTED").length
  };
}

export async function listSellers() {
  return listUsersByRole("SELLER", {
    isCompanyAccount: false,
    companyOwnerId: null
  });
}

export async function listSellerProfilesForAdmin() {
  const sellers = await listSellers();
  return Promise.all(
    sellers.map(async (seller) => ({
      seller,
      stats: await listingStatsForUser(seller.id)
    }))
  );
}

export async function listDevelopersForAdmin() {
  return listUsersByRole("SELLER", {
    isCompanyAccount: true,
    companyOwnerId: null
  });
}

export async function listDeveloperProfilesForAdmin() {
  const developers = await listDevelopersForAdmin();
  return Promise.all(
    developers.map(async (developer) => ({
      developer,
      stats: await listingStatsForUser(developer.id)
    }))
  );
}

export async function listBuyerProfilesForAdmin() {
  const buyers = await listUsersByRole("BUYER");
  return Promise.all(
    buyers.map(async (buyer) => {
      const [favorites, appointments, savedSearches] = await Promise.all([
        prisma.favorite.count({ where: { userId: buyer.id } }),
        prisma.appointment.count({ where: { userId: buyer.id } }),
        prisma.savedSearch.count({ where: { userId: buyer.id } })
      ]);
      return {
        buyer,
        stats: {
          favorites,
          appointments,
          savedSearches
        }
      };
    })
  );
}

export async function listCompanyUsers(ownerSellerId: string) {
  const users = await prisma.user.findMany({
    where: {
      companyOwnerId: ownerSellerId
    },
    orderBy: { createdAt: "asc" }
  });
  return users.map((user) => mapUser(user)!);
}

async function createUserRecord(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "BUYER" | "SELLER";
  isCompanyAccount?: boolean;
  companyOwnerId?: string | null;
}) {
  const validation = await validateProfileInput(input);
  if (!validation.ok || !validation.password) return null;

  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [{ email: validation.email }, ...(validation.phone ? [{ phone: validation.phone }] : [])]
    }
  });
  if (duplicate) return null;

  const user = await prisma.user.create({
    data: {
      name: validation.name,
      email: validation.email,
      phone: validation.phone,
      password: validation.password,
      role: input.role,
      isCompanyAccount: Boolean(input.isCompanyAccount),
      companyOwnerId: input.companyOwnerId ?? null,
      blocked: false
    }
  });

  return mapUser(user);
}

export async function addSellerProfile(input: { name: string; email: string; phone?: string; password: string }) {
  return createUserRecord({ ...input, role: "SELLER", isCompanyAccount: false });
}

export async function addDeveloperProfile(input: { name: string; email: string; phone?: string; password: string }) {
  return createUserRecord({ ...input, role: "SELLER", isCompanyAccount: true });
}

export async function addBuyerProfile(input: { name: string; email: string; phone?: string; password: string }) {
  return createUserRecord({ ...input, role: "BUYER", isCompanyAccount: false });
}

export async function createUserProfile(input: {
  name: string;
  email: string;
  phone: string;
  role: "BUYER" | "SELLER";
  password: string;
  isCompanyAccount?: boolean;
}) {
  return createUserRecord(input);
}

export async function updateUserProfile(
  userId: string,
  input: { name: string; email: string; phone?: string; avatarUrl?: string | null }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) return { ok: false as const, error: "User not found." };

  const validation = await validateProfileInput(input);
  if (!validation.ok) return validation;
  const avatarUrl = input.avatarUrl ? String(input.avatarUrl).trim() : null;

  if (avatarUrl) {
    if (!avatarUrl.startsWith("data:image/")) {
      return { ok: false as const, error: "Avatar must be an image." };
    }
    if (avatarUrl.length > 1_000_000) {
      return { ok: false as const, error: "Avatar is too large." };
    }
  }

  const emailTaken = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      email: validation.email
    }
  });
  if (emailTaken) return { ok: false as const, error: "Email is already used by another account." };

  const phoneTaken =
    validation.phone &&
    (await prisma.user.findFirst({
      where: {
        id: { not: userId },
        phone: validation.phone
      }
    }));

  if (phoneTaken) return { ok: false as const, error: "Phone number is already used by another account." };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: validation.name,
      email: validation.email,
      phone: validation.phone ?? null,
      avatarPath: avatarUrl
    }
  });

  return { ok: true as const, user: mapUser(updated)! };
}

async function setUserBlocked(userId: string, role: Role, blocked: boolean, extraWhere: object = {}) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      role,
      ...extraWhere
    }
  });
  if (!user) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { blocked }
  });
  return mapUser(updated);
}

export async function setSellerBlocked(sellerId: string, blocked: boolean) {
  return setUserBlocked(sellerId, "SELLER", blocked, { isCompanyAccount: false });
}

export async function setDeveloperBlocked(developerId: string, blocked: boolean) {
  return setUserBlocked(developerId, "SELLER", blocked, { isCompanyAccount: true });
}

export async function setBuyerBlocked(buyerId: string, blocked: boolean) {
  return setUserBlocked(buyerId, "BUYER", blocked);
}

async function removeUserProfile(userId: string, role: Role, extraWhere: object = {}) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      role,
      ...extraWhere
    }
  });
  if (!user) return null;

  await prisma.user.delete({
    where: { id: user.id }
  });
  return mapUser(user);
}

export async function removeSellerProfile(sellerId: string) {
  return removeUserProfile(sellerId, "SELLER", { isCompanyAccount: false });
}

export async function removeDeveloperProfile(developerId: string) {
  return removeUserProfile(developerId, "SELLER", { isCompanyAccount: true });
}

export async function removeBuyerProfile(buyerId: string) {
  return removeUserProfile(buyerId, "BUYER");
}

export async function addCompanyUser(
  ownerSellerId: string,
  input: { name: string; email: string; phone?: string; password: string }
) {
  const owner = await prisma.user.findFirst({
    where: { id: ownerSellerId, role: "SELLER" }
  });
  if (!owner) return null;

  return createUserRecord({
    ...input,
    role: "SELLER",
    isCompanyAccount: false,
    companyOwnerId: ownerSellerId
  });
}

export async function setCompanyUserBlocked(ownerSellerId: string, companyUserId: string, blocked: boolean) {
  const companyUser = await prisma.user.findFirst({
    where: {
      id: companyUserId,
      role: "SELLER",
      companyOwnerId: ownerSellerId
    }
  });
  if (!companyUser) return null;
  const updated = await prisma.user.update({
    where: { id: companyUser.id },
    data: { blocked }
  });
  return mapUser(updated);
}

export async function removeCompanyUser(ownerSellerId: string, companyUserId: string) {
  const companyUser = await prisma.user.findFirst({
    where: {
      id: companyUserId,
      role: "SELLER",
      companyOwnerId: ownerSellerId
    }
  });
  if (!companyUser) return null;
  await prisma.user.delete({ where: { id: companyUser.id } });
  return mapUser(companyUser);
}

function createOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function createVerifiedToken() {
  return randomUUID();
}

export async function requestPasswordResetOtp(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }
  });
  if (!user) return null;

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      email: user.email,
      type: PasswordResetTokenType.OTP,
      consumedAt: null
    },
    data: { consumedAt: new Date() }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      email: user.email,
      token: otp,
      type: PasswordResetTokenType.OTP,
      expiresAt
    }
  });

  return { otp, otpExpiresAt: expiresAt.getTime(), userName: user.name };
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const key = email.trim().toLowerCase();
  const token = await prisma.passwordResetToken.findFirst({
    where: {
      email: key,
      token: otp.trim(),
      type: PasswordResetTokenType.OTP,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!token) return null;

  const verifiedToken = createVerifiedToken();
  const verifiedExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: token.userId,
      email: token.email,
      token: verifiedToken,
      type: PasswordResetTokenType.VERIFIED_TOKEN,
      expiresAt: verifiedExpiresAt
    }
  });

  return { token: verifiedToken, expiresAt: verifiedExpiresAt.getTime() };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const key = email.trim().toLowerCase();
  const validation = await validateProfileInput({
    name: "placeholder",
    email: key,
    password: newPassword
  });
  if (!validation.ok || !validation.password) return false;

  const verifiedToken = await prisma.passwordResetToken.findFirst({
    where: {
      email: key,
      token: token.trim(),
      type: PasswordResetTokenType.VERIFIED_TOKEN,
      consumedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!verifiedToken) return false;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verifiedToken.userId },
      data: { password: validation.password }
    }),
    prisma.passwordResetToken.update({
      where: { id: verifiedToken.id },
      data: { consumedAt: new Date() }
    })
  ]);

  return true;
}

export async function listSavedSearches(userId: string) {
  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  return savedSearches.map(mapSavedSearch);
}

export async function createSavedSearch(userId: string, queryJson: string) {
  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId,
      queryJson: JSON.parse(queryJson)
    }
  });
  return mapSavedSearch(savedSearch);
}

export async function listSellerDashboardUsers(sellerId: string) {
  const scopeIds = await getSellerDashboardScopeIds(sellerId);
  const users = await prisma.user.findMany({
    where: { id: { in: scopeIds } }
  });
  return users.map((user) => mapUser(user)!);
}

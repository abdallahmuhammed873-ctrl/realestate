import type { Role, User } from "@/lib/types";

export type SessionUser = {
  role: Role;
};

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  role: Role;
  isCompanyAccount?: boolean;
  companyOwnerId?: string;
};

export type AdminDirectoryUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  blocked?: boolean;
};

export function toSessionUser(user: User | null): SessionUser | null {
  if (!user) return null;
  return { role: user.role };
}

export function toProfileUser(user: User | null): ProfileUser | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    isCompanyAccount: user.isCompanyAccount,
    companyOwnerId: user.companyOwnerId
  };
}

export function toAdminDirectoryUser(user: User | null): AdminDirectoryUser | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    blocked: user.blocked
  };
}

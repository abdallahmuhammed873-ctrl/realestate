import { cookies } from "next/headers";
import { getUserById } from "@/lib/repository";
import { Role } from "@/lib/types";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  return getUserById(userId);
}

export async function requireRole(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

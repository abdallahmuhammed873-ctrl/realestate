import {
  getCompareIdsMemory,
  getSeenNotificationIds,
  listNotificationsInternal,
  setCompareIdsMemory,
  setSeenNotificationIds
} from "../server/repository-helpers.ts";
import { prisma } from "../server/prisma.ts";

export async function listNotifications(userId: string) {
  return (await listNotificationsInternal(userId)).slice(0, 5);
}

export async function listAllNotifications(userId: string) {
  return listNotificationsInternal(userId);
}

export async function getUnreadNotificationsCount(userId: string) {
  const seen = new Set(getSeenNotificationIds(userId));
  const notifications = await listNotificationsInternal(userId);
  return notifications.filter((notification) => !seen.has(notification.id)).length;
}

export async function getUnreadAppointmentsCount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user || user.role === "ADMIN") return 0;
  if (user.role !== "SELLER") return 0;

  const scopeIds = new Set([userId, ...(await prisma.user.findMany({
    where: { companyOwnerId: userId, role: "SELLER" },
    select: { id: true }
  })).map((member) => member.id)]);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "PENDING"
    },
    include: {
      property: {
        include: {
          listing: true
        }
      }
    }
  });

  return appointments.filter((appointment) => scopeIds.has(appointment.property.listing.userId)).length;
}

export async function markNotificationsSeen(userId: string) {
  const ids = (await listNotificationsInternal(userId)).map((notification) => notification.id);
  setSeenNotificationIds(userId, ids);
}

export async function markNotificationSeen(userId: string, notificationId: string) {
  const seen = new Set(getSeenNotificationIds(userId));
  seen.add(notificationId);
  setSeenNotificationIds(userId, Array.from(seen));
}

export async function listAllNotificationsWithRead(userId: string) {
  const seen = new Set(getSeenNotificationIds(userId));
  return (await listNotificationsInternal(userId)).map((notification) => ({
    ...notification,
    read: seen.has(notification.id)
  }));
}

export async function getCompareIds(userId: string) {
  return getCompareIdsMemory(userId);
}

export async function setCompareIds(userId: string, ids: string[]) {
  return setCompareIdsMemory(userId, ids);
}

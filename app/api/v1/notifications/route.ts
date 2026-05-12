import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthenticatedUser, unauthorizedMobileResponse } from "@/lib/mobile-auth";
import { getRequestOrigin, toMobileNotification } from "@/lib/mobile-api";
import { listAllNotificationsWithRead } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();

  const origin = getRequestOrigin(req);
  const items = await listAllNotificationsWithRead(user.id);
  return NextResponse.json({
    items: items.map((item) => toMobileNotification(item, origin))
  });
}

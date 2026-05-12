import { Card } from "@/components/ui/card";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { getCurrentUser } from "@/lib/auth";
import { listAllNotificationsWithRead } from "@/lib/repository";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return <p className="rounded-2xl border bg-white p-6">Login required to view notifications.</p>;

  const items = await listAllNotificationsWithRead(user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">No notifications yet.</p>
        ) : (
          <NotificationsList items={items} />
        )}
      </Card>
    </div>
  );
}

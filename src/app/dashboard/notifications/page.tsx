import { NotificationsClient } from "@/components/dashboard/notifications-client";
import { getCustomerNotifications } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function CustomerNotificationsPage() {
  const notifications = await getCustomerNotifications();

  return <NotificationsClient initialItems={notifications} />;
}

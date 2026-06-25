import { AdminOrdersClient } from "@/components/dashboard/admin-orders-client";
import { getAdminOrders } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return <AdminOrdersClient orders={orders} />;
}

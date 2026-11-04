import { AdminOrdersClient } from "@/components/dashboard/admin-orders-client";
import { getAdminOrders } from "@/lib/server/catalog";
import { ADMIN_ORDER_PAGE_SIZE, parseAdminListQuery, type AdminSearchParams } from "@/lib/admin-list-query";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const query = parseAdminListQuery(await searchParams);
  const orders = await getAdminOrders(query);

  return <AdminOrdersClient orders={orders.slice(0, ADMIN_ORDER_PAGE_SIZE)} query={query} hasNext={orders.length > ADMIN_ORDER_PAGE_SIZE} />;
}

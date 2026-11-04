import { AdminCustomersClient } from "@/components/dashboard/admin-customers-client";
import { getAdminCustomers } from "@/lib/server/catalog";
import { ADMIN_CUSTOMER_PAGE_SIZE, parseAdminListQuery, type AdminSearchParams } from "@/lib/admin-list-query";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const query = { ...parseAdminListQuery(await searchParams), status: "all" as const };
  const customers = await getAdminCustomers(query);

  return <AdminCustomersClient customers={customers.slice(0, ADMIN_CUSTOMER_PAGE_SIZE)} query={query} hasNext={customers.length > ADMIN_CUSTOMER_PAGE_SIZE} />;
}

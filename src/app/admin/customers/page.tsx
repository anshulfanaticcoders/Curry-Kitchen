import { AdminCustomersClient } from "@/components/dashboard/admin-customers-client";
import { getAdminCustomers } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return <AdminCustomersClient customers={customers} />;
}

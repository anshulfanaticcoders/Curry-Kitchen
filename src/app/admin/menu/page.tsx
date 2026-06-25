import { AdminMenuClient } from "@/components/dashboard/admin-menu-client";
import { getAdminMenuManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const data = await getAdminMenuManagerData();

  return <AdminMenuClient {...data} />;
}

import { AdminPackagesClient } from "@/components/dashboard/admin-packages-client";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const data = await getAdminPackageManagerData();

  return <AdminPackagesClient {...data} />;
}

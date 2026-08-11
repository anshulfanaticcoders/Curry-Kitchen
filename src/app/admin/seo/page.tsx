import { AdminSeoClient } from "@/components/dashboard/admin-seo-client";
import { getAdminSeoManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const data = await getAdminSeoManagerData();
  return <AdminSeoClient data={data} />;
}

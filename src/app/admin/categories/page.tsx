import { AdminCategoriesClient } from "@/components/dashboard/admin-categories-client";
import { getAdminCategoryManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const data = await getAdminCategoryManagerData();

  return <AdminCategoriesClient {...data} />;
}

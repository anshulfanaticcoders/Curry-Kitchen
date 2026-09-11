import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CustomPackageItemForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function NewCustomPackageItemPage() {
  const { customPackageCategories } = await getAdminPackageManagerData();
  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add custom dish"
      description="Add a priced dish inside a custom package category."
    >
      <CustomPackageItemForm categories={customPackageCategories} />
    </AdminFormShell>
  );
}

import { AdminFormShell } from "@/components/dashboard/form-utils";
import { PackageForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function NewPackagePage() {
  const { categories } = await getAdminPackageManagerData();

  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add package"
      description="Create a new tiffin plan."
    >
      <PackageForm categories={categories} />
    </AdminFormShell>
  );
}

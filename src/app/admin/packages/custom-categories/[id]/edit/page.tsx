import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CustomPackageCategoryForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditCustomPackageCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customPackageCategories } = await getAdminPackageManagerData();
  const category = customPackageCategories.find((candidate) => candidate.id === id);
  if (!category) notFound();

  return (
    <AdminFormShell backHref="/admin/packages" backLabel="Back to packages" title={`Edit ${category.name}`}>
      <CustomPackageCategoryForm category={category} />
    </AdminFormShell>
  );
}

import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CustomPackageItemForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditCustomPackageItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customPackageItems } = await getAdminPackageManagerData();
  const item = customPackageItems.find((candidate) => candidate.id === id);

  if (!item) notFound();

  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title={`Edit ${item.name}`}
    >
      <CustomPackageItemForm item={item} />
    </AdminFormShell>
  );
}

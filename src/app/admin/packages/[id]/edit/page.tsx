import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { PackageForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { packages, categories, addons, complimentaryItems } = await getAdminPackageManagerData();
  const plan = packages.find((candidate) => candidate.id === id);

  if (!plan) notFound();

  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title={`Edit ${plan.name}`}
    >
      <PackageForm plan={plan} categories={categories} addons={addons} complimentaryItems={complimentaryItems} />
    </AdminFormShell>
  );
}

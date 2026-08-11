import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { AddonForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditAddonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { addons } = await getAdminPackageManagerData();
  const addon = addons.find((candidate) => candidate.id === id);

  if (!addon) notFound();

  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title={`Edit ${addon.name}`}
    >
      <AddonForm addon={addon} />
    </AdminFormShell>
  );
}

import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { ComplimentaryItemForm } from "@/components/dashboard/forms/package-form";
import { getAdminPackageManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditComplimentaryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { complimentaryItems } = await getAdminPackageManagerData();
  const item = complimentaryItems.find((candidate) => candidate.id === id);

  if (!item) notFound();

  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title={`Edit ${item.name}`}
    >
      <ComplimentaryItemForm item={item} />
    </AdminFormShell>
  );
}

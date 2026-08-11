import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { MenuUploadForm } from "@/components/dashboard/forms/menu-upload-form";
import { getAdminMenuManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditMenuUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { uploads } = await getAdminMenuManagerData();
  const upload = uploads.find((candidate) => candidate.id === id);

  if (!upload) notFound();

  return (
    <AdminFormShell
      backHref="/admin/menu"
      backLabel="Back to menus"
      title={`Edit ${upload.title}`}
    >
      <MenuUploadForm upload={upload} />
    </AdminFormShell>
  );
}

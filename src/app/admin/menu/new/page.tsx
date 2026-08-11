import { AdminFormShell } from "@/components/dashboard/form-utils";
import { MenuUploadForm } from "@/components/dashboard/forms/menu-upload-form";

export const dynamic = "force-dynamic";

export default function NewMenuUploadPage() {
  return (
    <AdminFormShell
      backHref="/admin/menu"
      backLabel="Back to menus"
      title="Upload menu"
      description="Upload a Canva menu image or PDF and pick the dates it should show on the website."
    >
      <MenuUploadForm />
    </AdminFormShell>
  );
}

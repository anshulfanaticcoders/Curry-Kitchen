import { AdminFormShell } from "@/components/dashboard/form-utils";
import { AddonForm } from "@/components/dashboard/forms/package-form";

export const dynamic = "force-dynamic";

export default function NewAddonPage() {
  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add add-on"
      description="Create an extra item that can be attached to packages."
    >
      <AddonForm />
    </AdminFormShell>
  );
}

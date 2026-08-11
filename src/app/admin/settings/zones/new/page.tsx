import { AdminFormShell } from "@/components/dashboard/form-utils";
import { ZoneForm } from "@/components/dashboard/forms/zone-form";

export const dynamic = "force-dynamic";

export default function NewZonePage() {
  return (
    <AdminFormShell
      backHref="/admin/settings"
      backLabel="Back to settings"
      title="Add delivery zone"
      description="Create a free, paid, or outside-zone fallback area."
    >
      <ZoneForm />
    </AdminFormShell>
  );
}

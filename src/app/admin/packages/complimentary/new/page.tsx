import { AdminFormShell } from "@/components/dashboard/form-utils";
import { ComplimentaryItemForm } from "@/components/dashboard/forms/package-form";

export const dynamic = "force-dynamic";

export default function NewComplimentaryItemPage() {
  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add complimentary item"
      description="Create a free item that can be assigned to plans."
    >
      <ComplimentaryItemForm />
    </AdminFormShell>
  );
}

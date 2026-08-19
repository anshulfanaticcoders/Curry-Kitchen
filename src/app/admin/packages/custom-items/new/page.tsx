import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CustomPackageItemForm } from "@/components/dashboard/forms/package-form";

export const dynamic = "force-dynamic";

export default function NewCustomPackageItemPage() {
  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add custom item"
      description="Price one ingredient customers can build a custom package from."
    >
      <CustomPackageItemForm />
    </AdminFormShell>
  );
}

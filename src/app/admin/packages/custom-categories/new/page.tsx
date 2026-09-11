import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CustomPackageCategoryForm } from "@/components/dashboard/forms/package-form";

export const dynamic = "force-dynamic";

export default function NewCustomPackageCategoryPage() {
  return (
    <AdminFormShell
      backHref="/admin/packages"
      backLabel="Back to packages"
      title="Add custom category"
      description="Create a group such as Dal, Rice, Breads, or Sabzi before adding dishes to it."
    >
      <CustomPackageCategoryForm />
    </AdminFormShell>
  );
}

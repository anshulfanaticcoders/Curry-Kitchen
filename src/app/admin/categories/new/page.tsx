import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CategoryForm } from "@/components/dashboard/forms/category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <AdminFormShell
      backHref="/admin/categories"
      backLabel="Back to categories"
      title="Add category"
      description="Create a new group for storefront filters and reporting."
    >
      <CategoryForm />
    </AdminFormShell>
  );
}

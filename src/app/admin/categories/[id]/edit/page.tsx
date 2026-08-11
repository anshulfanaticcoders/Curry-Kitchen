import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CategoryForm } from "@/components/dashboard/forms/category-form";
import { getAdminCategoryManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { categories } = await getAdminCategoryManagerData();
  const category = categories.find((candidate) => candidate.id === id);

  if (!category) notFound();

  return (
    <AdminFormShell
      backHref="/admin/categories"
      backLabel="Back to categories"
      title={`Edit ${category.name}`}
    >
      <CategoryForm category={category} />
    </AdminFormShell>
  );
}

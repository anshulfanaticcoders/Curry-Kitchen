import { AdminFormShell } from "@/components/dashboard/form-utils";
import { SeoForm } from "@/components/dashboard/forms/seo-form";
import { getAdminSeoManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function NewSeoPage() {
  const data = await getAdminSeoManagerData();

  return (
    <AdminFormShell
      backHref="/admin/seo"
      backLabel="Back to SEO"
      title="Add page"
      description="Register a custom site path and control its search appearance, indexing, and sitemap entry."
    >
      <SeoForm
        customPage
        origin={data.origin}
        titleSuffix={data.settings.titleSuffix}
        defaultSocialImage={data.settings.defaultSocialImage}
      />
    </AdminFormShell>
  );
}

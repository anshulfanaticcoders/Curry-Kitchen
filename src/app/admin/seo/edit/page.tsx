import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { SeoForm } from "@/components/dashboard/forms/seo-form";
import { getAdminSeoManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; package?: string }>;
}) {
  const [{ path, package: packageId }, data] = await Promise.all([
    searchParams,
    getAdminSeoManagerData(),
  ]);
  const record = data.records.find((candidate) =>
    packageId ? candidate.packageId === packageId : candidate.path === path,
  );

  if (!record) notFound();

  return (
    <AdminFormShell
      backHref="/admin/seo"
      backLabel="Back to SEO"
      title={`Edit SEO — ${record.page}`}
      description="Guided metadata, social sharing, and crawl controls for this page."
    >
      <SeoForm
        record={record}
        origin={data.origin}
        titleSuffix={data.settings.titleSuffix}
        defaultSocialImage={data.settings.defaultSocialImage}
      />
    </AdminFormShell>
  );
}

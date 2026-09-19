import { AdminEmailTemplatesClient } from "@/components/dashboard/admin-email-templates-client";
import { getAppUrl } from "@/lib/app-url";
import { getEmailTemplateOverrides } from "@/lib/email/template-overrides";
import { getEmailBrand } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const [overrides, brand] = await Promise.all([getEmailTemplateOverrides(), getEmailBrand()]);
  return <AdminEmailTemplatesClient overrides={overrides} brand={brand} appUrl={getAppUrl()} />;
}

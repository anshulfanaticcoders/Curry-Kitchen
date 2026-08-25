import { AdminEmailTemplatesClient } from "@/components/dashboard/admin-email-templates-client";
import { getAppUrl } from "@/lib/app-url";
import { getEmailTemplateOverrides } from "@/lib/email/template-overrides";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  return <AdminEmailTemplatesClient overrides={await getEmailTemplateOverrides()} appUrl={getAppUrl()} />;
}

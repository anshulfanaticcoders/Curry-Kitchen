import { AdminSettingsClient } from "@/components/dashboard/admin-settings-client";
import { getAdminSettings } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return <AdminSettingsClient settings={await getAdminSettings()} />;
}

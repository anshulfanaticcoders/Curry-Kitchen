import { AdminSettingsClient } from "@/components/dashboard/admin-settings-client";
import { getAdminSettings, getDeliveryZoneManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [zones, settings] = await Promise.all([getDeliveryZoneManagerData(), getAdminSettings()]);

  return <AdminSettingsClient zones={zones} settings={settings} />;
}

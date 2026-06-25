import { AdminSettingsClient } from "@/components/dashboard/admin-settings-client";
import { getDeliveryZoneManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const zones = await getDeliveryZoneManagerData();

  return <AdminSettingsClient zones={zones} />;
}

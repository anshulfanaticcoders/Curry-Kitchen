import { AdminAppearanceClient } from "@/components/dashboard/admin-appearance-client";
import { getAdminPageBackgrounds } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const backgrounds = await getAdminPageBackgrounds();

  return <AdminAppearanceClient backgrounds={backgrounds} />;
}

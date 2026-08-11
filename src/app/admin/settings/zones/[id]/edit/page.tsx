import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { ZoneForm } from "@/components/dashboard/forms/zone-form";
import { getDeliveryZoneManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const zones = await getDeliveryZoneManagerData();
  const zone = zones.find((candidate) => candidate.id === id);

  if (!zone) notFound();

  return (
    <AdminFormShell
      backHref="/admin/settings"
      backLabel="Back to settings"
      title={`Edit ${zone.name}`}
    >
      <ZoneForm zone={zone} />
    </AdminFormShell>
  );
}

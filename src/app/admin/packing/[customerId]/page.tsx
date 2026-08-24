import { notFound } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { Card } from "@/components/dashboard/primitives";
import { getAdminPackagingRecord } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

// Opened by scanning the packing QR label: only what the kitchen needs to pack the tiffin.
export default async function PackingRecordPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const record = await getAdminPackagingRecord(customerId);

  if (!record) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-masala">Packing slip</p>
      <h1 className="mt-2 font-display text-3xl font-black leading-tight tracking-tight md:text-4xl">{record.name}</h1>
      <p className="mt-3 flex gap-2 text-base font-bold leading-6 text-ink/75">
        <MapPin size={18} className="mt-1 shrink-0 text-masala" />
        <span>{record.address}</span>
      </p>

      <div className="mt-6 grid gap-4">
        {record.packages.length ? (
          record.packages.map((customerPackage) => (
            <Card key={customerPackage.id} className="p-5">
              <h2 className="font-display text-2xl font-black">{customerPackage.name}</h2>
              <ul className="mt-4 grid gap-2 text-base font-bold text-ink/80">
                {customerPackage.includes.length ? (
                  customerPackage.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check size={18} className="mt-0.5 shrink-0 text-leaf" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-ink/45">No package items recorded.</li>
                )}
              </ul>
            </Card>
          ))
        ) : (
          <Card className="p-5 text-sm font-bold text-ink/55">No packages assigned to this customer.</Card>
        )}
      </div>
    </div>
  );
}

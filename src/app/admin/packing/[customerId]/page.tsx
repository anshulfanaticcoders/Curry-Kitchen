import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Mail, MapPin, PackageCheck, Phone } from "lucide-react";
import { PackingLabel } from "@/components/dashboard/packing-label";
import { Card, CardHeader, PageHeader } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminPackagingRecord } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "Active" || status === "Delivered") return "green" as const;
  if (status === "Paused" || status === "Cancelled") return "red" as const;
  return "amber" as const;
}

export default async function PackingRecordPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const record = await getAdminPackagingRecord(customerId);

  if (!record) notFound();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const lookupUrl = `${appUrl}/admin/packing/${record.id}`;

  return (
    <div>
      <PageHeader
        title="Packing record"
        description="Verify this customer’s package and delivery information before the order leaves the kitchen."
        action={
          <ButtonLink href="/admin/customers" variant="secondary">
            <ArrowLeft size={18} />
            Customers
          </ButtonLink>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader title={record.name} description="Customer and delivery contact" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <a href={`mailto:${record.email}`} className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-4 text-sm font-bold transition hover:border-saffron">
                <Mail size={18} className="text-masala" />
                <span className="min-w-0 truncate">{record.email}</span>
              </a>
              <a href={`tel:${record.phone}`} className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-4 text-sm font-bold transition hover:border-saffron">
                <Phone size={18} className="text-masala" />
                {record.phone}
              </a>
              <div className="flex gap-3 rounded-lg border border-ink/10 bg-ivory p-4 text-sm font-bold sm:col-span-2">
                <MapPin size={18} className="mt-0.5 shrink-0 text-masala" />
                <span>{record.address}</span>
              </div>
            </div>
          </Card>

          {record.packages.length ? record.packages.map((customerPackage) => (
            <Card key={customerPackage.id}>
              <CardHeader
                title={customerPackage.name}
                description={`${customerPackage.startDate} · ${customerPackage.deliveryProgress}`}
                action={<StatusPill tone={statusTone(customerPackage.status)}>{customerPackage.status}</StatusPill>}
              />
              <div className="grid gap-5 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-ink/10 bg-ivory p-4">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                      <CalendarDays size={15} /> Next delivery
                    </p>
                    <p className="mt-2 font-display text-xl font-black">{customerPackage.nextDelivery}</p>
                    <p className="mt-1 text-sm font-bold text-ink/55">{customerPackage.deliveryWindow}</p>
                  </div>
                  <div className="rounded-lg border border-ink/10 bg-ivory p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Food preferences</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-ink/75">{customerPackage.foodPreferences}</p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink/45">
                      <PackageCheck size={15} /> Package includes
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm font-bold text-ink/75">
                      {customerPackage.includes.length ? customerPackage.includes.map((item) => (
                        <li key={item} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-leaf" />{item}</li>
                      )) : <li className="text-ink/45">No package items recorded.</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Required add-ons</p>
                    <ul className="mt-3 grid gap-2 text-sm font-bold text-ink/75">
                      {customerPackage.addons.length ? customerPackage.addons.map((addon) => (
                        <li key={addon} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-saffron" />{addon}</li>
                      )) : <li className="text-ink/45">No add-ons selected.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          )) : (
            <Card>
              <div className="p-6 text-sm font-bold text-ink/55">No packages have been assigned to this customer yet.</div>
            </Card>
          )}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <PackingLabel customerId={record.id} customerName={record.name} lookupUrl={lookupUrl} />
          <p className="mt-4 text-center text-xs font-bold leading-5 text-ink/45">
            The QR label contains only a protected lookup URL. Customer details remain behind the admin sign-in.
          </p>
        </aside>
      </div>

      <p className="mt-6 text-center text-sm font-bold text-ink/45">
        Need another customer? <Link href="/admin/customers" className="text-masala hover:underline">Return to customers</Link>.
      </p>
    </div>
  );
}

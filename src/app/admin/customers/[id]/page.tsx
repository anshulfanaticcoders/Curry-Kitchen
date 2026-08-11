import { Mail, Phone, QrCode } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPackageControl } from "@/components/dashboard/admin-package-control";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { Card } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminCustomers } from "@/lib/server/catalog";
import { getCustomerCalendarData } from "@/lib/server/calendar";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customers, calendar] = await Promise.all([
    getAdminCustomers(),
    getCustomerCalendarData(id),
  ]);
  const customer = customers.find((candidate) => candidate.id === id);

  if (!customer) notFound();

  return (
    <div>
      <Link href="/admin/customers" className="text-sm font-bold text-ink/55 transition hover:text-ink">
        ← Back to customers
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight">{customer.name}</h1>
          <p className="mt-2 text-sm leading-6 text-ink/58">Customer since {customer.joined}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={statusTone(customer.status)}>{customer.status}</StatusPill>
          <AdminPackageControl customer={customer} />
          <ButtonLink href={`/admin/packing/${customer.id}`} variant="dark">
            <QrCode size={18} />
            Packing label
          </ButtonLink>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Card className="grid content-start gap-3 p-6">
          <a href={`mailto:${customer.email}`} className="flex items-center gap-3 rounded-xl bg-frost p-3 text-sm font-bold transition hover:bg-rose">
            <Mail size={17} className="text-masala" />
            {customer.email}
          </a>
          <span className="flex items-center gap-3 rounded-xl bg-frost p-3 text-sm font-bold">
            <Phone size={17} className="text-masala" />
            {customer.phone || "No phone on file"}
          </span>
          <div className="rounded-xl bg-frost p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Current plan</p>
            <p className="mt-1 font-bold">{customer.plan}</p>
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-4">
          {[
            ["Orders", String(customer.orders)],
            ["Spend", formatCurrency(customer.spend)],
            ["Area", customer.area || "—"],
          ].map(([label, value]) => (
            <Card key={label} className="grid place-content-center p-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
              <p className="mt-2 font-display text-2xl font-black tracking-tight">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      {calendar ? (
        <DashboardCalendar data={calendar} />
      ) : (
        <Card className="p-8 text-center text-sm font-bold text-ink/55">
          No calendar yet — this customer has no packages.
        </Card>
      )}
    </div>
  );
}

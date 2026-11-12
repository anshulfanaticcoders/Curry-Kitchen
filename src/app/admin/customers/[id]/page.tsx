import { ArrowLeft, ChevronDown, Mail, MapPin, Phone, QrCode } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCustomerCalendar } from "@/components/dashboard/admin-customer-calendar";
import { AdminOrderReceipt } from "@/components/dashboard/admin-order-receipt";
import { PackingLabel } from "@/components/dashboard/packing-label";
import { StatusPill } from "@/components/ui/status-pill";
import { getAppUrl } from "@/lib/app-url";
import { getAdminCustomerDetail } from "@/lib/server/catalog";
import { getCustomerCalendarData } from "@/lib/server/calendar";
import { getAdminCalendarData } from "@/lib/server/calendar-management";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getAdminCustomerDetail(id);
  if (!customer) notFound();
  const [calendar, adminCalendar] = await Promise.all([getCustomerCalendarData(id), getAdminCalendarData(id)]);

  return <div className="min-w-0">
    <Link href="/admin/customers" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/75 hover:text-ink">
      <ArrowLeft size={16} />Back to customers
    </Link>
    <header className="mb-6 border-b border-ink/15 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="break-words font-display text-3xl font-extrabold">{customer.name}</h1>
        <StatusPill tone={customer.status === "Active" ? "green" : customer.status === "Paused" ? "red" : "amber"}>{customer.status}</StatusPill>
      </div>
      <p className="mt-1 text-sm text-ink/70">Customer since {customer.joined}</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        <a href={`mailto:${customer.email}`} className="inline-flex min-w-0 items-center gap-2 hover:text-masala"><Mail size={16} className="shrink-0" /><span className="break-all">{customer.email}</span></a>
        {customer.phone ? <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-2 hover:text-masala"><Phone size={16} />{customer.phone}</a> : <span>No phone on file</span>}
        <span>{customer.orders} orders / Payments received: {formatCurrency(customer.spend)}</span>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-ink/75"><MapPin size={16} className="mt-1 shrink-0" />{customer.address ? `${customer.address.isDefault ? "Default address" : "Address on file"}: ${customer.address.lines.join(", ")}` : "No delivery address on file"}</p>
      <details className="mt-3">
        <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><QrCode size={17} />Packing label<ChevronDown size={15} /></summary>
        <div className="mt-2 max-w-2xl"><PackingLabel customerId={customer.id} customerName={customer.name} lookupUrl={`${getAppUrl()}/admin/packing/${customer.id}`} /></div>
      </details>
    </header>
    {calendar ? <AdminCustomerCalendar calendar={calendar} data={adminCalendar} /> : <p className="py-8 text-sm text-ink/75">No packages have been purchased yet.</p>}
    <details className="mt-6 border-t border-ink/15 pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">Order history & notifications<ChevronDown size={15} className="ml-auto" /></summary>
      <div className="divide-y divide-ink/10">
        {customer.receiptOrders.map((order) => <div key={order.number} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <p><strong>{order.number}</strong><span className="ml-3 text-ink/75">{order.date} / {order.status} / {formatCurrency(order.total)}</span></p>
          <AdminOrderReceipt orderNumber={order.number} />
        </div>)}
      </div>
      <p className="mt-3 text-sm text-ink/75">Email receipts: {customer.emailReceipts ? "On" : "Off"} / Text updates: {customer.smsUpdates ? "On" : "Off"}</p>
    </details>
  </div>;
}

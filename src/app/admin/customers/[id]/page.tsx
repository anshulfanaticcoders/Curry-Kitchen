import {
  Bell,
  ChefHat,
  ClipboardList,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Truck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPackageControl } from "@/components/dashboard/admin-package-control";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { PackingLabel } from "@/components/dashboard/packing-label";
import { Card } from "@/components/dashboard/primitives";
import { StatusPill } from "@/components/ui/status-pill";
import { getAppUrl } from "@/lib/app-url";
import { getAdminCustomerDetail } from "@/lib/server/catalog";
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
  const [customer, calendar] = await Promise.all([
    getAdminCustomerDetail(id),
    getCustomerCalendarData(id),
  ]);

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
        </div>
      </div>

      <div className="mb-6">
        <PackingLabel
          customerId={customer.id}
          customerName={customer.name}
          lookupUrl={`${getAppUrl()}/admin/packing/${customer.id}`}
        />
      </div>

      <section className="mb-6" aria-labelledby="customer-overview-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-masala">Customer overview</p>
            <h2 id="customer-overview-heading" className="mt-1 font-display text-2xl font-black tracking-tight">
              Delivery essentials at a glance
            </h2>
          </div>
          <p className="hidden text-sm font-bold text-ink/45 lg:block">Use this before preparing or dispatching an order.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose text-masala">
                <MapPin size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Delivery address</p>
                {customer.address ? (
                  <>
                    <p className="mt-2 font-bold">{customer.address.name}</p>
                    <address className="mt-1 not-italic text-sm font-medium leading-6 text-ink/65">
                      {customer.address.lines.map((line) => (
                        <span key={line} className="block">{line}</span>
                      ))}
                    </address>
                    {customer.address.isDefault ? (
                      <p className="mt-3 text-xs font-bold text-leaf">Default delivery address</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm font-bold text-masala">No delivery address on file.</p>
                )}
              </div>
            </div>
            <div className="mt-5 grid gap-2 border-t border-ink/8 pt-4 sm:grid-cols-2">
              <a href={`mailto:${customer.email}`} className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink transition hover:text-masala">
                <Mail size={16} className="shrink-0 text-masala" />
                <span className="truncate">{customer.email}</span>
              </a>
              <a href={customer.phone ? `tel:${customer.phone}` : undefined} className="flex items-center gap-2 text-sm font-bold text-ink transition hover:text-masala">
                <Phone size={16} className="shrink-0 text-masala" />
                {customer.phone || "No phone on file"}
              </a>
            </div>
          </Card>

          <Card className="xl:col-span-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
                <Truck size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Current delivery</p>
                {customer.currentPackage ? (
                  <>
                    <p className="mt-2 font-display text-xl font-black leading-tight">{customer.currentPackage.name}</p>
                    <p className="mt-1 text-sm font-bold text-ink/55">{customer.currentPackage.status}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-bold text-ink/50">No package is currently assigned.</p>
                )}
              </div>
            </div>
            {customer.currentPackage ? (
              <dl className="mt-5 grid gap-3 border-t border-ink/8 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/40">Next delivery</dt>
                  <dd className="mt-1 font-bold leading-5">{customer.currentPackage.nextDelivery}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/40">Remaining</dt>
                  <dd className="mt-1 font-bold leading-5">{customer.currentPackage.remainingDeliveries} deliveries</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/40">Package progress</dt>
                  <dd className="mt-1 font-bold leading-5">{customer.currentPackage.deliveryProgress}</dd>
                </div>
              </dl>
            ) : null}
          </Card>

          <Card className="xl:col-span-3 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-saffron/15 text-masala">
                {customer.kitchenNotes.allergies ? <ShieldAlert size={19} /> : <ChefHat size={19} />}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Kitchen notes</p>
                <p className="mt-2 font-bold">{customer.kitchenNotes.allergies ? "Allergy alert" : "No allergy alert"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t border-ink/8 pt-4 text-sm">
              {customer.kitchenNotes.allergies ? (
                <div className="rounded-lg border border-masala/25 bg-rose px-3 py-2.5 text-masala">
                  <p className="text-xs font-black uppercase tracking-[0.12em]">Allergies</p>
                  <p className="mt-1 font-bold leading-5">{customer.kitchenNotes.allergies}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/40">Food preferences</p>
                <p className="mt-1 font-bold leading-5 text-ink/75">{customer.kitchenNotes.foodPreferences || "No special food preferences"}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Customer activity</p>
              <ClipboardList size={18} className="text-saffron" />
            </div>
            <p className="mt-3 font-display text-3xl font-black tracking-tight">{customer.orders}</p>
            <p className="mt-1 text-sm font-bold text-ink/55">orders since {customer.joined}</p>
            <p className="mt-4 border-t border-ink/8 pt-3 text-sm font-bold">Lifetime spend: {formatCurrency(customer.spend)}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Latest order</p>
              <ClipboardList size={18} className="text-saffron" />
            </div>
            {customer.latestOrder ? (
              <>
                <p className="mt-3 font-display text-xl font-black tracking-tight">{customer.latestOrder.number}</p>
                <p className="mt-1 text-sm font-bold text-ink/55">{customer.latestOrder.date}</p>
                <p className="mt-4 border-t border-ink/8 pt-3 text-sm font-bold">{customer.latestOrder.status} · {formatCurrency(customer.latestOrder.total)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm font-bold text-ink/50">No orders on record.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Latest payment</p>
              <CreditCard size={18} className="text-saffron" />
            </div>
            {customer.latestPayment ? (
              <>
                <p className="mt-3 font-display text-xl font-black tracking-tight">{formatCurrency(customer.latestPayment.amount)}</p>
                <p className="mt-1 text-sm font-bold text-ink/55">{customer.latestPayment.method} · {customer.latestPayment.date}</p>
                <p className="mt-4 border-t border-ink/8 pt-3 text-sm font-bold">{customer.latestPayment.status}</p>
              </>
            ) : (
              <p className="mt-3 text-sm font-bold text-ink/50">No payment history yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Updates & verification</p>
              <Bell size={18} className="text-saffron" />
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-ink/55">Email receipts</dt><dd className="font-bold">{customer.emailReceipts ? "On" : "Off"}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-ink/55">Text updates</dt><dd className="font-bold">{customer.smsUpdates ? "On" : "Off"}</dd></div>
              <div className="mt-1 flex items-center gap-2 border-t border-ink/8 pt-3"><UserCheck size={16} className="text-leaf" /><dd className="font-bold">{customer.verification ? `${customer.verification.type}: ${customer.verification.status}` : "No verification required"}</dd></div>
            </dl>
          </Card>
        </div>
      </section>

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

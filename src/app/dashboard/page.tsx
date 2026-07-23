import Link from "next/link";
import { CalendarDays, Clock, PackageCheck, Settings2, Truck, Utensils } from "lucide-react";
import { CustomerPauseButton } from "@/components/dashboard/customer-pause-button";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getCurrentSession } from "@/lib/auth";
import {
  getCustomerOrders,
  getCustomerPackageSummaries,
  getUpcomingDeliveries,
} from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Delivered" || status === "Active") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function CustomerOverviewPage() {
  const [session, packageSummaries, recentOrders, upcomingDeliveries] = await Promise.all([
    getCurrentSession(),
    getCustomerPackageSummaries(),
    getCustomerOrders(),
    getUpcomingDeliveries(),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const currentPackage = packageSummaries[0];
  const livePackages = packageSummaries.filter((item) =>
    ["Active", "Paused", "Pending payment", "Needs student approval"].includes(item.status),
  );
  const remainingDeliveryDays = livePackages.reduce(
    (total, item) => total + item.remainingDeliveryDays,
    0,
  );
  const totalDeliveryDays = livePackages.reduce(
    (total, item) => total + item.totalDeliveryDays,
    0,
  );
  const deliveriesThisWeek = upcomingDeliveries.filter((delivery) => {
    const day = delivery.day.toLowerCase();
    return ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day);
  }).length;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your plan, deliveries, and account in one place."
        action={
          <ButtonLink href="/menu" variant="secondary">
            <CalendarDays size={18} />
            This week&rsquo;s menu
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current packages"
          value={livePackages.length ? String(livePackages.length) : "None"}
          delta={currentPackage?.plan ?? "Choose a package"}
          icon={<Utensils size={20} />}
        />
        <StatCard
          label="Delivery days left"
          value={`${remainingDeliveryDays}/${totalDeliveryDays}`}
          delta={currentPackage ? `Next package ends ${currentPackage.endDate}` : "Not scheduled"}
          tone="good"
          icon={<CalendarDays size={20} />}
        />
        <StatCard label="Next delivery" value={upcomingDeliveries[0]?.eta ?? "Not scheduled"} delta={upcomingDeliveries[0]?.day ?? "Buy a plan"} icon={<Truck size={20} />} />
        <StatCard label="Orders" value={String(recentOrders.length)} delta={`${deliveriesThisWeek} deliveries this week`} icon={<Clock size={20} />} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Your packages"
          description="Each plan keeps its own start date, delivery count, and pause status."
          action={
            <ButtonLink href="/packages" variant="secondary">
              <PackageCheck size={18} />
              Add package
            </ButtonLink>
          }
        />
        {packageSummaries.length ? (
          <div className="divide-y divide-ink/10">
            {packageSummaries.map((item) => {
              const progress = item.totalDeliveryDays
                ? Math.min(100, (item.usedDeliveryDays / item.totalDeliveryDays) * 100)
                : 0;

              return (
                <div key={item.id ?? item.plan} className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl font-black">{item.plan}</h3>
                      <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm font-bold text-ink/55">
                      Starts {item.startDate} · One tiffin each delivery day
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-ink/55">
                      <span>{item.usedDeliveryDays} used</span>
                      <span>{item.remainingDeliveryDays} left</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
                      <div className="h-full rounded-full bg-saffron" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-ink/45">Scheduled through {item.endDate}</p>
                  </div>
                  <div className="w-full lg:w-56">
                    <CustomerPauseButton
                      packageId={item.id}
                      canSelfPause={item.canSelfPause}
                      customerPauseUsed={item.customerPauseUsed}
                      status={item.status}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-sm font-bold text-ink/55">
            No packages yet. Configure your first tiffin plan to begin delivery tracking.
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader
            title="Upcoming deliveries"
            description="Your next few tiffins."
            action={
              <Link href="/dashboard/orders" className="text-sm font-extrabold text-masala hover:underline">
                All orders
              </Link>
            }
          />
          <div className="grid gap-3 p-4">
            {upcomingDeliveries.length ? (
              upcomingDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center gap-4 rounded-lg border border-ink/8 bg-ivory p-4">
                  <span className="grid size-11 place-items-center rounded-button bg-saffron/15 text-masala">
                    <Truck size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold">{delivery.day}</p>
                    <p className="truncate text-sm text-ink/60">{delivery.meal}</p>
                  </div>
                  <span className="ml-auto text-sm font-black text-masala">{delivery.eta}</span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-ink/15 bg-ivory p-6 text-sm font-bold text-ink/55">
                No upcoming deliveries are scheduled. Buy a plan or contact admin if this looks wrong.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="grid gap-3 p-4">
            <ButtonLink href="/packages" variant="secondary">
              <Settings2 size={18} />
              Change plan
            </ButtonLink>
            <ButtonLink href="/menu" variant="secondary">
              <CalendarDays size={18} />
              View menu
            </ButtonLink>
            <ButtonLink href="/dashboard/profile" variant="secondary">
              <Settings2 size={18} />
              Delivery profile
            </ButtonLink>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent orders" />
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Plan</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-ivory/60">
                  <Td className="font-extrabold">{order.id}</Td>
                  <Td className="text-ink/70">{order.plan}</Td>
                  <Td className="text-ink/55">{order.date}</Td>
                  <Td>
                    <StatusPill tone={statusTone(order.status)}>{order.status}</StatusPill>
                  </Td>
                  <Td className="font-black">{formatCurrency(order.total)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-sm font-bold text-ink/45">
                  No orders yet. Your first order will appear here after checkout.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, DollarSign, Package, Truck, Users } from "lucide-react";
import { AdminCharts } from "@/components/dashboard/admin-charts";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getCurrentSession } from "@/lib/auth";
import { getAdminCustomers, getAdminOrders } from "@/lib/server/catalog";
import type { PlanPerformance, RevenuePoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statIcons = [DollarSign, Package, Truck, Users];

function orderStatusTone(status: string) {
  if (status === "Delivered") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

function paymentTone(payment: string) {
  if (payment === "Paid") return "green" as const;
  if (payment === "Refunded") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [session, adminOrders, customers] = await Promise.all([
    getCurrentSession(),
    getAdminOrders(),
    getAdminCustomers(),
  ]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "Admin";
  const revenue = adminOrders.reduce((total, order) => total + order.total, 0);
  const active = customers.filter((customer) => customer.status === "Active").length;
  const deliveries = adminOrders.filter((order) => order.status !== "Delivered").length;
  const stats = [
    { label: "Monthly revenue", value: formatCurrency(revenue), delta: "seeded orders", tone: "good" as const },
    { label: "Active plans", value: String(active), delta: `${customers.length} customers`, tone: "neutral" as const },
    { label: "Open deliveries", value: String(deliveries), delta: "need status updates", tone: "watch" as const },
    { label: "Repeat customers", value: "71%", delta: "seed baseline", tone: "good" as const },
  ];
  const revenueData = Array.from(
    adminOrders.reduce((map, order) => {
      const current = map.get(order.date) ?? { label: order.date, orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += order.total;
      map.set(order.date, current);
      return map;
    }, new Map<string, RevenuePoint>()),
  )
    .map(([, value]) => value)
    .slice(0, 7)
    .reverse();
  const planPerformance = Array.from(
    customers.reduce((map, customer) => {
      const key = customer.plan === "No active plan" ? "No plan" : customer.plan;
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map<PlanPerformance>(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader
        title={`Good evening, ${firstName}`}
        description="Orders, delivery pressure, and revenue at a glance for Curry Kitchen."
        action={
          <ButtonLink href="/admin/orders">
            Review order queue
            <ArrowUpRight size={18} />
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = statIcons[index];
          return (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              delta={stat.delta}
              tone={stat.tone}
              icon={<Icon size={20} />}
            />
          );
        })}
      </div>

      <div className="mt-6">
        <AdminCharts revenueData={revenueData} planPerformance={planPerformance} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader
            title="Recent orders"
            description="Latest tiffin orders across all plans."
            action={
              <Link href="/admin/orders" className="text-sm font-extrabold text-masala hover:underline">
                View all
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Total</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {adminOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-ivory/60">
                  <Td className="font-extrabold">{order.id}</Td>
                  <Td className="text-ink/70">{order.customer}</Td>
                  <Td className="font-black">{formatCurrency(order.total)}</Td>
                  <Td>
                    <StatusPill tone={paymentTone(order.payment)}>{order.payment}</StatusPill>
                  </Td>
                  <Td>
                    <StatusPill tone={orderStatusTone(order.status)}>{order.status}</StatusPill>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Newest customers" />
          <div className="grid gap-3 p-4">
            {customers.slice(0, 4).map((customer) => (
              <div key={customer.id} className="flex items-center gap-3 rounded-lg border border-ink/8 bg-ivory p-3">
                <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
                  {customer.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{customer.name}</p>
                  <p className="truncate text-xs font-bold text-ink/50">{customer.plan}</p>
                </div>
                <span className="ml-auto text-sm font-black">{formatCurrency(customer.spend)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

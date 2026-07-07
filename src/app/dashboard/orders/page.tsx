import { RotateCcw } from "lucide-react";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerOrders } from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Delivered") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const recentOrders = await getCustomerOrders();
  const delivered = recentOrders.filter((order) => order.status === "Delivered").length;
  const spent = recentOrders.reduce((total, order) => total + order.total, 0);

  return (
    <div>
      <PageHeader
        title="Your orders"
        description="Every tiffin order, receipt, and delivery in one place."
        action={
          <ButtonLink href="/packages">
            <RotateCcw size={18} />
            Reorder a plan
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total orders" value={String(recentOrders.length)} />
        <StatCard label="Delivered" value={String(delivered)} tone="good" />
        <StatCard label="Total spent" value={formatCurrency(spent)} />
      </div>

      <Card>
        <CardHeader title="Order history" />
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Plan</Th>
              <Th>Date</Th>
              <Th>Window</Th>
              <Th>Status</Th>
              <Th>Total</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-ivory/60">
                  <Td className="font-extrabold">{order.id}</Td>
                  <Td className="text-ink/70">{order.plan}</Td>
                  <Td className="text-ink/55">{order.date}</Td>
                  <Td className="text-ink/55">{order.deliveryWindow}</Td>
                  <Td>
                    <StatusPill tone={statusTone(order.status)}>{order.status}</StatusPill>
                  </Td>
                  <Td className="font-black">{formatCurrency(order.total)}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <ButtonLink href="/dashboard/payments" variant="secondary" className="h-9 px-4">
                        Receipt
                      </ButtonLink>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-sm font-bold text-ink/45">
                  No orders yet. Start with a package and your history will appear here.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

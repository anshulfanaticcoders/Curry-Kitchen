import { RotateCcw, Wallet } from "lucide-react";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getAdminSettings } from "@/lib/server/admin";
import { getCustomerOrders } from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Accepted") return "green" as const;
  if (status === "Cancelled") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const [recentOrders, settings] = await Promise.all([getCustomerOrders(), getAdminSettings()]);
  const accepted = recentOrders.filter((order) => order.status === "Accepted").length;
  const spent = recentOrders.reduce((total, order) => total + order.total, 0);
  const zelleDue = recentOrders.filter((order) => order.awaitingZelle);

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

      {zelleDue.length ? (
        <div className="mb-6 rounded-2xl border border-saffron/40 bg-rose p-5">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 shrink-0 text-masala" size={22} />
            <div className="min-w-0">
              <p className="font-extrabold text-ink">Complete your Zelle payment to start deliveries</p>
              <p className="mt-1 text-sm text-ink/70">
                Send{" "}
                {zelleDue.map((order, index) => (
                  <span key={order.id}>
                    {index > 0 ? " and " : ""}
                    <strong className="text-ink">{formatCurrency(order.total)}</strong> for order{" "}
                    <strong className="text-ink">{order.id}</strong>
                  </span>
                ))}{" "}
                via Zelle to <strong className="text-masala">{settings.supportEmail}</strong>. Put the order number in
                the memo. We confirm transfers during business hours and email you as soon as your plan is active — the
                sooner you send it, the sooner your first tiffin arrives.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total orders" value={String(recentOrders.length)} />
        <StatCard label="Accepted" value={String(accepted)} tone="good" />
        <div className="col-span-2 sm:col-span-1">
          <StatCard label="Total spent" value={formatCurrency(spent)} />
        </div>
      </div>

      <Card>
        <CardHeader title="Order history" />
        <div className="divide-y divide-ink/8 md:hidden">
          {recentOrders.length ? (
            recentOrders.map((order) => (
              <div key={order.id} className="grid gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold">{order.id}</p>
                  <StatusPill tone={statusTone(order.status)}>{order.status}</StatusPill>
                </div>
                <p className="text-sm text-ink/70">{order.plan}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/55">{order.date}</span>
                  <span className="font-black">{formatCurrency(order.total)}</span>
                </div>
                <ButtonLink href="/dashboard/payments" variant="secondary" className="mt-1 h-10 w-full">
                  Receipt
                </ButtonLink>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm font-bold text-ink/45">
              No orders yet. Start with a package and your history will appear here.
            </p>
          )}
        </div>
        <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Plan</Th>
              <Th>Date</Th>
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
                <Td colSpan={6} className="py-8 text-center text-sm font-bold text-ink/45">
                  No orders yet. Start with a package and your history will appear here.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
        </div>
      </Card>
    </div>
  );
}

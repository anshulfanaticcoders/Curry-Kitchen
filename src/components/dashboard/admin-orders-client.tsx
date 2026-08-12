"use client";

import { Filter, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { Card, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { cancelOrderAction } from "@/lib/actions/admin";
import type { AdminOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Accepted") return "green" as const;
  if (status === "Cancelled") return "red" as const;
  return "amber" as const;
}

function paymentTone(payment: string) {
  if (payment === "Paid") return "green" as const;
  if (payment === "Refunded") return "red" as const;
  return "amber" as const;
}

function OrderDetails({ order, close }: { order: AdminOrder; close: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  function cancelOrder() {
    startTransition(async () => {
      const result = await cancelOrderAction(order.id, reason);

      if (result.ok) {
        toast.success(result.message ?? "Order cancelled.");
        close();
        router.refresh();
        return;
      }

      toast.error("Order could not be cancelled", {
        description: result.error ?? "Please try again.",
      });
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          ["Plan", order.plan],
          ["Items", `${order.items} meals`],
          ["Order date", order.date],
          ["Payment", order.payment],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink/10 bg-ivory p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-ink/10 bg-ivory p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Status</p>
        <div className="mt-2">
          <StatusPill tone={statusTone(order.status)}>{order.status}</StatusPill>
        </div>
        <p className="mt-2 text-sm font-medium text-ink/55">
          {order.status === "Accepted"
            ? "Paid orders are accepted automatically. Cancel only if the kitchen cannot fulfil it."
            : order.status === "Pending payment"
              ? "Waiting on the customer's Zelle payment. Confirm it from the Payments page."
              : "This order is cancelled. Its packages and deliveries are stopped."}
        </p>
      </div>
      <div className="dark-band rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-saffron">Total</span>
          <span className="font-display text-3xl font-black">{formatCurrency(order.total)}</span>
        </div>
      </div>
      {order.status !== "Cancelled" &&
        (showCancel ? (
          <div className="grid gap-3 rounded-lg border border-ink/10 bg-ivory p-4">
            <label className="grid gap-2 text-sm font-extrabold">
              Reason for cancelling (sent to the customer)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. We cannot deliver to your area this month."
                className="min-h-24 rounded-button border border-ink/10 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-saffron"
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCancel(false)} disabled={pending}>
                Keep order
              </Button>
              <Button onClick={cancelOrder} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" size={17} /> : <X size={17} />}
                Cancel order
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowCancel(true)}>
              <X size={17} />
              Cancel order…
            </Button>
          </div>
        ))}
    </div>
  );
}

function OrderTable({ orders }: { orders: AdminOrder[] }) {
  return (
    <Card>
      <Table>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Customer</Th>
            <Th>Plan</Th>
            <Th>Total</Th>
            <Th>Payment</Th>
            <Th>Status</Th>
            <Th className="text-right">Details</Th>
          </tr>
        </thead>
        <tbody>
          {orders.length ? (
            orders.map((order) => (
              <tr key={order.id} className="transition hover:bg-ivory/60">
                <Td className="font-extrabold">{order.id}</Td>
                <Td className="text-ink/70">{order.customer}</Td>
                <Td className="text-ink/60">{order.plan}</Td>
                <Td className="font-black">{formatCurrency(order.total)}</Td>
                <Td>
                  <StatusPill tone={paymentTone(order.payment)}>{order.payment}</StatusPill>
                </Td>
                <Td>
                  <StatusPill tone={statusTone(order.status)}>{order.status}</StatusPill>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Drawer
                      title={order.id}
                      description={`${order.customer} - ${order.date}`}
                      trigger={({ open }) => (
                        <Button variant="secondary" onClick={open} className="h-9 px-4">
                          View
                        </Button>
                      )}
                    >
                      {({ close }) => <OrderDetails order={order} close={close} />}
                    </Drawer>
                  </div>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td colSpan={7} className="py-8 text-center text-sm font-bold text-ink/45">
                No orders in this view.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
}

const statuses = ["Accepted", "Pending payment", "Cancelled"] as const;

export function AdminOrdersClient({ orders }: { orders: AdminOrder[] }) {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Paid orders are accepted automatically. Cancel an order only when the kitchen cannot fulfil it."
        action={
          <ButtonLink href="/api/admin/orders/export" variant="secondary">
            <Filter size={18} />
            Export CSV
          </ButtonLink>
        }
      />
      <Tabs
        items={[
          { id: "all", label: `All (${orders.length})`, content: <OrderTable orders={orders} /> },
          ...statuses.map((status) => ({
            id: status,
            label: `${status} (${orders.filter((order) => order.status === status).length})`,
            content: <OrderTable orders={orders.filter((order) => order.status === status)} />,
          })),
        ]}
      />
    </div>
  );
}

"use client";

import { Check, Filter, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { Card, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { decideOrderAction } from "@/lib/actions/admin";
import type { AdminOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Accepted") return "green" as const;
  if (status === "Declined") return "red" as const;
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

  function decide(decision: "ACCEPTED" | "DECLINED") {
    startTransition(async () => {
      const result = await decideOrderAction(order.id, decision);

      if (result.ok) {
        toast.success(result.message ?? "Order updated.");
        close();
        router.refresh();
        return;
      }

      toast.error("Order update failed", {
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
          ["Delivery window", order.window],
          ["Date", order.date],
          ["Payment", order.payment],
          ["Status", order.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink/10 bg-ivory p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="dark-band rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-saffron">Total</span>
          <span className="font-display text-3xl font-black">{formatCurrency(order.total)}</span>
        </div>
      </div>
      {order.status === "Declined" ? (
        <p className="rounded-lg bg-rose px-4 py-3 text-sm font-bold text-masala">
          This order was declined. Its packages and deliveries are cancelled.
        </p>
      ) : (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => decide("DECLINED")} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={17} /> : <X size={17} />}
            Decline
          </Button>
          <Button onClick={() => decide("ACCEPTED")} disabled={pending || order.status === "Accepted"}>
            {pending ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
            {order.status === "Accepted" ? "Accepted" : "Accept order"}
          </Button>
        </div>
      )}
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

const statuses = ["Pending", "Accepted", "Declined"] as const;

export function AdminOrdersClient({ orders }: { orders: AdminOrder[] }) {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Review new orders and accept or decline them."
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

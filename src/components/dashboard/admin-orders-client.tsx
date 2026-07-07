"use client";

import { Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { Card, Field, PageHeader, Select, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { updateOrderStatusAction } from "@/lib/actions/admin";
import type { AdminOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Delivered") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

function paymentTone(payment: string) {
  if (payment === "Paid") return "green" as const;
  if (payment === "Refunded") return "red" as const;
  return "amber" as const;
}

function orderStatusValue(status: string) {
  if (status === "Out for delivery") return "OUT_FOR_DELIVERY";
  if (status === "Delivered") return "DELIVERED";
  if (status === "Paused") return "PAUSED";
  return "PREPARING";
}

function OrderDetails({ order, close }: { order: AdminOrder; close: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState(orderStatusValue(order.status));
  const [pending, startTransition] = useTransition();

  function updateStatus() {
    startTransition(async () => {
      const result = await updateOrderStatusAction(order.id, status);

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
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-ink/10 bg-ivory p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
          </div>
        ))}
      </div>
      <Field label="Delivery status">
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="PREPARING">Preparing</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <div className="dark-band rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-saffron">Total</span>
          <span className="font-display text-3xl font-black">{formatCurrency(order.total)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={close}>
          Close
        </Button>
        <Button onClick={updateStatus} disabled={pending}>
          {pending ? "Saving" : "Update status"}
        </Button>
      </div>
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

const statuses = ["Preparing", "Out for delivery", "Delivered", "Paused"];

export function AdminOrdersClient({ orders }: { orders: AdminOrder[] }) {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track and update every tiffin order across the delivery week."
        action={
          <Button variant="secondary">
            <Filter size={18} />
            Export
          </Button>
        }
      />
      <Tabs
        items={[
          { id: "all", label: `All (${orders.length})`, content: <OrderTable orders={orders} /> },
          ...statuses.map((status) => ({
            id: status,
            label: status,
            content: <OrderTable orders={orders.filter((order) => order.status === status)} />,
          })),
        ]}
      />
    </div>
  );
}

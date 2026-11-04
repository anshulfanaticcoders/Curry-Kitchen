"use client";

import Link from "next/link";
import { ArrowUpRight, Filter, Loader2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/dashboard/interactive";
import { AdminListPagination, AdminListSearch } from "@/components/dashboard/admin-list-search";
import { AdminOrderReceipt } from "@/components/dashboard/admin-order-receipt";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { cancelOrderAction } from "@/lib/actions/admin";
import type { AdminOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ADMIN_ORDER_FILTERS, adminListHref, type AdminListQuery } from "@/lib/admin-list-query";

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
      {order.customerId ? (
        <Link href={`/admin/customers/${encodeURIComponent(order.customerId)}`} onClick={close}
          className="flex min-h-12 items-center gap-3 rounded-lg border border-ink/15 px-4 py-3 text-sm font-bold text-ink transition hover:border-saffron hover:bg-rose focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron">
          <UserRound size={19} className="shrink-0 text-masala" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words">View customer details</span>
          <ArrowUpRight size={18} className="shrink-0" aria-hidden="true" />
        </Link>
      ) : <p className="text-sm text-ink/70">Guest order. No linked customer profile.</p>}
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
      {order.allergies ? (
        <div className="rounded-lg border border-masala/40 bg-rose p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-masala">Allergies</p>
          <p className="mt-1 font-bold text-masala">{order.allergies}</p>
        </div>
      ) : null}
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
        <AdminOrderReceipt orderNumber={order.id} className="mt-4" />
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

function OrderTable({ orders, searched }: { orders: AdminOrder[]; searched: boolean }) {
  if (!orders.length) {
    return (
      <Card>
        <EmptyState title={searched ? "No matching orders" : "No orders in this view"}
          description={searched ? "Try another order number, name, email or phone." : "Choose another status or return to the previous page."} />
      </Card>
    );
  }

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
          {orders.map((order) => (
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
            ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function AdminOrdersClient({ orders, query, hasNext }: { orders: AdminOrder[]; query: AdminListQuery; hasNext: boolean }) {
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
      <AdminListSearch key={query.q} path="/admin/orders" query={query} label="Search orders" placeholder="Order #, name, email or phone" />
      <nav aria-label="Order status" className="mb-5 flex flex-wrap gap-2">
        {ADMIN_ORDER_FILTERS.map((status) => <Link key={status} href={adminListHref("/admin/orders", { ...query, status, page: 1 })} scroll={false}
          aria-current={query.status === status ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${query.status === status ? "border-saffron bg-saffron text-ink" : "border-ink/15 bg-white text-ink/75 hover:border-saffron"}`}>
          {status === "all" ? "All orders" : status}
        </Link>)}
      </nav>
      <OrderTable orders={orders} searched={Boolean(query.q)} />
      <AdminListPagination path="/admin/orders" query={query} hasNext={hasNext} count={orders.length} />
    </div>
  );
}

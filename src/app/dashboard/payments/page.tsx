import { CreditCard, RotateCcw } from "lucide-react";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPayments } from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Paid") return "green" as const;
  if (status === "Refunded") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function CustomerPaymentsPage() {
  const myTransactions = await getCustomerPayments();
  const paidTotal = myTransactions
    .filter((transaction) => transaction.status === "Paid")
    .reduce((total, transaction) => total + transaction.amount, 0);

  return (
    <div>
      <PageHeader title="Payments" description="Review payment status and billing history for your tiffin orders." />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-button bg-saffron/15 text-masala">
              <CreditCard size={22} />
            </span>
            <div>
              <p className="font-display text-2xl font-black">{formatCurrency(paidTotal)}</p>
              <p className="text-sm font-bold text-ink/55">Paid across completed orders</p>
            </div>
          </div>
          <ButtonLink href="/packages" variant="secondary">
            <RotateCcw size={18} />
            Buy again
          </ButtonLink>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/58">
          Saved cards are not stored in Curry Kitchen. Stripe handles card entry during checkout, so this dashboard only shows order payment history.
        </p>
      </Card>

      <Card>
        <CardHeader title="Billing history" description={`${myTransactions.length} payment records`} />
        <div className="divide-y divide-ink/8 md:hidden">
          {myTransactions.length ? (
            myTransactions.map((tx) => (
              <div key={tx.id} className="grid gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold">{tx.orderId}</p>
                  <StatusPill tone={statusTone(tx.status)}>{tx.status}</StatusPill>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/60">{tx.method} · {tx.date}</span>
                  <span className="font-black">{formatCurrency(tx.amount)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm font-bold text-ink/45">
              No payment records yet. Completed checkout payments will appear here.
            </p>
          )}
        </div>
        <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Method</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Amount</Th>
            </tr>
          </thead>
          <tbody>
            {myTransactions.length ? (
              myTransactions.map((tx) => (
                <tr key={tx.id} className="transition hover:bg-ivory/60">
                  <Td className="font-extrabold">{tx.orderId}</Td>
                  <Td className="text-ink/60">{tx.method}</Td>
                  <Td className="text-ink/55">{tx.date}</Td>
                  <Td>
                    <StatusPill tone={statusTone(tx.status)}>{tx.status}</StatusPill>
                  </Td>
                  <Td className="font-black">{formatCurrency(tx.amount)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-sm font-bold text-ink/45">
                  No payment records yet. Completed checkout payments will appear here.
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

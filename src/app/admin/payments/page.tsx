import { Download } from "lucide-react";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getPayments } from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Paid") return "green" as const;
  if (status === "Refunded") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const transactions = await getPayments();
  const collected = transactions
    .filter((tx) => tx.status === "Paid")
    .reduce((total, tx) => total + tx.amount, 0);
  const refunded = transactions
    .filter((tx) => tx.status === "Refunded")
    .reduce((total, tx) => total + tx.amount, 0);
  const pending = transactions
    .filter((tx) => tx.status === "Pending")
    .reduce((total, tx) => total + tx.amount, 0);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Transactions, refunds, and payouts across all plans."
        action={
          <ButtonLink href="/admin/payments" variant="secondary">
            <Download size={18} />
            Export CSV
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatCurrency(collected)} tone="good" delta="this week" />
        <StatCard label="Refunded" value={formatCurrency(refunded)} tone="watch" />
        <StatCard label="Pending" value={formatCurrency(pending)} />
      </div>

      <Card>
        <CardHeader title="Transactions" description={`${transactions.length} recent payments`} />
        <Table>
          <thead>
            <tr>
              <Th>Transaction</Th>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="transition hover:bg-ivory/60">
                <Td className="font-mono text-xs font-bold text-ink/55">{tx.id}</Td>
                <Td className="font-extrabold">{tx.orderId}</Td>
                <Td className="text-ink/70">{tx.customer}</Td>
                <Td className="text-ink/60">{tx.method}</Td>
                <Td className="font-black">{formatCurrency(tx.amount)}</Td>
                <Td>
                  <StatusPill tone={statusTone(tx.status)}>{tx.status}</StatusPill>
                </Td>
                <Td className="text-ink/55">{tx.date}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

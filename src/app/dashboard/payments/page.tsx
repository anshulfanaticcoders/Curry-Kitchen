import { CreditCard, Plus } from "lucide-react";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getCustomerPayments } from "@/lib/server/catalog";
import { formatCurrency } from "@/lib/utils";

const methods = [
  { id: "pm-1", brand: "Visa", last4: "4242", expiry: "08 / 28", primary: true },
  { id: "pm-2", brand: "Mastercard", last4: "8821", expiry: "02 / 27", primary: false },
];

function statusTone(status: string) {
  if (status === "Paid") return "green" as const;
  if (status === "Refunded") return "red" as const;
  return "amber" as const;
}

export const dynamic = "force-dynamic";

export default async function CustomerPaymentsPage() {
  const myTransactions = await getCustomerPayments();

  return (
    <div>
      <PageHeader title="Payments" description="Manage cards and review your billing history." />

      <Card className="mb-6">
        <CardHeader
          title="Payment methods"
          action={
            <Button className="h-10 px-4">
              <Plus size={16} />
              Add card
            </Button>
          }
        />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className="dark-band relative overflow-hidden rounded-lg p-5 text-white"
            >
              <div className="relative flex items-start justify-between">
                <CreditCard size={28} className="text-saffron" />
                {method.primary ? (
                  <span className="rounded-full bg-saffron px-3 py-1 text-xs font-black text-ink">Primary</span>
                ) : null}
              </div>
              <p className="relative mt-8 font-display text-2xl font-black tracking-[0.12em]">
                •••• •••• •••• {method.last4}
              </p>
              <div className="relative mt-3 flex items-center justify-between text-sm font-bold text-white/65">
                <span>{method.brand}</span>
                <span>Exp {method.expiry}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Billing history" />
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
            {myTransactions.map((tx) => (
              <tr key={tx.id} className="transition hover:bg-ivory/60">
                <Td className="font-extrabold">{tx.orderId}</Td>
                <Td className="text-ink/60">{tx.method}</Td>
                <Td className="text-ink/55">{tx.date}</Td>
                <Td>
                  <StatusPill tone={statusTone(tx.status)}>{tx.status}</StatusPill>
                </Td>
                <Td className="font-black">{formatCurrency(tx.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

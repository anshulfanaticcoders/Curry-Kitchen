"use client";

import { Mail, Phone, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Drawer } from "@/components/dashboard/interactive";
import { Card, CardHeader, EmptyState, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { Customer } from "@/lib/types";
import { adminPausePackageAction, adminResumePackageAction } from "@/lib/actions/admin";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

function PackageControl({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  if (!customer.activePackageId) return <p className="text-sm font-bold text-ink/50">No active package to manage.</p>;
  const paused = customer.status === "Paused";
  return <ConfirmActionButton label={paused ? "Resume package" : "Pause package"} title={paused ? `Resume ${customer.plan}?` : `Pause ${customer.plan}?`} description={paused ? "Deliveries will resume on the next eligible schedule." : "Pause this customer package until an admin resumes it."} confirmLabel={paused ? "Resume" : "Pause"} action={() => new Promise((resolve) => startTransition(async () => { const result = paused ? await adminResumePackageAction(customer.activePackageId!) : await adminPausePackageAction(customer.activePackageId!); if (result.ok) { toast.success(result.message ?? "Package updated."); router.refresh(); } else { toast.error("Package could not be updated", { description: result.error }); } resolve(result); }))} />;
}

export function AdminCustomersClient({ customers }: { customers: Customer[] }) {
  const active = customers.filter((customer) => customer.status === "Active").length;
  const totalSpend = customers.reduce((total, customer) => total + customer.spend, 0);

  return (
    <div>
      <PageHeader title="Customers" description="Everyone subscribed to a Curry Kitchen plan." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total customers" value={String(customers.length)} />
        <StatCard label="Active plans" value={String(active)} tone="good" />
        <StatCard label="Lifetime revenue" value={formatCurrency(totalSpend)} />
      </div>

      <Card>
        <CardHeader title="All customers" />
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Plan</Th>
              <Th>Area</Th>
              <Th>Orders</Th>
              <Th>Spend</Th>
              <Th>Status</Th>
              <Th className="text-right">Details</Th>
            </tr>
          </thead>
          <tbody>
            {customers.length ? (
              customers.map((customer) => (
                <tr key={customer.id} className="transition hover:bg-ivory/60">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-black text-saffron">
                        {customer.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div>
                        <p className="font-extrabold">{customer.name}</p>
                        <p className="text-xs font-bold text-ink/45">{customer.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink/70">{customer.plan}</Td>
                  <Td className="text-ink/60">{customer.area}</Td>
                  <Td>{customer.orders}</Td>
                  <Td className="font-black">{formatCurrency(customer.spend)}</Td>
                  <Td>
                    <StatusPill tone={statusTone(customer.status)}>{customer.status}</StatusPill>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Drawer
                        title={customer.name}
                        description={`Customer since ${customer.joined}`}
                        trigger={({ open }) => (
                          <Button variant="secondary" onClick={open} className="h-9 px-4">
                            View
                          </Button>
                        )}
                        footer={({ close }) => (
                          <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={close}>
                              Close
                            </Button>
                            <a href={`mailto:${customer.email}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-saffron px-5 text-sm font-extrabold text-ink shadow-lift transition hover:-translate-y-0.5 hover:bg-[#ff8f33]">
                              Message
                            </a>
                          </div>
                        )}
                      >
                        {() => (
                          <div className="grid gap-4">
                            <div className="grid gap-3">
                              <a href={`mailto:${customer.email}`} className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-bold">
                                <Mail size={17} className="text-masala" />
                                {customer.email}
                              </a>
                              <span className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-bold">
                                <Phone size={17} className="text-masala" />
                                {customer.phone}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                ["Orders", String(customer.orders)],
                                ["Spend", formatCurrency(customer.spend)],
                                ["Status", customer.status],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-ink/10 bg-ivory p-3 text-center">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</p>
                                  <p className="mt-1 font-display text-xl font-black">{value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="rounded-lg border border-ink/10 bg-ivory p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Current plan</p>
                              <p className="mt-1 font-bold">{customer.plan}</p>
                            </div>
                            <PackageControl customer={customer} />
                            <ButtonLink
                              href={`/admin/packing/${customer.id}`}
                              variant="dark"
                              className="w-full"
                            >
                              <QrCode size={18} />
                              Open packing label
                            </ButtonLink>
                          </div>
                        )}
                      </Drawer>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <tr><Td colSpan={7}><EmptyState title="No customers yet" description="New account and checkout records will appear here." /></Td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

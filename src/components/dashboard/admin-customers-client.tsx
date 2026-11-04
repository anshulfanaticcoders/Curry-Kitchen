"use client";

import { Card, CardHeader, EmptyState, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { Customer } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { AdminListPagination, AdminListSearch } from "@/components/dashboard/admin-list-search";
import type { AdminListQuery } from "@/lib/admin-list-query";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Paused") return "red" as const;
  return "amber" as const;
}

export function AdminCustomersClient({ customers, query, hasNext }: { customers: Customer[]; query: AdminListQuery; hasNext: boolean }) {
  const active = customers.filter((customer) => customer.status === "Active").length;
  const totalSpend = customers.reduce((total, customer) => total + customer.spend, 0);

  return (
    <div>
      <PageHeader title="Customers" description="Everyone subscribed to a Curry Kitchen plan." />
      <AdminListSearch key={query.q} path="/admin/customers" query={query} label="Search customers" placeholder="Name, email or phone" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Customers on this page" value={String(customers.length)} />
        <StatCard label="Active plans on this page" value={String(active)} tone="good" />
        <StatCard label="Customer spend on this page" value={formatCurrency(totalSpend)} />
      </div>
      <Card>
        <CardHeader title={query.q ? "Matching customers" : "All customers"} description="Open a customer to see their details and delivery calendar." />
        {customers.length ? <Table>
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
            {customers.map((customer) => (
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
                      <ButtonLink href={`/admin/customers/${customer.id}`} variant="secondary" className="h-9 px-4">
                        View
                      </ButtonLink>
                    </div>
                  </Td>
                </tr>
              ))}
          </tbody>
        </Table> : <EmptyState title={query.q ? "No matching customers" : query.page > 1 ? "No more customers" : "No customers yet"}
          description={query.q ? "Try another name, email or phone number." : query.page > 1 ? "Return to the previous page." : "New account and checkout records will appear here."} />}
      </Card>
      <AdminListPagination path="/admin/customers" query={query} hasNext={hasNext} count={customers.length} />
    </div>
  );
}

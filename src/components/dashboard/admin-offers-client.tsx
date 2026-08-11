"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteCouponAction } from "@/lib/actions/admin";
import type { Coupon } from "@/lib/types";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Scheduled") return "amber" as const;
  return "ink" as const;
}

export function AdminOffersClient({ coupons }: { coupons: Coupon[] }) {
  const active = coupons.filter((coupon) => coupon.status === "Active").length;
  const redemptions = coupons.reduce((total, coupon) => total + coupon.usage, 0);

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Create discount codes and track redemptions."
        action={
          <ButtonLink href="/admin/offers/new">
            <Plus size={18} />
            Create offer
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active offers" value={String(active)} tone="good" />
        <StatCard label="Total redemptions" value={String(redemptions)} delta="across all codes" />
        <StatCard label="Codes live" value={String(coupons.length)} />
      </div>

      <Card>
        <CardHeader title="All offers" />
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Customer</Th>
              <Th>Usage</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="transition hover:bg-ivory/60">
                <Td>
                  <span className="rounded-button bg-ink px-3 py-1 font-mono text-xs font-black uppercase text-saffron">
                    {coupon.code}
                  </span>
                </Td>
                <Td className="font-black">
                  {coupon.type === "Percent" ? `${coupon.value}%` : `$${coupon.value}`}
                </Td>
                <Td className="text-ink/60">{coupon.customerName ?? "Any customer"}</Td>
                <Td className="text-ink/60">
                  {coupon.usage} / {coupon.limit || "Unlimited"}
                </Td>
                <Td className="text-ink/60">{coupon.expires}</Td>
                <Td>
                  <StatusPill tone={statusTone(coupon.status)}>{coupon.status}</StatusPill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/offers/${coupon.id}/edit`}
                      aria-label={`Edit ${coupon.code}`}
                      className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                    >
                      <Pencil size={16} />
                    </Link>
                    <ConfirmActionButton
                      label={`Delete ${coupon.code}`}
                      title={`Archive ${coupon.code}?`}
                      description="The offer will stop being available at checkout. Existing orders keep their discount."
                      confirmLabel="Archive"
                      action={() => deleteCouponAction(coupon.id)}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

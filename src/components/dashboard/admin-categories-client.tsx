"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteCategoryAction } from "@/lib/actions/admin";
import type { Category } from "@/lib/types";

function statusTone(status?: string) {
  if (status === "Active") return "green" as const;
  if (status === "Archived") return "red" as const;
  return "amber" as const;
}

export function AdminCategoriesClient({ categories }: { categories: Category[] }) {
  return (
    <div>
      <PageHeader
        title="Categories"
        description="Set the package duration and any verification rule once, then assign packages to the category."
        action={
          <ButtonLink href="/admin/categories/new">
            <Plus size={18} />
            Add category
          </ButtonLink>
        }
      />
      <Card>
        <CardHeader title="All categories" description={`${categories.length} categories`} />
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Plans</Th>
              <Th>Delivery days</Th>
              <Th>Delivery charge</Th>
              <Th>Verification</Th>
              <Th>Description</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="transition hover:bg-ivory/60">
                <Td className="font-extrabold">{category.name}</Td>
                <Td className="text-ink/55">/{category.slug}</Td>
                <Td>{category.count}</Td>
                <Td>{category.deliveryDayCount}</Td>
                <Td>
                  {category.deliveryCharge == null
                    ? "Global"
                    : `$${category.deliveryCharge.toFixed(2)}`}
                </Td>
                <Td>
                  <StatusPill tone={category.requiresVerification ? "amber" : "green"}>
                    {category.requiresVerification ? "Required" : "Not required"}
                  </StatusPill>
                </Td>
                <Td className="max-w-sm text-ink/60">{category.description}</Td>
                <Td>
                  <StatusPill tone={statusTone(category.status)}>{category.status ?? "Active"}</StatusPill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/categories/${category.id}/edit`}
                      aria-label={`Edit ${category.name}`}
                      className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                    >
                      <Pencil size={16} />
                    </Link>
                    <ConfirmActionButton
                      label={`Delete ${category.name}`}
                      title={`Archive ${category.name}?`}
                      description="The category will stop appearing in admin selectors. Existing packages keep their saved category until changed."
                      confirmLabel="Archive"
                      action={() => deleteCategoryAction(category.id)}
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

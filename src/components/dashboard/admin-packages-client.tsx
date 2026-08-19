"use client";

import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { Tabs } from "@/components/dashboard/interactive";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  deleteCustomPackageItemAction,
  deletePackageAction,
} from "@/lib/actions/admin";
import type { AdminCustomPackageItemRecord, AdminPackageRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Archived") return "red" as const;
  return "amber" as const;
}

const editLinkClass =
  "grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink";

function PackagesTab({ packages }: { packages: AdminPackageRecord[] }) {
  return (
    <Card>
      <CardHeader title="All plans" description={`${packages.length} active or draft packages`} />
      <Table>
        <thead>
          <tr>
            <Th>Plan</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {packages.map((plan) => (
            <tr key={plan.id} className="transition hover:bg-ivory/60">
              <Td>
                <div className="flex items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-button">
                    <Image src={plan.image} alt={plan.name} fill className="object-cover" sizes="44px" />
                  </span>
                  <div>
                    <p className="font-extrabold">{plan.name}</p>
                    <p className="text-xs font-bold text-ink/45">{plan.deliveryDayCount} delivery days</p>
                  </div>
                </div>
              </Td>
              <Td className="text-ink/70">{plan.category}</Td>
              <Td className="font-black">{formatCurrency(plan.price)}</Td>
              <Td>
                <StatusPill tone={statusTone(plan.status)}>{plan.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/admin/packages/${plan.id}/edit`} aria-label={`Edit ${plan.name}`} className={editLinkClass}>
                    <Pencil size={16} />
                  </Link>
                  <ConfirmActionButton
                    label={`Delete ${plan.name}`}
                    title={`Archive ${plan.name}?`}
                    description="The package will disappear from storefront selection, but past orders and payments stay intact."
                    confirmLabel="Archive"
                    action={() => deletePackageAction(plan.id)}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function CustomItemsTab({ items }: { items: AdminCustomPackageItemRecord[] }) {
  return (
    <Card>
      <CardHeader
        title="Custom package items"
        description="Per-unit priced items customers combine into their own plan."
      />
      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Price per unit</Th>
            <Th>Mandatory</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-ivory/60">
              <Td>
                <p className="font-extrabold">{item.name}</p>
                <p className="text-xs font-bold text-ink/45">Sort order {item.sortOrder}</p>
              </Td>
              <Td className="font-black">
                {formatCurrency(item.pricePerUnit)}
                <span className="ml-1 text-xs font-bold text-ink/45">/ {item.unitLabel}</span>
              </Td>
              <Td>
                <StatusPill tone={item.required ? "green" : "amber"}>
                  {item.required ? "Required" : "Optional"}
                </StatusPill>
              </Td>
              <Td>
                <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/packages/custom-items/${item.id}/edit`}
                    aria-label={`Edit ${item.name}`}
                    className={editLinkClass}
                  >
                    <Pencil size={16} />
                  </Link>
                  <ConfirmActionButton
                    label={`Delete ${item.name}`}
                    title={`Archive ${item.name}?`}
                    description="Customers will no longer be able to add this item to a custom package. Existing orders are unaffected."
                    confirmLabel="Archive"
                    action={() => deleteCustomPackageItemAction(item.id)}
                  />
                </div>
              </Td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <Td className="text-ink/50">No custom items yet. Add one to enable custom packages.</Td>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Card>
  );
}

export function AdminPackagesClient({
  packages,
  customPackageItems,
}: {
  packages: AdminPackageRecord[];
  customPackageItems: AdminCustomPackageItemRecord[];
}) {
  return (
    <div>
      <PageHeader
        title="Packages"
        description="Create fixed plans, and price the items customers can build a custom package from."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/packages/custom-items/new" variant="secondary">
              <Plus size={18} />
              Add custom item
            </ButtonLink>
            <ButtonLink href="/admin/packages/new">
              <Plus size={18} />
              Add package
            </ButtonLink>
          </div>
        }
      />
      <Tabs
        items={[
          {
            id: "packages",
            label: `Packages (${packages.length})`,
            content: <PackagesTab packages={packages} />,
          },
          {
            id: "custom-items",
            label: `Custom items (${customPackageItems.length})`,
            content: <CustomItemsTab items={customPackageItems} />,
          },
        ]}
      />
    </div>
  );
}

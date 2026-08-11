"use client";

import Image from "next/image";
import { Gift, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { Tabs } from "@/components/dashboard/interactive";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  deleteAddonAction,
  deleteComplimentaryItemAction,
  deletePackageAction,
} from "@/lib/actions/admin";
import type {
  AdminAddonRecord,
  AdminComplimentaryItemRecord,
  AdminPackageRecord,
} from "@/lib/types";
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
            <Th>Add-ons</Th>
            <Th>Free items</Th>
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
              <Td className="text-ink/60">{plan.addonIds.length}</Td>
              <Td className="text-ink/60">{plan.complimentaryItemIds.length}</Td>
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

function AddonsTab({ addons }: { addons: AdminAddonRecord[] }) {
  return (
    <Card>
      <CardHeader title="Add-ons" description="Extras that can be assigned to packages." />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>Price</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {addons.map((addon) => (
            <tr key={addon.id} className="transition hover:bg-ivory/60">
              <Td className="font-extrabold">{addon.name}</Td>
              <Td className="max-w-sm text-ink/60">{addon.description || "No description"}</Td>
              <Td className="font-black">{formatCurrency(addon.price)}</Td>
              <Td>
                <StatusPill tone={statusTone(addon.status)}>{addon.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/admin/packages/addons/${addon.id}/edit`} aria-label={`Edit ${addon.name}`} className={editLinkClass}>
                    <Pencil size={16} />
                  </Link>
                  <ConfirmActionButton
                    label={`Delete ${addon.name}`}
                    title={`Archive ${addon.name}?`}
                    description="This add-on will stop appearing in package builders. Orders that already used it will remain untouched."
                    confirmLabel="Archive"
                    action={() => deleteAddonAction(addon.id)}
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

function ComplimentaryItemsTab({ items }: { items: AdminComplimentaryItemRecord[] }) {
  return (
    <Card>
      <CardHeader title="Complimentary items" description="Free extras that can be assigned to any plan." />
      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Description</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-ivory/60">
              <Td className="font-extrabold">{item.name}</Td>
              <Td className="max-w-sm text-ink/60">{item.description || "No description"}</Td>
              <Td>
                <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/admin/packages/complimentary/${item.id}/edit`} aria-label={`Edit ${item.name}`} className={editLinkClass}>
                    <Pencil size={16} />
                  </Link>
                  <ConfirmActionButton
                    label={`Archive ${item.name}`}
                    title={`Archive ${item.name}?`}
                    description="This item will stop appearing with plans, but past order snapshots remain unchanged."
                    confirmLabel="Archive"
                    action={() => deleteComplimentaryItemAction(item.id)}
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

export function AdminPackagesClient({
  packages,
  addons,
  complimentaryItems,
}: {
  packages: AdminPackageRecord[];
  addons: AdminAddonRecord[];
  complimentaryItems: AdminComplimentaryItemRecord[];
}) {
  return (
    <div>
      <PageHeader
        title="Packages"
        description="Create plans with pricing, delivery days, included items, and add-ons."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/packages/complimentary/new" variant="secondary">
              <Gift size={18} />
              Add complimentary item
            </ButtonLink>
            <ButtonLink href="/admin/packages/addons/new" variant="secondary">
              <Plus size={18} />
              Add add-on
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
            id: "addons",
            label: `Add-ons (${addons.length})`,
            content: <AddonsTab addons={addons} />,
          },
          {
            id: "complimentary-items",
            label: `Complimentary (${complimentaryItems.length})`,
            content: <ComplimentaryItemsTab items={complimentaryItems} />,
          },
        ]}
      />
    </div>
  );
}

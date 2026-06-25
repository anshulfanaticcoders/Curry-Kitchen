"use client";

import Image from "next/image";
import { Loader2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import {
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  deleteAddonAction,
  deletePackageAction,
  saveAddonAction,
  savePackageAction,
} from "@/lib/actions/admin";
import type { AdminAddonRecord, AdminPackageRecord, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Archived") return "red" as const;
  return "amber" as const;
}

function statusValue(status?: string) {
  if (status === "Active") return "ACTIVE";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
}

function cadenceValue(plan?: AdminPackageRecord) {
  if (plan?.category === "Weekly") return "WEEKLY";
  if (plan?.category === "Student") return "STUDENT";
  return "MONTHLY";
}

function SubmitButton({ label }: { label: string }) {
  const [pending] = useTransition();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" size={18} /> : null}
      {label}
    </Button>
  );
}

function FormActions({ close, label }: { close: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={close}>
        Cancel
      </Button>
      <SubmitButton label={label} />
    </div>
  );
}

function useSubmitAction() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return function submit(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => ActionResult,
    close: () => void,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        close();
        router.refresh();
        return;
      }

      toast.error("Save failed", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  };
}

function PackageForm({
  plan,
  categories,
  addons,
  close,
}: {
  plan?: AdminPackageRecord;
  categories: Category[];
  addons: AdminAddonRecord[];
  close: () => void;
}) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, savePackageAction, close)}>
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Plan name">
          <Input name="name" defaultValue={plan?.name} placeholder="Regular 8 Roti Tiffin" required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(plan?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category">
          <Select name="categoryId" defaultValue={plan?.categoryId ?? categories[0]?.id} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cadence">
          <Select name="cadence" defaultValue={cadenceValue(plan)}>
            <option value="WEEKLY">Weekly trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="STUDENT">Student</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Price (USD)">
          <Input name="price" type="number" step="0.01" min="0" defaultValue={plan?.price} required />
        </Field>
        <Field label="Tax rate" hint="Example: 0.0875 = 8.75%">
          <Input name="taxRate" type="number" step="0.0001" min="0" max="1" defaultValue={plan?.taxRate ?? 0.0875} required />
        </Field>
        <Field label="Delivery days">
          <Input name="deliveryDayCount" type="number" min="1" defaultValue={plan?.deliveryDayCount ?? 20} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Badge">
          <Input name="badge" defaultValue={plan?.badge} placeholder="Most loved" />
        </Field>
        <Field label="Best for">
          <Input name="bestFor" defaultValue={plan?.bestFor} placeholder="Daily dinner" />
        </Field>
      </div>

      <Field label="Servings">
        <Input name="servings" defaultValue={plan?.servings} placeholder="8 roti, daal, sabzi, salad" required />
      </Field>
      <Field label="Image URL">
        <Input name="imageUrl" defaultValue={plan?.image} placeholder="https://..." required />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={plan?.description} placeholder="Short, appetizing summary of the plan." required />
      </Field>

      <Field label="Included items" hint="One item per line.">
        <Textarea name="includes" defaultValue={plan?.includes.join("\n")} placeholder={"12oz daal\n8oz sabzi\nSalad included"} />
      </Field>

      <Field label="Eligible add-ons" hint="These show in package builder and checkout.">
        <div className="grid gap-2 sm:grid-cols-2">
          {addons.map((addon) => (
            <label
              key={addon.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-bold has-[:checked]:border-saffron has-[:checked]:bg-rose"
            >
              <input
                type="checkbox"
                name="addonIds"
                value={addon.id}
                defaultChecked={plan?.addonIds.includes(addon.id)}
                className="mt-1 size-4 accent-[#ff7a1a]"
              />
              <span>
                {addon.name}
                <span className="block text-xs font-semibold text-ink/45">{formatCurrency(addon.price)}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Accent">
          <Select name="accent" defaultValue={plan?.accent ?? "saffron"}>
            <option value="saffron">Orange</option>
            <option value="leaf">Black</option>
            <option value="masala">Masala</option>
          </Select>
        </Field>
        <label className="mt-7 flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input type="checkbox" name="studentOnly" defaultChecked={plan?.studentOnly} className="size-4 accent-[#ff7a1a]" />
          Student verification required
        </label>
      </div>

      <FormActions close={close} label={plan ? "Save package" : "Create package"} />
    </form>
  );
}

function AddonForm({ addon, close }: { addon?: AdminAddonRecord; close: () => void }) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveAddonAction, close)}>
      {addon ? <input type="hidden" name="id" value={addon.id} /> : null}
      <Field label="Add-on name">
        <Input name="name" defaultValue={addon?.name} placeholder="Extra roti" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (USD)">
          <Input name="price" type="number" step="0.01" min="0" defaultValue={addon?.price} required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(addon?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <Field label="Image URL">
        <Input name="imageUrl" defaultValue={addon?.imageUrl} placeholder="Optional image URL" />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={addon?.description} placeholder="Two soft rotis." />
      </Field>
      <FormActions close={close} label={addon ? "Save add-on" : "Create add-on"} />
    </form>
  );
}

function PackagesTab({
  packages,
  categories,
  addons,
}: {
  packages: AdminPackageRecord[];
  categories: Category[];
  addons: AdminAddonRecord[];
}) {
  return (
    <Card>
      <CardHeader title="All plans" description={`${packages.length} active or draft packages`} />
      <Table>
        <thead>
          <tr>
            <Th>Plan</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Tax</Th>
            <Th>Add-ons</Th>
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
              <Td className="text-ink/60">{(plan.taxRate * 100).toFixed(2)}%</Td>
              <Td className="text-ink/60">{plan.addonIds.length}</Td>
              <Td>
                <StatusPill tone={statusTone(plan.status)}>{plan.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Drawer
                    title="Edit package"
                    description={plan.name}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Edit ${plan.name}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => (
                      <PackageForm plan={plan} categories={categories} addons={addons} close={close} />
                    )}
                  </Drawer>
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
                  <Drawer
                    title="Edit add-on"
                    description={addon.name}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Edit ${addon.name}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => <AddonForm addon={addon} close={close} />}
                  </Drawer>
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

export function AdminPackagesClient({
  packages,
  categories,
  addons,
}: {
  packages: AdminPackageRecord[];
  categories: Category[];
  addons: AdminAddonRecord[];
}) {
  return (
    <div>
      <PageHeader
        title="Packages"
        description="Create packages, set tax, delivery-day counts, included items, and package-specific add-ons."
        action={
          <div className="flex flex-wrap gap-2">
            <Drawer
              title="Add add-on"
              description="Create an extra item that can be attached to packages."
              trigger={({ open }) => (
                <Button variant="secondary" onClick={open}>
                  <Plus size={18} />
                  Add add-on
                </Button>
              )}
            >
              {({ close }) => <AddonForm close={close} />}
            </Drawer>
            <Drawer
              title="Add package"
              description="Create a new tiffin plan."
              trigger={({ open }) => (
                <Button onClick={open}>
                  <Plus size={18} />
                  Add package
                </Button>
              )}
            >
              {({ close }) => <PackageForm categories={categories} addons={addons} close={close} />}
            </Drawer>
          </div>
        }
      />
      <Tabs
        items={[
          {
            id: "packages",
            label: `Packages (${packages.length})`,
            content: <PackagesTab packages={packages} categories={categories} addons={addons} />,
          },
          {
            id: "addons",
            label: `Add-ons (${addons.length})`,
            content: <AddonsTab addons={addons} />,
          },
        ]}
      />
    </div>
  );
}

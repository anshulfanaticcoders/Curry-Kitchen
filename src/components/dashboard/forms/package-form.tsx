"use client";

import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { ImagePicker } from "@/components/dashboard/forms/image-picker";
import { Field, Input, Select, Textarea } from "@/components/dashboard/primitives";
import { saveAddonAction, saveComplimentaryItemAction, savePackageAction } from "@/lib/actions/admin";
import type {
  AdminAddonRecord,
  AdminComplimentaryItemRecord,
  AdminPackageRecord,
  Category,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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

export function PackageForm({
  plan,
  categories,
  addons,
  complimentaryItems,
}: {
  plan?: AdminPackageRecord;
  categories: Category[];
  addons: AdminAddonRecord[];
  complimentaryItems: AdminComplimentaryItemRecord[];
}) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);
  const assignableComplimentaryItems = complimentaryItems.filter(
    (item) => item.status === "Active",
  );

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, savePackageAction)}>
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      {/* accent is no longer edited in the simplified form; preserve the saved value */}
      <input type="hidden" name="accent" value={plan?.accent ?? "saffron"} />
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
        <Field label="Plan type">
          <Select name="cadence" defaultValue={cadenceValue(plan)}>
            <option value="WEEKLY">Weekly trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="STUDENT">Student / Military</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (USD)">
          <Input name="price" type="number" step="0.01" min="0" defaultValue={plan?.price} required />
        </Field>
        <Field label="Delivery days">
          <Input name="deliveryDayCount" type="number" min="1" defaultValue={plan?.deliveryDayCount ?? 20} required />
        </Field>
      </div>

      <Field label="What's in each tiffin" hint="Shown on the package card.">
        <Input name="servings" defaultValue={plan?.servings} placeholder="8 roti, daal, sabzi, salad" required />
      </Field>
      <Field label="Package image">
        <ImagePicker name="imageUrl" defaultValue={plan?.image} folder="packages" required />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={plan?.description} placeholder="Short, appetizing summary of the plan." required />
      </Field>

      <Field label="Included items" hint="One item per line.">
        <Textarea name="includes" defaultValue={plan?.includes.join("\n")} placeholder={"12oz daal\n8oz sabzi\nSalad included"} />
      </Field>

      <Field label="Complimentary items" hint="Free items included with this plan.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assignableComplimentaryItems.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-bold has-[:checked]:border-leaf has-[:checked]:bg-mint"
            >
              <input
                type="checkbox"
                name="complimentaryItemIds"
                value={item.id}
                defaultChecked={plan?.complimentaryItemIds.includes(item.id)}
                className="mt-1 size-4 accent-ink"
              />
              <span>
                {item.name}
                {item.description ? <span className="block text-xs font-semibold text-ink/45">{item.description}</span> : null}
              </span>
            </label>
          ))}
        </div>
        {assignableComplimentaryItems.length === 0 ? (
          <p className="text-sm font-bold text-ink/55">Create an active complimentary item first, then assign it to this plan.</p>
        ) : null}
      </Field>

      <Field label="Eligible add-ons" hint="These show in the package builder and checkout.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                className="mt-1 size-4 accent-saffron"
              />
              <span>
                {addon.name}
                <span className="block text-xs font-semibold text-ink/45">{formatCurrency(addon.price)}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
        <input type="checkbox" name="studentOnly" defaultChecked={plan?.studentOnly} className="size-4 accent-saffron" />
        Student / military verification required
      </label>

      <FormActions pending={pending} backHref={backHref} submitLabel={plan ? "Save package" : "Create package"} />
    </form>
  );
}

export function AddonForm({ addon }: { addon?: AdminAddonRecord }) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveAddonAction)}>
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
      <Field label="Add-on image" hint="Optional.">
        <ImagePicker name="imageUrl" defaultValue={addon?.imageUrl} folder="packages" />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={addon?.description} placeholder="Two soft rotis." />
      </Field>
      <FormActions pending={pending} backHref={backHref} submitLabel={addon ? "Save add-on" : "Create add-on"} />
    </form>
  );
}

export function ComplimentaryItemForm({ item }: { item?: AdminComplimentaryItemRecord }) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveComplimentaryItemAction)}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label="Complimentary item name">
        <Input name="name" defaultValue={item?.name} placeholder="Cucumber raita" required />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={item?.description} placeholder="Fresh yogurt and cucumber side." />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={item ? statusValue(item.status) : "ACTIVE"}>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </Field>
      <FormActions pending={pending} backHref={backHref} submitLabel={item ? "Save item" : "Create item"} />
    </form>
  );
}

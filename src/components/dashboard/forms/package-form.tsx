"use client";

import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { ImagePicker } from "@/components/dashboard/forms/image-picker";
import { Field, Input, Select, Textarea } from "@/components/dashboard/primitives";
import { saveCustomPackageCategoryAction, saveCustomPackageItemAction, savePackageAction } from "@/lib/actions/admin";
import type { AdminCustomPackageCategoryRecord, AdminCustomPackageItemRecord, AdminPackageRecord, Category } from "@/lib/types";

function statusValue(status?: string) {
  if (status === "Active") return "ACTIVE";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
}

export function PackageForm({
  plan,
  categories,
}: {
  plan?: AdminPackageRecord;
  categories: Category[];
}) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, savePackageAction)}>
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      {/* accent is no longer edited in the simplified form; preserve the saved value */}
      <input type="hidden" name="accent" value={plan?.accent ?? "saffron"} />
      <div className="grid gap-5 sm:grid-cols-3">
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
        <Field label="Card badge" hint="Optional. Leave blank to hide it from the package card.">
          <Input name="badge" defaultValue={plan?.badge} placeholder="Most loved" maxLength={36} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" hint="Package duration and verification rules come from this category.">
          <Select name="categoryId" defaultValue={plan?.categoryId ?? categories[0]?.id} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.deliveryDayCount} days)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price (USD)">
          <Input name="price" type="number" step="0.01" min="0" defaultValue={plan?.price} required />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-ink/10 bg-ivory p-4 text-sm">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={plan?.isFeatured}
          className="mt-0.5 size-4 accent-saffron"
        />
        <span>
          <span className="block font-extrabold">Feature on homepage</span>
          <span className="mt-1 block leading-5 text-ink/58">
            Show this active package in the Home package section. You can feature up to three packages.
          </span>
        </span>
      </label>

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

      <FormActions pending={pending} backHref={backHref} submitLabel={plan ? "Save package" : "Create package"} />
    </form>
  );
}

export function CustomPackageItemForm({
  item,
  categories,
}: {
  item?: AdminCustomPackageItemRecord;
  categories: AdminCustomPackageCategoryRecord[];
}) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCustomPackageItemAction)}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" hint="The category controls whether a choice is required and how quantities are entered.">
          <Select name="categoryId" defaultValue={item?.categoryId ?? categories[0]?.id} required>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.quantityControl})</option>)}
          </Select>
        </Field>
        <Field label="Name">
          <Input name="name" defaultValue={item?.name} placeholder="Dal tadka" required />
        </Field>
      </div>
      <Field label="Dish image" hint="Use a real photo for this exact dish or leave it blank for the neutral kitchen placeholder.">
        <ImagePicker name="imageUrl" defaultValue={item?.imageUrl} folder="custom-packages" uploadTitle="Upload dish image" previewAlt={item?.name ?? "Custom dish"} />
      </Field>
      <Field label="Short description" hint="Shown under the dish name in the customer builder.">
        <Textarea name="description" defaultValue={item?.description} placeholder="Slow-cooked yellow dal with a warm cumin finish." />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Unit label" hint="What one unit is: oz, roti, serving.">
          <Input name="unitLabel" defaultValue={item?.unitLabel ?? "oz"} placeholder="oz" required />
        </Field>
        <Field label="Price per unit" hint="Customer pays this for each unit they choose.">
          <Input
            name="pricePerUnit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item?.pricePerUnit}
            required
          />
        </Field>
        <Field label="Minimum quantity" hint="The least amount a customer can choose when they add this item.">
          <Input
            name="minQuantity"
            type="number"
            min="1"
            max="99"
            step="1"
            defaultValue={item?.minQuantity ?? 1}
            required
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Sort order" hint="Lower numbers show first in the builder.">
          <Input name="sortOrder" type="number" min="0" step="1" defaultValue={item?.sortOrder ?? 0} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(item?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <FormActions
        pending={pending}
        backHref={backHref}
        submitLabel={item ? "Save custom item" : "Create custom item"}
      />
    </form>
  );
}

export function CustomPackageCategoryForm({ category }: { category?: AdminCustomPackageCategoryRecord }) {
  const backHref = "/admin/packages";
  const { submit, pending } = useAdminFormSubmit(backHref);
  const status = statusValue(category?.status);
  const quantityControl = category?.quantityControl === "Counter" ? "COUNTER" : "INPUT";

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCustomPackageCategoryAction)}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category name">
          <Input name="name" defaultValue={category?.name} placeholder="Dal" required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={status}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <Field label="Category description" hint="A short prompt above this group in the customer builder.">
        <Textarea name="description" defaultValue={category?.description} placeholder="Choose one warm dal for your plate." />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Quantity control" hint="Counter is ideal for breads. Number input is better for ounces and servings.">
          <Select name="quantityControl" defaultValue={quantityControl}>
            <option value="INPUT">Number input</option>
            <option value="COUNTER">Large counter</option>
          </Select>
        </Field>
        <Field label="Sort order" hint="Lower numbers show first.">
          <Input name="sortOrder" type="number" min="0" step="1" defaultValue={category?.sortOrder ?? 0} />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-ink/10 bg-ivory p-4 text-sm">
        <input type="checkbox" name="required" defaultChecked={category?.required} className="mt-0.5 size-4 accent-saffron" />
        <span><span className="block font-extrabold">Customer must choose a dish from this category</span><span className="mt-1 block leading-5 text-ink/58">This means one choice from the group, not every dish inside it. Each dish keeps its own minimum quantity.</span></span>
      </label>
      <FormActions pending={pending} backHref={backHref} submitLabel={category ? "Save category" : "Create category"} />
    </form>
  );
}

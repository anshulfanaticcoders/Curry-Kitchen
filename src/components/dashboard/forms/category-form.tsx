"use client";

import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { Field, Input, Select, Textarea } from "@/components/dashboard/primitives";
import { saveCategoryAction } from "@/lib/actions/admin";
import type { Category } from "@/lib/types";

function statusValue(status?: string) {
  if (status === "Active") return "ACTIVE";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
}

export function CategoryForm({ category }: { category?: Category }) {
  const backHref = "/admin/categories";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCategoryAction)}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label="Name">
        <Input name="name" defaultValue={category?.name} placeholder="Monthly" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Slug">
          <Input name="slug" defaultValue={category?.slug} placeholder="monthly" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(category?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Delivery days" hint="Every package in this category uses this duration.">
          <Input
            name="deliveryDayCount"
            type="number"
            min="1"
            defaultValue={category?.deliveryDayCount ?? 20}
            required
          />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input
            type="checkbox"
            name="requiresVerification"
            defaultChecked={category?.requiresVerification}
            className="size-4 accent-saffron"
          />
          Student / military verification required
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Delivery charge (USD)"
          hint="Charged once per order for packages in this category. Leave blank to use the global delivery charge."
        >
          <Input
            name="deliveryCharge"
            type="number"
            min="0"
            max="999"
            step="0.01"
            defaultValue={category?.deliveryCharge ?? ""}
            placeholder="Global charge"
          />
        </Field>
        <Field label="Sort order">
          <Input name="sortOrder" type="number" min="0" defaultValue="0" />
        </Field>
      </div>
      <Field label="Description">
        <Textarea name="description" defaultValue={category?.description} placeholder="Full-month tiffin plans." />
      </Field>
      <FormActions
        pending={pending}
        backHref={backHref}
        submitLabel={category ? "Save category" : "Create category"}
      />
    </form>
  );
}

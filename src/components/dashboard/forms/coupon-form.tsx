"use client";

import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { Field, Input, Select } from "@/components/dashboard/primitives";
import { saveCouponAction } from "@/lib/actions/admin";
import type { AdminCustomerOption, Coupon } from "@/lib/types";

export function CouponForm({
  coupon,
  customers,
}: {
  coupon?: Coupon;
  customers: AdminCustomerOption[];
}) {
  const backHref = "/admin/offers";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCouponAction)}>
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <Field label="Code">
        <Input name="code" defaultValue={coupon?.code} placeholder="WELCOME15" className="uppercase" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Discount type">
          <Select name="type" defaultValue={coupon?.type === "Flat" ? "FLAT" : "PERCENT"}>
            <option value="PERCENT">Percentage</option>
            <option value="FLAT">Flat amount</option>
          </Select>
        </Field>
        <Field label="Value">
          <Input name="value" type="number" step="0.01" min="0" defaultValue={coupon?.value} placeholder="15" required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Usage limit">
          <Input name="usageLimit" type="number" min="1" defaultValue={coupon?.limit || ""} placeholder="500" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={coupon?.status === "Active" ? "ACTIVE" : "DRAFT"}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft / scheduled</option>
          </Select>
        </Field>
      </div>
      <Field label="Assign to customer" hint="Assigned coupons only work for that customer, once.">
        <Select name="customerId" defaultValue={coupon?.customerId ?? ""}>
          <option value="">Any customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.email})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Expires on">
        <Input name="expiresAt" type="date" defaultValue={coupon?.expiresAt} />
      </Field>
      <FormActions pending={pending} backHref={backHref} submitLabel={coupon ? "Save offer" : "Create offer"} />
    </form>
  );
}

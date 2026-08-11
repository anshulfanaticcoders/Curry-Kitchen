"use client";

import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { Field, Input, Select } from "@/components/dashboard/primitives";
import { saveDeliveryZoneAction } from "@/lib/actions/admin";
import type { DeliveryZoneRecord } from "@/lib/types";

function statusValue(status?: string) {
  if (status === "Active") return "ACTIVE";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
}

export function ZoneForm({ zone }: { zone?: DeliveryZoneRecord }) {
  const backHref = "/admin/settings";
  const { submit, pending } = useAdminFormSubmit(backHref);

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveDeliveryZoneAction)}>
      {zone ? <input type="hidden" name="id" value={zone.id} /> : null}
      <Field label="Zone name">
        <Input name="name" defaultValue={zone?.name} placeholder="Downtown San Diego Free Zone" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cities" hint="Comma separated. Leave blank for outside-zone fallback.">
          <Input name="cities" defaultValue={zone?.cities.join(", ")} placeholder="San Diego, Chula Vista" />
        </Field>
        <Field label="ZIP / postal codes" hint="Comma separated.">
          <Input name="postalCodes" defaultValue={zone?.postalCodes.join(", ")} placeholder="92101, 92093" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Delivery fee">
          <Input name="fee" type="number" step="0.01" min="0" defaultValue={zone?.fee ?? 0} required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(zone?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3">
        <label className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input type="hidden" name="isFreeDelivery" value="false" />
          <input type="checkbox" name="isFreeDelivery" value="true" defaultChecked={zone?.isFreeDelivery} className="size-4 accent-saffron" />
          Free delivery in this zone
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input type="hidden" name="outsideZone" value="false" />
          <input type="checkbox" name="outsideZone" value="true" defaultChecked={zone?.outsideZone} className="size-4 accent-saffron" />
          Use as outside-zone fallback fee
        </label>
      </div>
      <FormActions pending={pending} backHref={backHref} submitLabel={zone ? "Save zone" : "Create zone"} />
    </form>
  );
}

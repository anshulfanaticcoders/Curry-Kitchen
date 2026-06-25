"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Drawer, Tabs, Toggle } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteDeliveryZoneAction, saveDeliveryZoneAction } from "@/lib/actions/admin";
import type { DeliveryZoneRecord } from "@/lib/types";
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

function useSubmitAction() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return function submit(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => ActionResult,
    close?: () => void,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        close?.();
        router.refresh();
        return;
      }

      toast.error("Save failed", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  };
}

function GeneralTab() {
  return (
    <Card className="p-5">
      <CardHeader title="Business details" className="border-0 p-0" />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field label="Business name">
          <Input defaultValue="Curry Kitchen Inc." />
        </Field>
        <Field label="Support email">
          <Input defaultValue="info@currykitcheninc.com" />
        </Field>
        <Field label="Phone">
          <Input defaultValue="(858) 599-1613" />
        </Field>
        <Field label="Currency">
          <Select defaultValue="USD">
            <option>USD</option>
          </Select>
        </Field>
        <Field label="Service areas" className="md:col-span-2">
          <Input defaultValue="Fremont, San Jose, Milpitas" />
        </Field>
      </div>
    </Card>
  );
}

function DeliveryRulesTab() {
  return (
    <Card className="p-5">
      <CardHeader title="Delivery & ordering" className="border-0 p-0" />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Field label="Delivery window start">
          <Input type="time" defaultValue="18:00" />
        </Field>
        <Field label="Delivery window end">
          <Input type="time" defaultValue="20:00" />
        </Field>
        <Field label="Order cut-off">
          <Select defaultValue="Noon">
            <option>9:00 AM</option>
            <option>Noon</option>
            <option>3:00 PM</option>
          </Select>
        </Field>
        <Field label="Delivery days">
          <Input defaultValue="Monday - Friday" />
        </Field>
      </div>
      <div className="mt-5 grid gap-3">
        <Toggle label="Accept weekly trials" description="Allow new customers to start with a 1-week plan." defaultChecked />
        <Toggle label="Enable checkout pauses" description="Let customers request the one allowed self-pause." defaultChecked />
      </div>
    </Card>
  );
}

function ZoneForm({ zone, close }: { zone?: DeliveryZoneRecord; close: () => void }) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveDeliveryZoneAction, close)}>
      {zone ? <input type="hidden" name="id" value={zone.id} /> : null}
      <Field label="Zone name">
        <Input name="name" defaultValue={zone?.name} placeholder="Fremont Free Zone" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cities" hint="Comma separated. Leave blank for outside-zone fallback.">
          <Input name="cities" defaultValue={zone?.cities.join(", ")} placeholder="Fremont, San Jose" />
        </Field>
        <Field label="ZIP / postal codes" hint="Comma separated.">
          <Input name="postalCodes" defaultValue={zone?.postalCodes.join(", ")} placeholder="94538, 95112" />
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
          <input type="checkbox" name="isFreeDelivery" value="true" defaultChecked={zone?.isFreeDelivery} className="size-4 accent-[#ff7a1a]" />
          Free delivery in this zone
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input type="hidden" name="outsideZone" value="false" />
          <input type="checkbox" name="outsideZone" value="true" defaultChecked={zone?.outsideZone} className="size-4 accent-[#ff7a1a]" />
          Use as outside-zone fallback fee
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">
          <Loader2 className="hidden animate-spin" size={18} />
          {zone ? "Save zone" : "Create zone"}
        </Button>
      </div>
    </form>
  );
}

function DeliveryZonesTab({ zones }: { zones: DeliveryZoneRecord[] }) {
  return (
    <Card>
      <CardHeader
        title="Delivery zones"
        description="Checkout uses city/ZIP to apply free delivery, zone fees, or the outside-zone charge."
        action={
          <Drawer
            title="Add delivery zone"
            description="Create a free, paid, or outside-zone fallback area."
            trigger={({ open }) => (
              <Button onClick={open} className="h-10 px-4">
                <Plus size={16} />
                Add zone
              </Button>
            )}
          >
            {({ close }) => <ZoneForm close={close} />}
          </Drawer>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Zone</Th>
            <Th>Cities</Th>
            <Th>ZIP codes</Th>
            <Th>Fee</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone.id} className="transition hover:bg-ivory/60">
              <Td>
                <p className="font-extrabold">{zone.name}</p>
                {zone.outsideZone ? <p className="text-xs font-bold text-masala">Outside-zone fallback</p> : null}
              </Td>
              <Td className="max-w-xs text-ink/60">{zone.cities.length ? zone.cities.join(", ") : "-"}</Td>
              <Td className="max-w-xs text-ink/60">{zone.postalCodes.length ? zone.postalCodes.join(", ") : "-"}</Td>
              <Td className="font-black">{zone.isFreeDelivery ? "Free" : formatCurrency(zone.fee)}</Td>
              <Td>
                <StatusPill tone={statusTone(zone.status)}>{zone.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Drawer
                    title="Edit delivery zone"
                    description={zone.name}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Edit ${zone.name}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => <ZoneForm zone={zone} close={close} />}
                  </Drawer>
                  <ConfirmActionButton
                    label={`Delete ${zone.name}`}
                    title={`Archive ${zone.name}?`}
                    description="Checkout will stop using this delivery rule. Existing orders keep their saved fee."
                    confirmLabel="Archive"
                    action={() => deleteDeliveryZoneAction(zone.id)}
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

function NotificationsTab() {
  return (
    <Card className="p-5">
      <CardHeader title="Notifications" className="border-0 p-0" />
      <div className="mt-5 grid gap-3">
        <Toggle label="Order confirmation emails" description="Send a receipt when an order is placed." defaultChecked />
        <Toggle label="Out-for-delivery SMS" description="Text customers when their tiffin leaves the kitchen." />
        <Toggle label="Weekly menu email" description="Email the new menu every Monday morning." defaultChecked />
      </div>
    </Card>
  );
}

export function AdminSettingsClient({ zones }: { zones: DeliveryZoneRecord[] }) {
  return (
    <div>
      <PageHeader title="Settings" description="Configure business details, delivery zones, and ordering rules." />
      <Tabs
        items={[
          { id: "general", label: "General", content: <GeneralTab /> },
          { id: "delivery", label: "Delivery rules", content: <DeliveryRulesTab /> },
          { id: "zones", label: `Delivery zones (${zones.length})`, content: <DeliveryZonesTab zones={zones} /> },
          { id: "notifications", label: "Notifications", content: <NotificationsTab /> },
        ]}
      />
    </div>
  );
}

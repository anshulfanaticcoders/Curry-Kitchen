"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Tabs, Toggle } from "@/components/dashboard/interactive";
import { Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteDeliveryZoneAction, saveAdminSettingsAction } from "@/lib/actions/admin";
import type { AdminSettings, DeliveryZoneRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Archived") return "red" as const;
  return "amber" as const;
}

function useSettingsSave() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveAdminSettingsAction(formData);
      if (result.ok) {
        toast.success(result.message ?? "Settings saved.");
        router.refresh();
        return;
      }

      toast.error("Settings could not be saved", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  }

  return { isPending, save };
}

function SettingsToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: keyof Pick<
    AdminSettings,
    | "acceptWeeklyTrials"
    | "enableCheckoutPauses"
    | "orderConfirmationEmails"
    | "packageReminderEmails"
    | "packageReminderSms"
    | "packageCompletedEmails"
    | "outForDeliverySms"
    | "weeklyMenuEmails"
  >;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Toggle
        key={`${name}-${checked}`}
        label={label}
        description={description}
        defaultChecked={checked}
        onCheckedChange={setChecked}
      />
    </>
  );
}

function GeneralTab({ settings }: { settings: AdminSettings }) {
  const { isPending, save } = useSettingsSave();

  return (
    <form onSubmit={save}>
      <Card className="p-5">
        <CardHeader title="Business details" className="border-0 p-0" />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Business name"><Input name="businessName" defaultValue={settings.businessName} required /></Field>
          <Field label="Support email"><Input name="supportEmail" type="email" defaultValue={settings.supportEmail} required /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={settings.phone} required /></Field>
          <Field label="Currency"><Select name="currency" defaultValue={settings.currency}><option value="USD">USD</option><option value="CAD">CAD</option><option value="INR">INR</option></Select></Field>
          <Field label="Tax rate (%)" hint="One rate for every package at checkout."><Input name="taxRate" type="number" step="0.01" min="0" max="100" defaultValue={(settings.taxRate * 100).toFixed(2)} required /></Field>
          <Field label="Service areas" className="md:col-span-2"><Input name="serviceAreas" defaultValue={settings.serviceAreas} required /></Field>
        </div>
        <div className="mt-6 flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" size={16} /> : null}{isPending ? "Saving…" : "Save business details"}</Button></div>
      </Card>
    </form>
  );
}

function DeliveryRulesTab({ settings }: { settings: AdminSettings }) {
  const { isPending, save } = useSettingsSave();

  return (
    <form onSubmit={save}>
      <Card className="p-5">
        <CardHeader title="Delivery & ordering" className="border-0 p-0" />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Delivery window start"><Input name="deliveryWindowStart" type="time" defaultValue={settings.deliveryWindowStart} required /></Field>
          <Field label="Delivery window end"><Input name="deliveryWindowEnd" type="time" defaultValue={settings.deliveryWindowEnd} required /></Field>
          <Field label="Order cut-off"><Select name="orderCutoff" defaultValue={settings.orderCutoff}><option>9:00 AM</option><option>Noon</option><option>3:00 PM</option></Select></Field>
          <Field label="Delivery days"><Input name="deliveryDays" defaultValue={settings.deliveryDays} required /></Field>
        </div>
        <div className="mt-5 grid gap-3">
          <SettingsToggle name="acceptWeeklyTrials" label="Accept weekly trials" description="Allow new customers to start with a 1-week plan." defaultChecked={settings.acceptWeeklyTrials} />
          <SettingsToggle name="enableCheckoutPauses" label="Enable checkout pauses" description="Let customers request the one allowed self-pause." defaultChecked={settings.enableCheckoutPauses} />
        </div>
        <div className="mt-6 flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" size={16} /> : null}{isPending ? "Saving…" : "Save delivery rules"}</Button></div>
      </Card>
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
          <ButtonLink href="/admin/settings/zones/new" className="h-10 px-4">
            <Plus size={16} />
            Add zone
          </ButtonLink>
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
          {zones.length === 0 ? (
            <tr><Td colSpan={6}><EmptyState title="No delivery zones yet" description="Add a zone or an outside-zone fallback before accepting delivery orders." /></Td></tr>
          ) : zones.map((zone) => (
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
                  <Link
                    href={`/admin/settings/zones/${zone.id}/edit`}
                    aria-label={`Edit ${zone.name}`}
                    className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                  >
                    <Pencil size={16} />
                  </Link>
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

function NotificationsTab({ settings }: { settings: AdminSettings }) {
  const { isPending, save } = useSettingsSave();

  return (
    <form onSubmit={save}>
      <Card className="p-5">
        <CardHeader title="Notifications" className="border-0 p-0" />
        <div className="mt-5 grid gap-3">
          <SettingsToggle name="orderConfirmationEmails" label="Order confirmation emails" description="Send a receipt when an order is placed." defaultChecked={settings.orderConfirmationEmails} />
          <SettingsToggle name="packageReminderEmails" label="Package completion reminder email" description="Email customers before the final few deliveries." defaultChecked={settings.packageReminderEmails} />
          <SettingsToggle name="packageReminderSms" label="Package completion reminder SMS" description="Text customers before the package finishes." defaultChecked={settings.packageReminderSms} />
          <SettingsToggle name="packageCompletedEmails" label="Package completed email" description="Send a completion message with a buy-again link." defaultChecked={settings.packageCompletedEmails} />
          <SettingsToggle name="outForDeliverySms" label="Out-for-delivery SMS" description="Text customers when their tiffin leaves the kitchen." defaultChecked={settings.outForDeliverySms} />
          <SettingsToggle name="weeklyMenuEmails" label="Weekly menu email" description="Email the new menu every Monday morning." defaultChecked={settings.weeklyMenuEmails} />
        </div>
        <div className="mt-6 flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" size={16} /> : null}{isPending ? "Saving…" : "Save notification settings"}</Button></div>
      </Card>
    </form>
  );
}

export function AdminSettingsClient({ zones, settings }: { zones: DeliveryZoneRecord[]; settings: AdminSettings }) {
  return (
    <div>
      <PageHeader title="Settings" description="Configure business details, delivery zones, and ordering rules." />
      <Tabs
        items={[
          { id: "general", label: "General", content: <GeneralTab settings={settings} /> },
          { id: "delivery", label: "Delivery rules", content: <DeliveryRulesTab settings={settings} /> },
          { id: "zones", label: `Delivery zones (${zones.length})`, content: <DeliveryZonesTab zones={zones} /> },
          { id: "notifications", label: "Notifications", content: <NotificationsTab settings={settings} /> },
        ]}
      />
    </div>
  );
}

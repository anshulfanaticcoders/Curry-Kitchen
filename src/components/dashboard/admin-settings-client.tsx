"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, Toggle } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { saveAdminSettingsAction } from "@/lib/actions/admin";
import type { AdminSettings } from "@/lib/types";

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
    | "maintenanceMode"
    | "deliveryChargeEnabled"
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
    <>
      <form onSubmit={save}>
        <Card className="mb-5 border-masala/20 bg-rose/55 p-5">
          <CardHeader
            title="Site availability"
            description="Pause the public site during updates. The admin panel and sign-in page remain available."
            className="border-0 p-0"
          />
          <div className="mt-5">
            <SettingsToggle
              name="maintenanceMode"
              label="Maintenance mode"
              description="Show a maintenance screen to visitors and customers, and prevent new checkout or registration requests."
              defaultChecked={settings.maintenanceMode}
            />
          </div>
          <div className="mt-6 flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" size={16} /> : null}{isPending ? "Saving…" : "Save site availability"}</Button></div>
        </Card>
      </form>
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
    </>
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
          <Field label="Custom package: monthly delivery days" hint="Days billed for a custom monthly plan."><Input name="customMonthlyDays" type="number" min="1" max="60" step="1" defaultValue={settings.customMonthlyDays} required /></Field>
          <Field label="Flat delivery charge (USD)" hint="Default applied once per complete order. Categories with their own delivery charge override this amount."><Input name="deliveryCharge" type="number" min="0" max="999" step="0.01" defaultValue={settings.deliveryCharge.toFixed(2)} required /></Field>
          <Field label="Checkout delivery note" hint="Optional message customers see beside the delivery charge." className="md:col-span-2"><Textarea name="deliveryChargeNote" maxLength={240} defaultValue={settings.deliveryChargeNote} placeholder="A flat delivery charge applies once to each order." /></Field>
        </div>
        <div className="mt-5 grid gap-3">
          <SettingsToggle name="deliveryChargeEnabled" label="Charge delivery" description="Apply the flat delivery charge to every order, regardless of ZIP code or package count." defaultChecked={settings.deliveryChargeEnabled} />
          <SettingsToggle name="acceptWeeklyTrials" label="Accept weekly trials" description="Allow new customers to start with a 1-week plan." defaultChecked={settings.acceptWeeklyTrials} />
          <SettingsToggle name="enableCheckoutPauses" label="Enable checkout pauses" description="Let customers request the one allowed self-pause." defaultChecked={settings.enableCheckoutPauses} />
        </div>
        <div className="mt-6 flex justify-end"><Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" size={16} /> : null}{isPending ? "Saving…" : "Save delivery rules"}</Button></div>
      </Card>
    </form>
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

export function AdminSettingsClient({ settings }: { settings: AdminSettings }) {
  return (
    <div>
      <PageHeader title="Settings" description="Configure business details, flat delivery charges, and ordering rules." />
      <Tabs
        items={[
          { id: "general", label: "General", content: <GeneralTab settings={settings} /> },
          { id: "delivery", label: "Delivery rules", content: <DeliveryRulesTab settings={settings} /> },
          { id: "notifications", label: "Notifications", content: <NotificationsTab settings={settings} /> },
        ]}
      />
    </div>
  );
}

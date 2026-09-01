"use client";

import { CalendarOff, CalendarX2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import {
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { cancelBusinessHolidayAction, createBusinessHolidayAction } from "@/lib/actions/admin";
import type { AdminBusinessHoliday } from "@/lib/types";

export function AdminHolidaysClient({
  holidays,
  earliestDate,
}: {
  holidays: AdminBusinessHoliday[];
  earliestDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function createHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createBusinessHolidayAction(formData);
      if (result.ok) {
        toast.success("Kitchen holiday added", { description: result.message });
        form.reset();
        router.refresh();
      } else {
        toast.error("Holiday could not be added", { description: result.error });
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Delivery holidays"
        description="Close the kitchen for selected dates and automatically credit every affected customer delivery."
      />

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Add kitchen holiday"
          description="Affected delivery days move to the end of each package and never consume a customer pause."
          className="border-0 p-0"
        />
        <form onSubmit={createHoliday} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Holiday name" className="md:col-span-2">
            <Input name="name" placeholder="Labor Day kitchen closure" maxLength={120} required />
          </Field>
          <Field label="Closed from">
            <Input name="startDate" type="date" min={earliestDate} required />
          </Field>
          <Field label="Closed until">
            <Input name="endDate" type="date" min={earliestDate} required />
          </Field>
          <Field label="Customer note (optional)" className="md:col-span-2">
            <Textarea name="note" maxLength={500} placeholder="The kitchen will be closed for the holiday." />
          </Field>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              {pending ? "Crediting deliveries" : "Add holiday"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Holiday history" description="Active closures and the delivery credits created for them." />
        {holidays.length ? (
          <Table>
            <thead>
              <tr><Th>Holiday</Th><Th>Dates</Th><Th>Credits</Th><Th>Status</Th><Th className="text-right">Action</Th></tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <Td>
                    <p className="font-extrabold">{holiday.name}</p>
                    {holiday.note ? <p className="mt-1 max-w-sm text-xs text-ink/50">{holiday.note}</p> : null}
                  </Td>
                  <Td className="font-bold text-ink/65">{holiday.startDate} – {holiday.endDate}</Td>
                  <Td>
                    <p className="font-extrabold">{holiday.creditedDeliveries} deliveries</p>
                    <p className="text-xs text-ink/50">{holiday.affectedPackages} packages</p>
                  </Td>
                  <Td><span className={holiday.status === "Active" ? "text-leaf" : "text-ink/45"}>{holiday.status}</span></Td>
                  <Td className="text-right">
                    {holiday.status === "Active" ? (
                      <ConfirmActionButton
                        label={`Cancel ${holiday.name}`}
                        title={`Cancel ${holiday.name}?`}
                        description="Future original deliveries will be restored and unused replacement days removed. A holiday that has started cannot be reversed automatically."
                        confirmLabel="Cancel holiday"
                        icon={<CalendarX2 size={17} />}
                        action={() => cancelBusinessHolidayAction(holiday.id)}
                      />
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title="No delivery holidays"
            description="Add the first closure above. Customer schedules remain unchanged until a holiday is saved."
            action={<CalendarOff className="text-saffron" size={28} />}
          />
        )}
      </Card>
    </div>
  );
}

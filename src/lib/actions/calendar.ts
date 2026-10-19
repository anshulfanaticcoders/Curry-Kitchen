"use server";

import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/action-result";
import { calendarChangeSchema } from "@/lib/calendar-management";
import type { CalendarChangeInput } from "@/lib/calendar-management-types";
import { applyCalendarChange, previewCalendarChange, requireCalendarAdmin } from "@/lib/server/calendar-management";

function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "P2034" || code === "P2002") return "Another calendar update happened at the same time. Refresh and preview again.";
  if (code === "P2021" || code === "P2022") return "Calendar management needs its database migration. Ask the site administrator to finish the update.";
  if (code?.startsWith("P")) return "The calendar could not be saved. No changes were applied. Please try again.";
  return error instanceof Error ? error.message : "Could not update the delivery calendar.";
}

export async function previewCalendarChangeAction(input: CalendarChangeInput) {
  try {
    await requireCalendarAdmin();
    const parsed = calendarChangeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Check the calendar change.");
    return ok(await previewCalendarChange(parsed.data));
  } catch (error) { return fail(errorMessage(error)); }
}

export async function applyCalendarChangeAction(input: CalendarChangeInput, fingerprint: string) {
  try {
    await requireCalendarAdmin();
    const parsed = calendarChangeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Check the calendar change.");
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) return fail("Preview the change before saving.");
    const result = await applyCalendarChange(parsed.data, fingerprint);
    for (const path of ["/admin", "/admin/customers", `/admin/customers/${result.customerId}`,
      `/admin/packing/${result.customerId}`, "/dashboard", "/dashboard/calendar", "/dashboard/orders", "/dashboard/notifications"]) revalidatePath(path);
    return ok(result, "Delivery calendar updated.");
  } catch (error) { return fail(errorMessage(error)); }
}

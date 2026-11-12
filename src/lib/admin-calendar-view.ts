import { canRestoreCalendarSchedule } from "@/lib/calendar-management";
import type { ManagedPackage } from "@/lib/calendar-management-types";
import type { CustomerCalendarData } from "@/lib/types";

export function formatCalendarDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`)) : "Not scheduled";
}

export function calendarPurchaseLabel(packages: ManagedPackage[], id?: string | null) {
  const item = packages.find((plan) => plan.id === id);
  if (!item) return "Previous purchase not recorded";
  const label = item.orderNumber ?? item.id;
  const order = item.orderId ?? item.orderNumber;
  if (!order) return label;
  const siblings = packages.filter((plan) => (plan.orderId ?? plan.orderNumber) === order)
    .sort((a, b) => a.id.localeCompare(b.id));
  return siblings.length > 1 ? `${label} / Item ${siblings.findIndex((plan) => plan.id === id) + 1}` : label;
}

export function calendarPackageEditable(item: ManagedPackage) {
  return item.paid && ["ACTIVE", "EXPIRED", "PAUSED"].includes(item.status)
    && !["CANCELLED", "DECLINED", "PENDING_PAYMENT"].includes(item.orderStatus ?? "")
    && !["PENDING", "REJECTED"].includes(item.verificationStatus ?? "");
}

export function calendarPackageStatus(item: ManagedPackage) {
  if (["CANCELLED", "DECLINED"].includes(item.orderStatus ?? "") || item.status === "CANCELLED") return "Cancelled";
  if (!item.paid || item.orderStatus === "PENDING_PAYMENT") return "Awaiting payment";
  if (item.verificationStatus === "REJECTED") return "Verification rejected";
  if (item.verificationStatus === "PENDING") return "Awaiting verification";
  if (canRestoreCalendarSchedule(item) || item.status === "PENDING_PAYMENT") return "Needs schedule review";
  if (item.status === "PENDING_STUDENT_VERIFICATION") return item.verificationStatus === "APPROVED" ? "Needs schedule review" : "Awaiting verification";
  return item.status === "EXPIRED" ? "Ended" : item.status === "PAUSED" ? "Paused" : "Active";
}

export function purchaseCalendar(data: CustomerCalendarData, item: ManagedPackage, pending = false): CustomerCalendarData {
  return { ...data,
    packages: data.packages.filter((plan) => plan.id === item.id).map((plan) => ({ ...plan, status: calendarPackageStatus(item) })),
    events: data.events.filter((event) => !event.packageId && !event.manualDeliveryId && event.type === "holiday"
      || event.packageId === item.id && Boolean(event.manualDeliveryId) === pending),
  };
}

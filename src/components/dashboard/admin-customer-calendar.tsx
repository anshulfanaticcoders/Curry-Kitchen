"use client";

import { AlertTriangle, ChevronDown, Clock3, Package, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { AdminOrderReceipt } from "@/components/dashboard/admin-order-receipt";
import { AdminPackageControl } from "@/components/dashboard/admin-package-control";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { calendarPackageEditable, calendarPackageStatus, calendarPurchaseLabel, formatCalendarDate, purchaseCalendar } from "@/lib/admin-calendar-view";
import type { AdminCalendarData } from "@/lib/calendar-management-types";
import type { CustomerCalendarData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminCustomerCalendar({ calendar, data }: { calendar: CustomerCalendarData; data: AdminCalendarData }) {
  const packages = [...data.state.packages].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") || b.id.localeCompare(a.id));
  const [selectedId, setSelectedId] = useState(() => packages.find((item) => calendarPackageStatus(item) === "Active")?.id ?? packages[0]?.id);
  const [renewalPending, setRenewalPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = packages.find((item) => item.id === selectedId) ?? packages[0];
  const reviewCount = packages.filter((item) => calendarPackageStatus(item) === "Needs schedule review").length;
  if (!selected) return <p className="border-y border-ink/15 py-8 text-sm text-ink/75">No packages have been purchased yet.</p>;
  const status = calendarPackageStatus(selected);
  const scoped = purchaseCalendar(calendar, selected, renewalPending);
  const initialDate = !renewalPending && selected.startDate && (status === "Needs schedule review" || data.today < selected.startDate || (selected.endDate && data.today > selected.endDate))
    ? selected.startDate : data.today;
  const pendingCount = data.state.manualDeliveries.filter((record) => record.sourcePackageId === selected.id
    && record.treatment === "AWAITING_RENEWAL" && !["CANCELLED", "DECLINED"].includes(record.status ?? "DELIVERED")).length;

  return <section className="min-w-0" aria-labelledby="purchases-heading">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="purchases-heading" className="font-display text-xl font-extrabold">Packages & deliveries <span className="ml-2 text-base font-medium text-ink/65">{packages.length} purchases</span></h2>
      {reviewCount ? <p role="status" className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle size={17} />{reviewCount} {reviewCount === 1 ? "schedule needs" : "schedules need"} review</p> : null}
    </div>
    <div className="mb-6 divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/15 bg-white" role="group" aria-label="Choose purchase">
      {packages.map((item) => {
        const progress = calendar.packages.find((plan) => plan.id === item.id);
        const state = calendarPackageStatus(item);
        return <button key={item.id} type="button" disabled={busy} aria-pressed={item.id === selected.id}
          onClick={() => { setSelectedId(item.id); setRenewalPending(false); }}
          className={cn("grid w-full min-w-0 gap-2 px-4 py-3 text-left text-sm transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:cursor-wait sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4",
            item.id === selected.id ? "bg-saffron/10" : "hover:bg-frost")}>
          <span className="min-w-0"><span className="flex items-start gap-2 font-bold"><Package size={17} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{item.name}</span><span className="ml-auto shrink-0 text-xs font-semibold">{item.quantity} tiffin{item.quantity === 1 ? "" : "s"}</span></span>
            <span className="mt-1 block break-all text-xs text-ink/75">{calendarPurchaseLabel(packages, item.id)}</span></span>
          <span className="min-w-0"><span className="block font-semibold">{formatCalendarDate(item.startDate)}{item.endDate ? ` - ${formatCalendarDate(item.endDate)}` : ""}</span>
            <span className="mt-1 block text-xs text-ink/75">{item.paid ? "Paid" : "Unpaid"} / {item.verificationStatus === "NOT_REQUIRED" ? "No ID required" : `ID: ${(item.verificationStatus ?? "PENDING").toLowerCase()}`}</span></span>
          <span className="flex items-center justify-between gap-2 sm:block sm:text-right"><span className={cn("font-bold", state === "Needs schedule review" ? "text-amber-900" : state === "Active" ? "text-basil" : "text-ink/80")}>{state}</span>
            <span className="mt-1 block text-xs text-ink/75">{progress?.completedDays ?? item.usedDeliveryDays} delivered / {progress?.remainingDays ?? Math.max(0, item.totalDeliveryDays - item.usedDeliveryDays)} remaining</span></span>
        </button>;
      })}
    </div>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="font-display text-xl font-extrabold">{selected.name}</h3>
        <p className="mt-1 break-all text-sm text-ink/75">{calendarPurchaseLabel(packages, selected.id)} / {formatCalendarDate(selected.startDate)} / {status}</p></div>
      <div className="flex flex-wrap gap-2">
        {selected.orderNumber ? <AdminOrderReceipt key={`receipt-${selected.id}`} orderNumber={selected.orderNumber} /> : null}
        {calendarPackageEditable(selected) && ["ACTIVE", "PAUSED"].includes(selected.status) ? <AdminPackageControl key={`controls-${selected.id}`}
          customer={{ activePackageId: selected.id, plan: `${selected.name} (${calendarPurchaseLabel(packages, selected.id)})`, status: selected.status === "PAUSED" ? "Paused" : "Active" }}
          allowReset={selected.pauses.some((pause) => ["ACTIVE", "APPROVED"].includes(pause.status) && pause.startDate > data.today)} /> : null}
      </div>
    </div>
    {selected.deliveryAddress?.length ? <p className="mb-3 text-sm leading-6 text-ink/85"><strong>Delivery address for this purchase: </strong>{selected.deliveryAddress.join(", ")}</p> : null}
    {selected.allergies || selected.foodPreferences ? <div className="mb-4 grid gap-3 border-y border-ink/15 py-3 text-sm leading-6 sm:grid-cols-2">
      {selected.allergies ? <p className="break-words font-semibold text-red-800"><ShieldAlert size={17} className="mr-2 inline" />Allergies: {selected.allergies}</p> : null}
      {selected.foodPreferences ? <p className="break-words text-ink/85"><strong>Dietary notes: </strong>{selected.foodPreferences}</p> : null}
    </div> : null}
    {calendarPackageEditable(selected) ? <details className="mb-4 border-b border-ink/10 pb-2" open={renewalPending || undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><Clock3 size={17} />Before renewal{pendingCount ? ` (${pendingCount} ${pendingCount === 1 ? "meal" : "meals"})` : ""}<ChevronDown size={15} className="ml-auto" /></summary>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-ink" checked={renewalPending} disabled={busy} onChange={(event) => setRenewalPending(event.target.checked)} />Record meals before renewal payment</label>
    </details> : null}
    <DashboardCalendar key={`${selected.id}-${renewalPending}`} data={scoped} adminData={data} adminPackageId={selected.id}
      renewalPending={renewalPending} initialDate={initialDate} busy={busy} onBusyChange={setBusy} />
  </section>;
}

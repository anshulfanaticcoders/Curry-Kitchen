import { Clock3 } from "lucide-react";
import { DEFAULT_DELIVERY_WINDOW, formatInputDate, formatOrderCutoff, type PackageScheduleAvailability } from "@/lib/package-schedule";
import { cn } from "@/lib/utils";

export function DeliveryPolicyNotice({ availability, tone = "light", className }: {
  availability: Pick<PackageScheduleAvailability, "orderCutoff" | "deliveryWindow" | "nextDayOrderingClosed"> & { earliestStartDate?: string };
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 border-y py-4 text-sm leading-6", tone === "dark" ? "border-white/15 text-ivory/80" : "border-ink/10 text-ink/75", className)}>
      <Clock3 size={20} aria-hidden="true" className="mt-1 shrink-0 text-saffron" />
      <div className="min-w-0">
        <p className={cn("font-extrabold", tone === "dark" ? "text-white" : "text-ink")}>Delivery: {availability.deliveryWindow ?? DEFAULT_DELIVERY_WINDOW} Pacific Time</p>
        <p>Order before {formatOrderCutoff(availability.orderCutoff)} Pacific Time for next-day delivery. At or after the cutoff, choose a later delivery day. Kitchen holidays and non-delivery days are excluded.</p>
        {availability.earliestStartDate ? (
          <p className={cn("mt-1 font-bold", tone === "dark" ? "text-saffron" : "text-masala")} aria-live="polite">
            {availability.nextDayOrderingClosed ? "Tomorrow's ordering is closed. " : ""}
            Earliest start: {formatInputDate(availability.earliestStartDate)}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

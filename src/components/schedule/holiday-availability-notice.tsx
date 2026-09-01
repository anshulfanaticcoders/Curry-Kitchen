import { CalendarOff } from "lucide-react";
import { formatInputDate, type PackageScheduleAvailability } from "@/lib/package-schedule";
import { cn } from "@/lib/utils";

export function HolidayAvailabilityNotice({
  availability,
  tone = "light",
  className,
}: {
  availability: PackageScheduleAvailability;
  tone?: "light" | "dark";
  className?: string;
}) {
  if (!availability.holidays.length) return null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        tone === "dark"
          ? "border-saffron/30 bg-saffron/10 text-ivory"
          : "border-saffron/30 bg-rose text-ink",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-button",
            tone === "dark" ? "bg-saffron text-ink" : "bg-saffron/18 text-masala",
          )}
        >
          <CalendarOff size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Upcoming kitchen closures</p>
          <div className="mt-2 grid gap-2">
            {availability.holidays.slice(0, 3).map((holiday) => (
              <div key={holiday.id} className="text-xs font-bold leading-5">
                <span className={tone === "dark" ? "text-saffron" : "text-masala"}>
                  {holiday.name}
                </span>
                {" · "}
                {formatInputDate(holiday.startDate)}–{formatInputDate(holiday.endDate)}
                {holiday.note ? (
                  <span className={tone === "dark" ? "text-ivory/58" : "text-ink/55"}>
                    {" · "}{holiday.note}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <p className={cn("mt-2 text-xs font-bold", tone === "dark" ? "text-ivory/58" : "text-ink/55")}>
            Start dates inside these closures are unavailable. Choose the next available delivery day.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPackageScheduleAvailability, type PackageScheduleAvailability } from "@/lib/package-schedule";

export function useLiveAvailability(initial: PackageScheduleAvailability) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setNow(new Date());
      // Align with clock boundaries, including the cutoff and Pacific midnight.
      timer = setTimeout(refresh, 60_000 - (Date.now() % 60_000) + 50);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return useMemo(
    () => now ? buildPackageScheduleAvailability({ ...initial, now }) : initial,
    [initial, now],
  );
}

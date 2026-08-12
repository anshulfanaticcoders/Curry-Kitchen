"use client";

import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestCustomerPauseAction, resumeCustomerPackageAction } from "@/lib/actions/customer";

export function CustomerPauseButton({
  packageId,
  canSelfPause,
  customerPauseUsed,
  status,
}: {
  packageId?: string;
  canSelfPause: boolean;
  customerPauseUsed: boolean;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isPaused = status === "Paused";
  const disabled = !packageId || pending || (!isPaused && !canSelfPause);
  const label = !packageId
    ? "No active package"
    : isPaused
      ? "Resume delivery"
      : customerPauseUsed
        ? "Pause already used"
        : status !== "Active"
          ? `Cannot pause: ${status}`
          : "Pause delivery";

  function handleClick() {
    if (disabled || !packageId) {
      return;
    }

    startTransition(async () => {
      const result = isPaused
        ? await resumeCustomerPackageAction(packageId)
        : await requestCustomerPauseAction(
            packageId,
            "Customer requested a one-time self pause from the dashboard.",
          );

      if (result.ok) {
        toast.success(result.message ?? (isPaused ? "Package resumed." : "Package paused."));
        router.refresh();
        return;
      }

      toast.error(isPaused ? "Resume failed" : "Pause request failed", {
        description: result.error ?? "Please contact admin about this package.",
      });
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={handleClick}
      className="w-full justify-start disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="animate-spin" size={18} />
      ) : isPaused ? (
        <PlayCircle size={18} />
      ) : (
        <PauseCircle size={18} />
      )}
      {pending ? (isPaused ? "Resuming" : "Pausing") : label}
    </Button>
  );
}

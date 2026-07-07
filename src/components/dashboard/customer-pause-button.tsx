"use client";

import { Loader2, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestCustomerPauseAction } from "@/lib/actions/customer";

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
  const disabled = !packageId || !canSelfPause || pending;
  const label = !packageId
    ? "No active package"
    : customerPauseUsed
      ? "Pause already used"
      : status !== "Active"
        ? `Cannot pause: ${status}`
        : "Pause delivery";

  function requestPause() {
    if (disabled || !packageId) {
      return;
    }

    startTransition(async () => {
      const result = await requestCustomerPauseAction(
        packageId,
        "Customer requested a one-time self pause from the dashboard.",
      );

      if (result.ok) {
        toast.success(result.message ?? "Package paused.");
        router.refresh();
        return;
      }

      toast.error("Pause request failed", {
        description: result.error ?? "Please contact admin to pause this package.",
      });
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={requestPause}
      className="w-full justify-start disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="animate-spin" size={18} /> : <PauseCircle size={18} />}
      {pending ? "Pausing" : label}
    </Button>
  );
}

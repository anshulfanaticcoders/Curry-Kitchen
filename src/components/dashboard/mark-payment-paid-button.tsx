"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { markPaymentPaidAction } from "@/lib/actions/admin";

export function MarkPaymentPaidButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markPaid() {
    startTransition(async () => {
      const result = await markPaymentPaidAction(paymentId);

      if (result.ok) {
        toast.success(result.message ?? "Payment marked as paid.");
        router.refresh();
        return;
      }

      toast.error("Payment update failed", {
        description: result.error ?? "Please try again.",
      });
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={markPaid}
      className="inline-flex items-center gap-1.5 rounded-button border border-leaf/30 bg-mint px-3 py-1.5 text-xs font-extrabold text-leaf transition hover:bg-leaf hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
      Mark paid
    </button>
  );
}

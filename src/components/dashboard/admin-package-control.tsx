"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { adminPausePackageAction, adminResumePackageAction } from "@/lib/actions/admin";
import type { Customer } from "@/lib/types";

export function AdminPackageControl({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (!customer.activePackageId) {
    return <p className="text-sm font-bold text-ink/50">No active package to manage.</p>;
  }

  const paused = customer.status === "Paused";

  return (
    <ConfirmActionButton
      label={paused ? "Resume package" : "Pause package"}
      title={paused ? `Resume ${customer.plan}?` : `Pause ${customer.plan}?`}
      description={
        paused
          ? "Deliveries will resume on the next eligible schedule."
          : "Pause this customer package until an admin resumes it."
      }
      confirmLabel={paused ? "Resume" : "Pause"}
      action={() =>
        new Promise((resolve) =>
          startTransition(async () => {
            const result = paused
              ? await adminResumePackageAction(customer.activePackageId!)
              : await adminPausePackageAction(customer.activePackageId!);
            if (result.ok) {
              toast.success(result.message ?? "Package updated.");
              router.refresh();
            } else {
              toast.error("Package could not be updated", { description: result.error });
            }
            resolve(result);
          }),
        )
      }
    />
  );
}

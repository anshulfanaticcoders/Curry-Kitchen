"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import {
  adminPausePackageAction,
  adminResetCustomerPauseAction,
  adminResumePackageAction,
} from "@/lib/actions/admin";
import type { Customer } from "@/lib/types";

type PackageControlCustomer = Pick<Customer, "activePackageId" | "plan" | "status">;

export function AdminPackageControl({ customer }: { customer: PackageControlCustomer }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (!customer.activePackageId) {
    return <p className="text-sm font-bold text-ink/50">No active package to manage.</p>;
  }

  const paused = customer.status === "Paused";

  return (
    <div className="flex flex-wrap gap-3">
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
      {!paused ? (
        <ConfirmActionButton
          label="Reset customer pause"
          title="Reset the customer's scheduled pause?"
          description="Restores the original delivery days, removes the make-up days from the end, and lets the customer schedule their one-time pause again. Only works before the pause starts."
          confirmLabel="Reset pause"
          action={() =>
            new Promise((resolve) =>
              startTransition(async () => {
                const result = await adminResetCustomerPauseAction(customer.activePackageId!);
                if (result.ok) {
                  toast.success(result.message ?? "Pause reset.");
                  router.refresh();
                } else {
                  toast.error("Pause could not be reset", { description: result.error });
                }
                resolve(result);
              }),
            )
          }
        />
      ) : null}
    </div>
  );
}

"use client";

import { Check, ExternalLink, GraduationCap, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/dashboard/primitives";
import { StatusPill } from "@/components/ui/status-pill";
import {
  approveStudentVerificationAction,
  rejectStudentVerificationAction,
} from "@/lib/actions/admin";
import type { AdminStudentVerification } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusTone(status: AdminStudentVerification["status"]) {
  if (status === "APPROVED") return "green" as const;
  if (status === "PENDING") return "amber" as const;
  if (status === "REJECTED") return "red" as const;
  return "ink" as const;
}

function statusLabel(status: AdminStudentVerification["status"]) {
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING") return "Pending review";
  if (status === "REJECTED") return "Rejected";
  return "Not required";
}

function VerificationCard({ verification }: { verification: AdminStudentVerification }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(result.message ?? "Verification updated.");
        setRejecting(false);
        setNote("");
        router.refresh();
        return;
      }

      toast.error("Verification update failed", {
        description: result.error ?? "Please try again.",
      });
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={statusTone(verification.status)}>
              {statusLabel(verification.status)}
            </StatusPill>
            <StatusPill tone="ink">
              {verification.verificationType === "MILITARY" ? "Military" : "Student"}
            </StatusPill>
            {verification.orderNumber ? (
              <span className="text-xs font-black text-ink/45">#{verification.orderNumber}</span>
            ) : null}
          </div>
          <p className="mt-3 font-extrabold">{verification.customerName}</p>
          <p className="text-xs font-bold text-ink/45">{verification.customerEmail}</p>
          <div className="mt-3 grid gap-1 text-sm font-bold text-ink/70">
            <p>
              <span className="text-ink/45">
                {verification.verificationType === "MILITARY"
                  ? "Branch / organization:"
                  : "University / school:"}
              </span>{" "}
              {verification.universityName}
            </p>
            <p>
              <span className="text-ink/45">
                {verification.verificationType === "MILITARY"
                  ? "Service / DoD ID number:"
                  : "Student ID / roll number:"}
              </span>{" "}
              {verification.studentNumber}
            </p>
            <p className="text-xs font-bold text-ink/45">
              Submitted {verification.submittedAt}
              {verification.reviewedAt ? ` - reviewed ${verification.reviewedAt}` : ""}
            </p>
          </div>
          {verification.adminNote ? (
            <p className="mt-2 rounded-lg bg-rose px-3 py-2 text-xs font-bold text-masala">
              Note: {verification.adminNote}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {verification.idCardUrl ? (
            <a
              href={verification.idCardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-button border border-ink/10 px-3 py-2 text-xs font-extrabold text-ink/70 transition hover:border-saffron/50 hover:text-ink"
            >
              <ExternalLink size={14} />
              View ID front
            </a>
          ) : (
            <span className="text-xs font-bold text-ink/40">No ID front uploaded</span>
          )}
          {verification.idCardBackUrl ? (
            <a
              href={verification.idCardBackUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-button border border-ink/10 px-3 py-2 text-xs font-extrabold text-ink/70 transition hover:border-saffron/50 hover:text-ink"
            >
              <ExternalLink size={14} />
              View ID back
            </a>
          ) : (
            <span className="text-xs font-bold text-ink/40">No ID back uploaded</span>
          )}
        </div>
      </div>

      {verification.status === "PENDING" ? (
        <div className="mt-4 border-t border-ink/10 pt-4">
          {rejecting ? (
            <div className="grid gap-3">
              <label className="grid gap-2 text-xs font-extrabold text-ink/70">
                Reason shared with the customer (optional)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-20 rounded-button border border-ink/10 bg-ivory px-3 py-2 text-sm font-medium outline-none transition focus:border-masala"
                  placeholder="ID unreadable, expired, name mismatch..."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction(() =>
                      rejectStudentVerificationAction(verification.id, note.trim() || undefined),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-button border border-masala/40 bg-rose px-3 py-2 text-xs font-extrabold text-masala transition hover:bg-masala hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
                  Confirm rejection
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setRejecting(false)}
                  className="rounded-button border border-ink/10 px-3 py-2 text-xs font-extrabold text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => runAction(() => approveStudentVerificationAction(verification.id))}
                className="inline-flex items-center gap-2 rounded-button border border-leaf/30 bg-mint px-3 py-2 text-xs font-extrabold text-leaf transition hover:bg-leaf hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                Approve & activate packages
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRejecting(true)}
                className="inline-flex items-center gap-2 rounded-button border border-ink/10 px-3 py-2 text-xs font-extrabold text-ink/60 transition hover:border-masala/40 hover:text-masala"
              >
                <X size={15} />
                Reject
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function AdminStudentsClient({
  verifications,
}: {
  verifications: AdminStudentVerification[];
}) {
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const visible =
    filter === "PENDING"
      ? verifications.filter((verification) => verification.status === "PENDING")
      : verifications;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { key: "PENDING", label: "Pending review" },
            { key: "ALL", label: "All submissions" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-extrabold transition",
              filter === tab.key
                ? "border-ink bg-ink text-ivory"
                : "border-ink/10 bg-white text-ink/60 hover:border-saffron/50 hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="grid gap-4">
          {visible.map((verification) => (
            <VerificationCard key={verification.id} verification={verification} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <GraduationCap className="mx-auto text-masala" size={30} />
          <p className="mt-3 font-display text-xl font-black">
            {filter === "PENDING" ? "No verifications waiting" : "No submissions yet"}
          </p>
          <p className="mt-1 text-sm font-bold text-ink/50">
            Student and military ID submissions from checkout appear here for review.
          </p>
        </Card>
      )}
    </div>
  );
}

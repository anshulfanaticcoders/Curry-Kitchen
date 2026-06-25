"use client";

import { Check, Loader2, RotateCcw, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Tabs } from "@/components/dashboard/interactive";
import { Card } from "@/components/dashboard/primitives";
import { StatusPill } from "@/components/ui/status-pill";
import {
  archiveReviewAction,
  moveReviewToPendingAction,
  publishReviewAction,
} from "@/lib/actions/admin";
import type { ReviewItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "Published") return "green" as const;
  if (status === "Pending") return "amber" as const;
  return "red" as const;
}

function ReviewActionButton({
  label,
  tone = "neutral",
  icon,
  onClick,
}: {
  label: string;
  tone?: "neutral" | "good" | "danger";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(onClick)}
      className={cn(
        "inline-flex items-center gap-2 rounded-button border px-3 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60",
        tone === "good" && "border-leaf/30 bg-mint text-leaf hover:bg-leaf hover:text-white",
        tone === "danger" && "border-ink/10 text-ink/60 hover:border-masala/40 hover:text-masala",
        tone === "neutral" && "border-ink/10 text-ink/60 hover:border-saffron/50 hover:text-ink",
      )}
    >
      {pending ? <Loader2 className="animate-spin" size={15} /> : icon}
      {pending ? "Saving" : label}
    </button>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const router = useRouter();

  async function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    const result = await action();

    if (result.ok) {
      toast.success(result.message ?? "Review updated.");
      router.refresh();
      return;
    }

    toast.error("Review update failed", {
      description: result.error ?? "Please try again.",
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-extrabold">{review.name}</p>
          <p className="text-xs font-bold text-ink/45">
            {review.plan} - {review.date}
          </p>
        </div>
        <StatusPill tone={statusTone(review.status)}>{review.status}</StatusPill>
      </div>
      <div className="mt-3 flex items-center gap-1 text-saffron">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={15}
            fill={index < review.rating ? "currentColor" : "none"}
            className={cn(index >= review.rating && "text-ink/20")}
          />
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/72">&ldquo;{review.text}&rdquo;</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {review.status !== "Published" ? (
          <ReviewActionButton
            label="Publish"
            tone="good"
            icon={<Check size={15} />}
            onClick={() => {
              void runAction(() => publishReviewAction(review.id));
            }}
          />
        ) : (
          <ReviewActionButton
            label="Unpublish"
            icon={<RotateCcw size={15} />}
            onClick={() => {
              void runAction(() => moveReviewToPendingAction(review.id));
            }}
          />
        )}
        {review.status === "Spam" ? (
          <ReviewActionButton
            label="Restore"
            icon={<RotateCcw size={15} />}
            onClick={() => {
              void runAction(() => moveReviewToPendingAction(review.id));
            }}
          />
        ) : (
          <ConfirmActionButton
            label="Remove"
            title={`Remove ${review.name}'s review?`}
            description="The review will leave the public site and move to the removed list. It can be restored later."
            confirmLabel="Remove"
            icon={<Trash2 size={15} />}
            className="inline-flex h-9 w-auto place-items-center gap-2 px-3 py-2 text-xs font-extrabold"
            action={() => archiveReviewAction(review.id)}
          />
        )}
      </div>
    </Card>
  );
}

function ReviewGrid({ reviews }: { reviews: ReviewItem[] }) {
  if (!reviews.length) {
    return (
      <Card className="p-10 text-center text-sm font-bold text-ink/45">
        No reviews in this state.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

export function AdminReviewsClient({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <Tabs
      items={[
        { id: "all", label: `All (${reviews.length})`, content: <ReviewGrid reviews={reviews} /> },
        {
          id: "pending",
          label: `Pending (${reviews.filter((review) => review.status === "Pending").length})`,
          content: <ReviewGrid reviews={reviews.filter((review) => review.status === "Pending")} />,
        },
        {
          id: "published",
          label: `Published (${reviews.filter((review) => review.status === "Published").length})`,
          content: <ReviewGrid reviews={reviews.filter((review) => review.status === "Published")} />,
        },
        {
          id: "spam",
          label: `Removed (${reviews.filter((review) => review.status === "Spam").length})`,
          content: <ReviewGrid reviews={reviews.filter((review) => review.status === "Spam")} />,
        },
      ]}
    />
  );
}

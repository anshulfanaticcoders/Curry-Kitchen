import { Star } from "lucide-react";
import { AdminReviewsClient } from "@/components/dashboard/admin-reviews-client";
import { PageHeader, StatCard } from "@/components/dashboard/primitives";
import { getAdminReviews } from "@/lib/server/catalog";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  const published = reviews.filter((review) => review.status === "Published").length;
  const pending = reviews.filter((review) => review.status === "Pending").length;
  const avg = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer reviews before they appear on the site." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Average rating" value={avg} tone="good" icon={<Star size={20} />} />
        <StatCard label="Published" value={String(published)} />
        <StatCard label="Pending moderation" value={String(pending)} tone="watch" />
      </div>
      <AdminReviewsClient reviews={reviews} />
    </div>
  );
}

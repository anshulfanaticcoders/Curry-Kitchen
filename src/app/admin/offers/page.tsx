import { AdminOffersClient } from "@/components/dashboard/admin-offers-client";
import { getAdminCouponManagerData } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const coupons = await getAdminCouponManagerData();

  return <AdminOffersClient coupons={coupons} />;
}

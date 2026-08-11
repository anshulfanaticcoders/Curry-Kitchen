import { notFound } from "next/navigation";
import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CouponForm } from "@/components/dashboard/forms/coupon-form";
import { getAdminCouponManagerData, getAdminCustomerOptions } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [coupons, customers] = await Promise.all([
    getAdminCouponManagerData(),
    getAdminCustomerOptions(),
  ]);
  const coupon = coupons.find((candidate) => candidate.id === id);

  if (!coupon) notFound();

  return (
    <AdminFormShell
      backHref="/admin/offers"
      backLabel="Back to offers"
      title={`Edit ${coupon.code}`}
    >
      <CouponForm coupon={coupon} customers={customers} />
    </AdminFormShell>
  );
}

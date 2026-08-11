import { AdminFormShell } from "@/components/dashboard/form-utils";
import { CouponForm } from "@/components/dashboard/forms/coupon-form";
import { getAdminCustomerOptions } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  const customers = await getAdminCustomerOptions();

  return (
    <AdminFormShell
      backHref="/admin/offers"
      backLabel="Back to offers"
      title="Create offer"
      description="Set up a new discount code."
    >
      <CouponForm customers={customers} />
    </AdminFormShell>
  );
}

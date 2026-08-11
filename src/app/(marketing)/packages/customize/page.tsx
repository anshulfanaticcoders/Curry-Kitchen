import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackageCustomizer } from "@/components/sections/package-customizer";
import { parsePackageCart } from "@/lib/package-cart";
import { getPackagePlans } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customize package", robots: { index: false, follow: false } };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CustomizePackagePage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string | string[];
    cart?: string | string[];
    edit?: string | string[];
    startDate?: string | string[];
  }>;
}) {
  const [params, plans] = await Promise.all([searchParams, getPackagePlans()]);
  const planId = firstValue(params.plan);
  const cartItems = parsePackageCart(firstValue(params.cart));
  const editLineId = firstValue(params.edit);
  const plan = plans.find((candidate) => candidate.id === planId);

  if (!plan) redirect("/packages#build-plan");

  const editItem = editLineId
    ? cartItems.find((item) => item.lineId === editLineId)
    : undefined;

  return (
    <main>
      <PackageCustomizer
        plan={plan}
        plans={plans}
        initialCartItems={cartItems}
        initialEditLineId={editItem?.lineId}
        initialStartDate={firstValue(params.startDate) ?? editItem?.startDate}
        initialAddonIds={editItem?.addonIds}
      />
    </main>
  );
}

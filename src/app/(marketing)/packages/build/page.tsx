import type { Metadata } from "next";
import { CustomPackageBuilder } from "@/components/sections/custom-package-builder";
import { PageHero } from "@/components/sections/page-hero";
import { deliveryWeekdaysFromText } from "@/lib/business-rules";
import { getAdminSettings } from "@/lib/server/admin";
import { getCustomPackageItems } from "@/lib/server/catalog";
import { getMarketingMetadata } from "@/lib/server/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/packages/build");
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BuildPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const [params, customItems, adminSettings] = await Promise.all([
    searchParams,
    getCustomPackageItems(),
    getAdminSettings(),
  ]);

  return (
    <main>
      <PageHero
        eyebrow="Custom package"
        title="Build a tiffin around your appetite."
        image="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1400&q=80"
        imageAlt="Indian thali with roti, rice, dal and sabzi"
        chips={["Pay per portion", "Weekly or monthly", "Same morning delivery"]}
      >
        Pick the exact portions you want. We price each item per unit, then multiply by the
        number of delivery days in your plan.
      </PageHero>
      <CustomPackageBuilder
        items={customItems}
        config={{
          customMonthlyDays: adminSettings.customMonthlyDays,
          deliveryWeekdayCount: deliveryWeekdaysFromText(adminSettings.deliveryDays).length,
        }}
        editLineId={firstValue(params.edit)}
      />
    </main>
  );
}

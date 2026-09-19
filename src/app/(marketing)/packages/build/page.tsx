import type { Metadata } from "next";
import { CustomPackageBuilder } from "@/components/sections/custom-package-builder";
import { PageHero } from "@/components/sections/page-hero";
import { getAdminSettings } from "@/lib/server/admin";
import { getCustomPackageItems } from "@/lib/server/catalog";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { getMarketingMetadata } from "@/lib/server/seo";
import { getPackageScheduleAvailability } from "@/lib/server/delivery-schedule-adjustments";

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
  const [params, customItems, adminSettings, backgrounds, availability] = await Promise.all([
    searchParams,
    getCustomPackageItems(),
    getAdminSettings(),
    getPageBackgrounds(),
    getPackageScheduleAvailability(),
  ]);

  return (
    <main>
      <PageHero
        eyebrow="Custom package"
        title="Build a tiffin around your appetite."
        image={backgrounds["packages.build.hero"].imageUrl}
        imageAlt="Indian thali with roti, rice, dal and sabzi"
        focalPoint={backgrounds["packages.build.hero"].focalPoint}
        overlay={backgrounds["packages.build.hero"].overlay}
        chips={["Pay per portion", "Monthly delivery", "Prepared fresh each morning"]}
      >
        Pick the exact portions you want. We price each item per unit, then multiply by the
        number of delivery days in your plan.
      </PageHero>
      <CustomPackageBuilder
        items={customItems}
        config={{
          customMonthlyDays: adminSettings.customMonthlyDays,
        }}
        editLineId={firstValue(params.edit)}
        availability={availability}
      />
    </main>
  );
}

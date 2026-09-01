import { Footer } from "@/components/layout/footer";
import { MaintenanceScreen } from "@/components/layout/maintenance-screen";
import { Navbar } from "@/components/layout/navbar";
import { getBusinessRules } from "@/lib/business-rules";
import { getCustomPackageItems, getPackagePlans } from "@/lib/server/catalog";
import { getPackageScheduleAvailability } from "@/lib/server/delivery-schedule-adjustments";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const rules = await getBusinessRules();

  if (rules.maintenanceMode) {
    return <MaintenanceScreen />;
  }

  const [plans, customItems, availability] = await Promise.all([
    getPackagePlans(),
    getCustomPackageItems(),
    getPackageScheduleAvailability(),
  ]);

  return (
    <div className="min-h-screen texture">
      <Navbar
        plans={plans}
        customItems={customItems}
        customConfig={{
          customMonthlyDays: rules.customMonthlyDays,
        }}
        availability={availability}
      />
      {children}
      <Footer />
    </div>
  );
}

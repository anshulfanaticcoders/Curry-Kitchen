import { Footer } from "@/components/layout/footer";
import { MaintenanceScreen } from "@/components/layout/maintenance-screen";
import { Navbar } from "@/components/layout/navbar";
import { getBusinessRules } from "@/lib/business-rules";
import { getCustomPackageItems, getPackagePlans } from "@/lib/server/catalog";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const rules = await getBusinessRules();

  if (rules.maintenanceMode) {
    return <MaintenanceScreen />;
  }

  const [plans, customItems] = await Promise.all([getPackagePlans(), getCustomPackageItems()]);

  return (
    <div className="min-h-screen texture">
      <Navbar
        plans={plans}
        customItems={customItems}
        customConfig={{
          customMonthlyDays: rules.customMonthlyDays,
          deliveryWeekdayCount: rules.deliveryWeekdays.length,
        }}
      />
      {children}
      <Footer />
    </div>
  );
}

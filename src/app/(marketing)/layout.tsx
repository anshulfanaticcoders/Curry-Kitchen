import { Footer } from "@/components/layout/footer";
import { MaintenanceScreen } from "@/components/layout/maintenance-screen";
import { Navbar } from "@/components/layout/navbar";
import { getBusinessRules } from "@/lib/business-rules";
import { getPackagePlans } from "@/lib/server/catalog";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const rules = await getBusinessRules();

  if (rules.maintenanceMode) {
    return <MaintenanceScreen />;
  }

  const plans = await getPackagePlans();

  return (
    <div className="min-h-screen texture">
      <Navbar plans={plans} />
      {children}
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { MaintenanceScreen } from "@/components/layout/maintenance-screen";
import { getCurrentSession } from "@/lib/auth";
import { getBusinessRules } from "@/lib/business-rules";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const rules = await getBusinessRules();

  if (rules.maintenanceMode) {
    return <MaintenanceScreen customerView />;
  }

  return <DashboardShell role="customer">{children}</DashboardShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return <DashboardShell role="customer">{children}</DashboardShell>;
}

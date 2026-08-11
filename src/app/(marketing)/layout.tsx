import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getPackagePlans } from "@/lib/server/catalog";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const plans = await getPackagePlans();

  return (
    <div className="min-h-screen texture">
      <Navbar plans={plans} />
      {children}
      <Footer />
    </div>
  );
}

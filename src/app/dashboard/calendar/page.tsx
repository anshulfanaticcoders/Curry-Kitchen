import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCustomerCalendarData } from "@/lib/server/calendar";

export const dynamic = "force-dynamic";

export default async function CustomerCalendarPage() {
  const session = await getCurrentSession();
  const customer = session?.user?.id
    ? await db.customer.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    : null;
  const data = customer ? await getCustomerCalendarData(customer.id) : null;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Your deliveries, paused days, and plan dates at a glance."
      />
      {data ? (
        <DashboardCalendar data={data} />
      ) : (
        <EmptyState
          title="No calendar yet"
          description="Once you order a package, your delivery schedule appears here."
        />
      )}
    </div>
  );
}

import { AdminCalendarPicker } from "@/components/dashboard/admin-calendar-picker";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { getAdminCustomerOptions } from "@/lib/server/admin";
import { getCustomerCalendarData } from "@/lib/server/calendar";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const [{ customer: customerId }, customers] = await Promise.all([
    searchParams,
    getAdminCustomerOptions(),
  ]);
  const selectedId = customerId ?? customers[0]?.id;
  const data = selectedId ? await getCustomerCalendarData(selectedId) : null;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Deliveries, paused days, and plan dates for any customer."
        action={<AdminCalendarPicker customers={customers} selectedId={selectedId} />}
      />
      {data ? (
        <DashboardCalendar data={data} />
      ) : (
        <EmptyState
          title="No customers yet"
          description="Customer calendars appear here once someone places an order."
        />
      )}
    </div>
  );
}

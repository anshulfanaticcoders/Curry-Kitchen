import { AdminHolidaysClient } from "@/components/dashboard/admin-holidays-client";
import { businessDateInput } from "@/lib/package-schedule";
import { getAdminBusinessHolidays } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminHolidaysPage() {
  return (
    <AdminHolidaysClient
      holidays={await getAdminBusinessHolidays()}
      earliestDate={businessDateInput()}
    />
  );
}

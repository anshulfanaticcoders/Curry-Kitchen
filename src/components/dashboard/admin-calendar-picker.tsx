"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/dashboard/primitives";
import type { AdminCustomerOption } from "@/lib/types";

export function AdminCalendarPicker({
  customers,
  selectedId,
}: {
  customers: AdminCustomerOption[];
  selectedId?: string;
}) {
  const router = useRouter();

  if (!customers.length) return null;

  return (
    <Select
      value={selectedId ?? ""}
      onChange={(event) => router.push(`/admin/calendar?customer=${encodeURIComponent(event.target.value)}`)}
      aria-label="Choose customer"
      className="w-72 bg-white"
    >
      {customers.map((customer) => (
        <option key={customer.id} value={customer.id}>
          {customer.name} ({customer.email})
        </option>
      ))}
    </Select>
  );
}

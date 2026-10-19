import "server-only";
import type { Prisma } from "@prisma/client";

// All delivery schedule writers lock the customer first, in the same order.
// The increment also invalidates previews opened before a competing change.
export async function lockCustomerCalendar(tx: Prisma.TransactionClient, customerId: string) {
  await tx.customer.update({ where: { id: customerId }, data: { calendarRevision: { increment: 1 } } });
}

export async function lockPackageCalendar(tx: Prisma.TransactionClient, packageId: string) {
  const item = await tx.customerPackage.findUnique({ where: { id: packageId }, select: { customerId: true } });
  if (item?.customerId) await lockCustomerCalendar(tx, item.customerId);
}

export async function lockCalendars(tx: Prisma.TransactionClient, customerIds: (string | null)[]) {
  for (const id of [...new Set(customerIds.filter((id): id is string => Boolean(id)))].sort()) {
    await lockCustomerCalendar(tx, id);
  }
}

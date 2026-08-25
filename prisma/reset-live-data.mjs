// Wipes customer/test data before going live while keeping everything the
// admin configured (packages, menus, settings, coupons, reviews, SEO, media).
//
//   node prisma/reset-live-data.mjs            # dry run: prints what would go
//   node prisma/reset-live-data.mjs --confirm  # actually deletes
//
// Take a database backup first. This cannot be undone.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

function mariaDbConfigFromUrl(url) {
  const parsed = new URL(url);

  return {
    host: parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 1,
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfigFromUrl(databaseUrl)) });
const confirm = process.argv.includes("--confirm");

// Everything not belonging to an ADMIN user goes. Orders are deleted first so
// their cascades (items, payments, packages, delivery days, pauses,
// verifications) run before the SetNull customer links are touched.
const nonAdminUsers = { role: { not: "ADMIN" } };
const nonAdminCustomers = { OR: [{ userId: null }, { user: nonAdminUsers }] };

async function main() {
  const counts = {
    orders: await prisma.order.count(),
    customerPackages: await prisma.customerPackage.count(),
    payments: await prisma.payment.count(),
    studentVerifications: await prisma.studentVerification.count(),
    notifications: await prisma.notification.count(),
    stripeEvents: await prisma.stripeEvent.count(),
    addresses: await prisma.address.count(),
    customers: await prisma.customer.count({ where: nonAdminCustomers }),
    users: await prisma.user.count({ where: nonAdminUsers }),
    auditLogs: await prisma.auditLog.count(),
  };
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });

  console.log("Database:", mariaDbConfigFromUrl(databaseUrl).database);
  console.log("Keeping admin users:", admins.map((admin) => admin.email).join(", ") || "(none!)");
  console.log("Will delete:", counts);

  if (!admins.length) {
    console.error("Refusing to run: no ADMIN user found, you would lose access.");
    process.exit(1);
  }

  if (!confirm) {
    console.log("\nDry run. Re-run with --confirm to delete.");
    return;
  }

  const result = await prisma.$transaction(async (tx) => ({
    orders: (await tx.order.deleteMany()).count,
    studentVerifications: (await tx.studentVerification.deleteMany()).count,
    notifications: (await tx.notification.deleteMany()).count,
    stripeEvents: (await tx.stripeEvent.deleteMany()).count,
    addresses: (await tx.address.deleteMany()).count,
    customers: (await tx.customer.deleteMany({ where: nonAdminCustomers })).count,
    users: (await tx.user.deleteMany({ where: nonAdminUsers })).count,
    auditLogs: (await tx.auditLog.deleteMany()).count,
  }));

  console.log("Deleted:", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

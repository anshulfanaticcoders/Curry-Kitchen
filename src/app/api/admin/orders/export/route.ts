import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function csv(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export async function GET() {
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") return Response.json({ error: "Admin access is required." }, { status: 403 });
  const orders = await db.order.findMany({ include: { customer: true, items: { include: { package: true } }, payments: { take: 1, orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } });
  const body = [["Order", "Customer", "Email", "Plans", "Total", "Status", "Payment", "Created"], ...orders.map((order) => [order.orderNumber, order.customer?.name ?? order.guestName, order.customer?.email ?? order.guestEmail, order.items.map((item) => item.package.name).join(", "), order.total.toString(), order.status, order.payments[0]?.status ?? "PENDING", order.createdAt.toISOString()])].map((row) => row.map(csv).join(",")).join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=currykitchen-orders.csv" } });
}

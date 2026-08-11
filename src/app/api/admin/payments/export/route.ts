import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function csv(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export async function GET() {
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") return Response.json({ error: "Admin access is required." }, { status: 403 });
  const payments = await db.payment.findMany({ include: { order: { include: { customer: true } } }, orderBy: { createdAt: "desc" } });
  const body = [["Payment", "Order", "Customer", "Email", "Method", "Amount", "Currency", "Status", "Created"], ...payments.map((payment) => [payment.id, payment.order.orderNumber, payment.order.customer?.name ?? payment.order.guestName, payment.order.customer?.email ?? payment.order.guestEmail, payment.method, payment.amount.toString(), payment.currency, payment.status, payment.createdAt.toISOString()])].map((row) => row.map(csv).join(",")).join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=currykitchen-payments.csv" } });
}

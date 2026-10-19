import { getAdminOrderReceipt, ReceiptAccessError } from "@/lib/server/order-receipt";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await params;
    return Response.json(await getAdminOrderReceipt(orderNumber), { headers });
  } catch (error) {
    if (error instanceof ReceiptAccessError) {
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    console.error("Admin receipt could not be loaded", error);
    return Response.json({ error: "The receipt could not be loaded. Please try again." }, { status: 503, headers });
  }
}

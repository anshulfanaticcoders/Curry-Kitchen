import { ZodError } from "zod";
import { createCheckoutOrder } from "@/lib/server/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const checkout = await createCheckoutOrder(payload);

    return Response.json({
      ok: true,
      ...checkout,
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Invalid checkout details."
        : error instanceof Error
          ? error.message
          : "Checkout could not be created.";

    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}

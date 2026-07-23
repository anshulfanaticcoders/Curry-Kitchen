import { ZodError } from "zod";
import { CheckoutError, createCheckoutOrder } from "@/lib/server/checkout";

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
    const knownError = error instanceof CheckoutError || error instanceof ZodError;
    const message = error instanceof CheckoutError
      ? error.message
      : error instanceof ZodError
        ? error.issues[0]?.message ?? "Invalid checkout details."
        : "Checkout could not be created. Please try again.";
    const status = error instanceof CheckoutError ? error.statusCode : knownError ? 400 : 500;

    if (!knownError) {
      console.error("Unexpected checkout error", error);
    }

    return Response.json({ ok: false, error: message }, { status });
  }
}

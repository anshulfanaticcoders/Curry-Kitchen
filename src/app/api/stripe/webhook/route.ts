import { db } from "@/lib/db";
import { markOrderPaidAndActivate } from "@/lib/server/checkout";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event =
      stripe && webhookSecret && signature
        ? stripe.webhooks.constructEvent(body, signature, webhookSecret)
        : JSON.parse(body);

    await db.stripeEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        type: event.type,
        payload: event,
      },
      update: {
        payload: event,
      },
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        payment_intent?: string;
        metadata?: { orderId?: string };
      };
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await markOrderPaidAndActivate(orderId, session.payment_intent);
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const session = event.data.object as {
        metadata?: { orderId?: string };
      };
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await db.payment.updateMany({
          where: { orderId },
          data: { status: "FAILED" },
        });
      }
    }

    await db.stripeEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error.";
    return Response.json({ error: message }, { status: 400 });
  }
}

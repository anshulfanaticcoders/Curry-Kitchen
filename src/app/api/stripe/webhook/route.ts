import { Prisma } from "@prisma/client";
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
    if (!stripe || !webhookSecret) {
      return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
    }

    if (!signature) {
      return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const payload = JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue;

    const existingEvent = await db.stripeEvent.findUnique({ where: { id: event.id } });
    if (existingEvent?.processed) {
      return Response.json({ received: true });
    }

    await db.stripeEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        type: event.type,
        payload,
      },
      update: {
        payload,
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

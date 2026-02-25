import Stripe from "stripe";
import { prisma } from "@/lib/db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  successUrl = `${APP_URL}/settings/subscription?success=true`,
  cancelUrl = `${APP_URL}/settings/subscription?canceled=true`,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  // Get or create Stripe customer
  let customerId: string;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (subscription?.stripeCustomerId) {
    customerId = subscription.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    customerId = customer.id;

    // Save customer ID
    await prisma.subscription.upsert({
      where: { userId },
      update: { stripeCustomerId: customerId },
      create: {
        userId,
        stripeCustomerId: customerId,
        plan: "FREE",
        status: "ACTIVE",
      },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  });

  return session;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string = `${APP_URL}/settings/subscription`
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      plan: "PREMIUM",
      status: "ACTIVE",
      currentPeriodStart: new Date(subscription.items.data[0].current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_CREATED",
      resource: "subscription",
      details: { subscriptionId: subscription.id },
    },
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  const status = subscription.status === "active" ? "ACTIVE" :
                 subscription.status === "past_due" ? "PAST_DUE" :
                 subscription.status === "canceled" ? "CANCELLED" : "INCOMPLETE";

  await prisma.subscription.update({
    where: { userId },
    data: {
      status,
      currentPeriodStart: new Date(subscription.items.data[0].current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: "FREE",
      status: "CANCELLED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelledAt: new Date(),
    },
  });

  // Downgrade user: remove extra trustees, reset polling to monthly
  await prisma.pollingConfig.update({
    where: { userId },
    data: { interval: "MONTHLY", smsEnabled: false },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SUBSCRIPTION_CANCELLED",
      resource: "subscription",
    },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (subscription) {
    await prisma.auditLog.create({
      data: {
        userId: subscription.userId,
        action: "INVOICE_PAID",
        resource: "subscription",
        details: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
        },
      },
    });
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { userId: subscription.userId },
      data: { status: "PAST_DUE" },
    });

    await prisma.auditLog.create({
      data: {
        userId: subscription.userId,
        action: "INVOICE_PAYMENT_FAILED",
        resource: "subscription",
        details: { invoiceId: invoice.id },
      },
    });
  }
}

// Price helpers
export function getPriceId(interval: "monthly" | "yearly"): string {
  return interval === "monthly"
    ? process.env.STRIPE_PRICE_ID_MONTHLY!
    : process.env.STRIPE_PRICE_ID_YEARLY!;
}

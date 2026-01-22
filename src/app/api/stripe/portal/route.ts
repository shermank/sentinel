import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBillingPortalSession } from "@/lib/stripe";
import type { ApiResponse } from "@/types";

/**
 * POST /api/stripe/portal
 * Create a Stripe billing portal session
 */
export async function POST(): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: "No subscription found" },
        { status: 404 }
      );
    }

    const portalSession = await createBillingPortalSession(
      subscription.stripeCustomerId
    );

    return NextResponse.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, getPriceId } from "@/lib/stripe";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

/**
 * POST /api/stripe/checkout
 * Create a Stripe checkout session for subscription
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { interval } = checkoutSchema.parse(body);
    const priceId = getPriceId(interval);

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: "Invalid price configuration" },
        { status: 500 }
      );
    }

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      priceId,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { success: false, error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { url: checkoutSession.url },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

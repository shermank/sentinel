import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { generateUrlSafeToken } from "@/lib/crypto/server";
import type { ApiResponse, CreateTrusteeInput, TrusteeWithLogs } from "@/types";

const createTrusteeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  relationship: z.string().optional(),
});

/**
 * GET /api/trustees
 * Get all trustees for the current user
 */
export async function GET(): Promise<NextResponse<ApiResponse<TrusteeWithLogs[]>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const trustees = await prisma.trustee.findMany({
      where: { userId: session.user.id },
      include: {
        accessLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: trustees });
  } catch (error) {
    console.error("Get trustees error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trustees" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trustees
 * Add a new trustee
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TrusteeWithLogs>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const existingTrusteeCount = await prisma.trustee.count({
      where: {
        userId: session.user.id,
        status: { not: "REVOKED" },
      },
    });

    const maxTrustees = subscription?.plan === "PREMIUM" ? 999 : 1;
    if (existingTrusteeCount >= maxTrustees) {
      return NextResponse.json(
        {
          success: false,
          error: `Free plan allows only ${maxTrustees} trustee. Upgrade to Premium for unlimited trustees.`,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createTrusteeSchema.parse(body) as CreateTrusteeInput;

    // Check if trustee with same email already exists for this user
    const existingTrustee = await prisma.trustee.findUnique({
      where: {
        userId_email: {
          userId: session.user.id,
          email: validatedData.email,
        },
      },
    });

    if (existingTrustee) {
      return NextResponse.json(
        { success: false, error: "A trustee with this email already exists" },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = generateUrlSafeToken();

    const trustee = await prisma.trustee.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        relationship: validatedData.relationship,
        verificationToken,
        status: "PENDING",
      },
      include: {
        accessLogs: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TRUSTEE_ADDED",
        resource: "trustee",
        resourceId: trustee.id,
        details: { email: trustee.email },
      },
    });

    // TODO: Send invitation email to trustee
    // await sendTrusteeInvitation(trustee.email, trustee.name, verificationToken);

    return NextResponse.json({ success: true, data: trustee }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create trustee error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add trustee" },
      { status: 500 }
    );
  }
}

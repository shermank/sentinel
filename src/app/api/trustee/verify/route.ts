import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

/**
 * POST /api/trustee/verify
 * Verify a trustee's email address
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find trustee by verification token
    const trustee = await prisma.trustee.findFirst({
      where: {
        verificationToken: token,
        status: "PENDING",
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!trustee) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Update trustee status to VERIFIED
    await prisma.trustee.update({
      where: { id: trustee.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verificationToken: null, // Clear the token after use
      },
    });

    // Log the verification
    await prisma.trusteeAccessLog.create({
      data: {
        trusteeId: trustee.id,
        action: "EMAIL_VERIFIED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      data: {
        trusteeName: trustee.name,
        userName: trustee.user.name,
      },
    });
  } catch (error) {
    console.error("Trustee verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

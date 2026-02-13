import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse, CheckInResponse } from "@/types";

const confirmSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/**
 * POST /api/checkin/confirm
 * Confirm check-in via token (from email/SMS link)
 * This endpoint is public - no auth required
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CheckInResponse>>> {
  try {
    const body = await request.json();
    const { token } = confirmSchema.parse(body);

    // Find the check-in
    const checkIn = await prisma.checkIn.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            pollingConfig: true,
          },
        },
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { success: false, error: "Invalid check-in token" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (checkIn.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: `This check-in has already been ${checkIn.status.toLowerCase()}`,
        },
        { status: 400 }
      );
    }

    // Check if expired
    if (checkIn.expiresAt < new Date()) {
      // Mark as missed
      await prisma.checkIn.update({
        where: { id: checkIn.id },
        data: { status: "MISSED" },
      });

      return NextResponse.json(
        { success: false, error: "This check-in link has expired" },
        { status: 400 }
      );
    }

    const pollingConfig = checkIn.user.pollingConfig;
    if (!pollingConfig) {
      return NextResponse.json(
        { success: false, error: "Polling configuration not found" },
        { status: 400 }
      );
    }

    // Calculate next check-in due date
    const nextCheckInDue = new Date();
    switch (pollingConfig.interval) {
      case "WEEKLY":
        nextCheckInDue.setDate(nextCheckInDue.getDate() + 7);
        break;
      case "BIWEEKLY":
        nextCheckInDue.setDate(nextCheckInDue.getDate() + 14);
        break;
      case "MONTHLY":
        nextCheckInDue.setMonth(nextCheckInDue.getMonth() + 1);
        break;
    }

    // Update check-in and polling config in a transaction
    await prisma.$transaction([
      prisma.checkIn.update({
        where: { id: checkIn.id },
        data: {
          status: "CONFIRMED",
          respondedAt: new Date(),
        },
      }),
      prisma.pollingConfig.update({
        where: { userId: checkIn.userId },
        data: {
          lastCheckInAt: new Date(),
          nextCheckInDue,
          currentMissedCheckIns: 0,
          status: "ACTIVE",
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: checkIn.userId,
          action: "CHECK_IN_CONFIRMED",
          resource: "check_in",
          resourceId: checkIn.id,
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        message: "Check-in confirmed! Stay safe.",
        nextCheckInDue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Confirm check-in error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm check-in" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkin/confirm?token=xxx
 * Get check-in status (for the confirmation page)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        sentAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { success: false, error: "Invalid check-in token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: checkIn.status,
        expiresAt: checkIn.expiresAt,
        userName: checkIn.user.name,
        isExpired: checkIn.expiresAt < new Date(),
      },
    });
  } catch (error) {
    console.error("Get check-in status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get check-in status" },
      { status: 500 }
    );
  }
}

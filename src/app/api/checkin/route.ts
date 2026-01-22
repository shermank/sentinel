import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ApiResponse, CheckInResponse } from "@/types";

/**
 * GET /api/checkin
 * Get recent check-in history for the current user
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, data: checkIns });
  } catch (error) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch check-in history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checkin
 * Manually confirm check-in (from dashboard)
 */
export async function POST(): Promise<NextResponse<ApiResponse<CheckInResponse>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's polling config
    const pollingConfig = await prisma.pollingConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!pollingConfig) {
      return NextResponse.json(
        { success: false, error: "Polling not configured" },
        { status: 400 }
      );
    }

    if (pollingConfig.status === "TRIGGERED") {
      return NextResponse.json(
        { success: false, error: "Death protocol has already been triggered" },
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

    // Update polling config
    await prisma.pollingConfig.update({
      where: { userId: session.user.id },
      data: {
        lastCheckInAt: new Date(),
        nextCheckInDue,
        currentMissedCheckIns: 0,
        status: "ACTIVE",
      },
    });

    // Mark any pending check-ins as confirmed
    await prisma.checkIn.updateMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
        respondedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MANUAL_CHECK_IN",
        resource: "check_in",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        message: "Check-in confirmed successfully",
        nextCheckInDue,
      },
    });
  } catch (error) {
    console.error("Manual check-in error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm check-in" },
      { status: 500 }
    );
  }
}

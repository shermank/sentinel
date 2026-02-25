import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse, PollingConfigWithStats, UpdatePollingConfigInput } from "@/types";

const updatePollingSchema = z.object({
  interval: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  gracePeriod1: z.number().min(1).max(30).optional(),
  gracePeriod2: z.number().min(1).max(30).optional(),
  gracePeriod3: z.number().min(1).max(30).optional(),
});

/**
 * GET /api/polling
 * Get the current user's polling configuration
 */
export async function GET(): Promise<NextResponse<ApiResponse<PollingConfigWithStats | null>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const pollingConfig = await prisma.pollingConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!pollingConfig) {
      return NextResponse.json({ success: true, data: null });
    }

    // Get check-in stats
    const checkInStats = await prisma.checkIn.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { status: true },
    });

    const stats = {
      totalCheckIns: checkInStats.reduce((acc, s) => acc + s._count.status, 0),
      confirmedCheckIns: checkInStats.find((s) => s.status === "CONFIRMED")?._count.status || 0,
      missedCheckIns: checkInStats.find((s) => s.status === "MISSED")?._count.status || 0,
    };

    const result: PollingConfigWithStats = {
      ...pollingConfig,
      ...stats,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Get polling config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch polling configuration" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/polling
 * Update polling configuration
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PollingConfigWithStats>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updatePollingSchema.parse(body) as UpdatePollingConfigInput;

    // Check subscription for feature availability
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // Free tier restrictions
    if (subscription?.plan === "FREE") {
      // Only monthly polling allowed
      if (validatedData.interval && validatedData.interval !== "MONTHLY") {
        return NextResponse.json(
          {
            success: false,
            error: "Weekly and bi-weekly polling require a Premium subscription",
          },
          { status: 403 }
        );
      }
      // SMS not available
      if (validatedData.smsEnabled) {
        return NextResponse.json(
          {
            success: false,
            error: "SMS notifications require a Premium subscription",
          },
          { status: 403 }
        );
      }
    }

    // Calculate next check-in due date based on interval
    let nextCheckInDue: Date | undefined;
    if (validatedData.interval) {
      nextCheckInDue = new Date();
      switch (validatedData.interval) {
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
    }

    const pollingConfig = await prisma.pollingConfig.upsert({
      where: { userId: session.user.id },
      update: {
        ...(validatedData.interval && { interval: validatedData.interval }),
        ...(validatedData.emailEnabled !== undefined && { emailEnabled: validatedData.emailEnabled }),
        ...(validatedData.smsEnabled !== undefined && { smsEnabled: validatedData.smsEnabled }),
        ...(validatedData.pushEnabled !== undefined && { pushEnabled: validatedData.pushEnabled }),
        ...(validatedData.gracePeriod1 && { gracePeriod1: validatedData.gracePeriod1 }),
        ...(validatedData.gracePeriod2 && { gracePeriod2: validatedData.gracePeriod2 }),
        ...(validatedData.gracePeriod3 && { gracePeriod3: validatedData.gracePeriod3 }),
        ...(nextCheckInDue && { nextCheckInDue }),
      },
      create: {
        userId: session.user.id,
        interval: validatedData.interval || "MONTHLY",
        emailEnabled: validatedData.emailEnabled ?? true,
        smsEnabled: validatedData.smsEnabled ?? false,
        pushEnabled: validatedData.pushEnabled ?? false,
        gracePeriod1: validatedData.gracePeriod1 ?? 7,
        gracePeriod2: validatedData.gracePeriod2 ?? 14,
        gracePeriod3: validatedData.gracePeriod3 ?? 7,
        nextCheckInDue,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "POLLING_CONFIG_UPDATED",
        resource: "polling_config",
        resourceId: pollingConfig.id,
        details: { ...validatedData },
      },
    });

    const result: PollingConfigWithStats = {
      ...pollingConfig,
      totalCheckIns: 0,
      confirmedCheckIns: 0,
      missedCheckIns: 0,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update polling config error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update polling configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polling/pause
 * Pause polling (temporary vacation mode)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action as string;

    if (action === "pause") {
      await prisma.pollingConfig.update({
        where: { userId: session.user.id },
        data: { status: "PAUSED" },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "POLLING_PAUSED",
          resource: "polling_config",
        },
      });

      return NextResponse.json({ success: true, message: "Polling paused" });
    } else if (action === "resume") {
      // Calculate next check-in based on current interval
      const config = await prisma.pollingConfig.findUnique({
        where: { userId: session.user.id },
      });

      const nextCheckInDue = new Date();
      switch (config?.interval) {
        case "WEEKLY":
          nextCheckInDue.setDate(nextCheckInDue.getDate() + 7);
          break;
        case "BIWEEKLY":
          nextCheckInDue.setDate(nextCheckInDue.getDate() + 14);
          break;
        default:
          nextCheckInDue.setMonth(nextCheckInDue.getMonth() + 1);
      }

      await prisma.pollingConfig.update({
        where: { userId: session.user.id },
        data: {
          status: "ACTIVE",
          currentMissedCheckIns: 0,
          nextCheckInDue,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "POLLING_RESUMED",
          resource: "polling_config",
        },
      });

      return NextResponse.json({ success: true, message: "Polling resumed" });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Polling action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

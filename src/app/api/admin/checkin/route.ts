import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

const validateCheckInSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

/**
 * GET /api/admin/checkin
 * Get all users with their check-in status (admin only)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get all users with their polling config
    const users = await prisma.user.findMany({
      where: {
        role: "USER", // Only show regular users
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        pollingConfig: {
          select: {
            status: true,
            lastCheckInAt: true,
            nextCheckInDue: true,
            currentMissedCheckIns: true,
            interval: true,
          },
        },
        _count: {
          select: {
            checkIns: {
              where: { status: "PENDING" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        status: user.pollingConfig?.status || "NOT_CONFIGURED",
        lastCheckInAt: user.pollingConfig?.lastCheckInAt,
        nextCheckInDue: user.pollingConfig?.nextCheckInDue,
        missedCheckIns: user.pollingConfig?.currentMissedCheckIns || 0,
        interval: user.pollingConfig?.interval,
        pendingCheckIns: user._count.checkIns,
      })),
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/checkin
 * Force validate check-in for a user (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = validateCheckInSchema.parse(body);

    // Get user's polling config
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { pollingConfig: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!targetUser.pollingConfig) {
      return NextResponse.json(
        { success: false, error: "User has no polling configuration" },
        { status: 400 }
      );
    }

    const pollingConfig = targetUser.pollingConfig;

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

    // Update polling config and mark pending check-ins as confirmed
    await prisma.$transaction([
      prisma.pollingConfig.update({
        where: { userId },
        data: {
          lastCheckInAt: new Date(),
          nextCheckInDue,
          currentMissedCheckIns: 0,
          status: "ACTIVE",
        },
      }),
      prisma.checkIn.updateMany({
        where: {
          userId,
          status: "PENDING",
        },
        data: {
          status: "CONFIRMED",
          respondedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ADMIN_FORCE_CHECK_IN",
          resource: "check_in",
          resourceId: userId,
          details: {
            targetUserId: userId,
            targetUserEmail: targetUser.email,
            adminId: session.user.id,
          },
        },
      }),
    ]);

    // Send confirmation email to the user
    const formattedNextDue = nextCheckInDue.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await sendEmail({
      to: targetUser.email,
      subject: "Eternal Sentinel - Check-in Confirmed",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Eternal Sentinel</h1>
              </div>
              <div class="content">
                <h2>Hello ${targetUser.name || "there"},</h2>
                <div class="success">
                  <strong>Your check-in has been confirmed by an administrator.</strong>
                </div>
                <p>Your status has been updated and your account is in good standing.</p>
                <p><strong>Next check-in due:</strong> ${formattedNextDue}</p>
                <p>Stay safe,<br>The Eternal Sentinel Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${targetUser.name || "there"},\n\nYour check-in has been confirmed by an administrator.\n\nYour status has been updated and your account is in good standing.\n\nNext check-in due: ${formattedNextDue}\n\nStay safe,\nThe Eternal Sentinel Team`,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Check-in validated for ${targetUser.email}`,
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
    console.error("Admin force check-in error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate check-in" },
      { status: 500 }
    );
  }
}

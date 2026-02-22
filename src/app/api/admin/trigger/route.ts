import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { triggerDeathProtocol } from "@/lib/queue";

const triggerSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

/**
 * POST /api/admin/trigger
 * Manually trigger the death protocol for a user (admin only)
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
    const { userId } = triggerSchema.parse(body);

    // Get target user
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

    if (targetUser.pollingConfig.status === "TRIGGERED") {
      return NextResponse.json(
        { success: false, error: "Death protocol has already been triggered for this user" },
        { status: 400 }
      );
    }

    // Trigger the death protocol via the job queue
    await triggerDeathProtocol(userId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_TRIGGER_DEATH_PROTOCOL",
        resource: "polling_config",
        resourceId: userId,
        details: {
          targetUserId: userId,
          targetUserEmail: targetUser.email,
          adminId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Death protocol triggered for ${targetUser.email}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Admin trigger death protocol error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger death protocol" },
      { status: 500 }
    );
  }
}

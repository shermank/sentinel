import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const deleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

/**
 * DELETE /api/admin/users
 * Delete a user account and all related data (admin only)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const { userId } = deleteUserSchema.parse(body);

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot delete admin accounts" },
        { status: 400 }
      );
    }

    // Delete user (cascades to all related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_DELETE_USER",
        resource: "user",
        resourceId: userId,
        details: {
          deletedUserEmail: targetUser.email,
          adminId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: `User ${targetUser.email} has been deleted` },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

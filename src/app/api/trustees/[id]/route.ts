import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse, TrusteeWithLogs } from "@/types";

const updateTrusteeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  status: z.enum(["PENDING", "VERIFIED", "ACTIVE", "REVOKED"]).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trustees/[id]
 * Get a specific trustee
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TrusteeWithLogs>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const trustee = await prisma.trustee.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        accessLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!trustee) {
      return NextResponse.json(
        { success: false, error: "Trustee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trustee });
  } catch (error) {
    console.error("Get trustee error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trustee" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trustees/[id]
 * Update a trustee
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TrusteeWithLogs>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existingTrustee = await prisma.trustee.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTrustee) {
      return NextResponse.json(
        { success: false, error: "Trustee not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateTrusteeSchema.parse(body);

    const trustee = await prisma.trustee.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.relationship !== undefined && { relationship: validatedData.relationship }),
        ...(validatedData.status && { status: validatedData.status }),
      },
      include: {
        accessLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TRUSTEE_UPDATED",
        resource: "trustee",
        resourceId: trustee.id,
      },
    });

    return NextResponse.json({ success: true, data: trustee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update trustee error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update trustee" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trustees/[id]
 * Remove a trustee (soft delete - sets status to REVOKED)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existingTrustee = await prisma.trustee.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingTrustee) {
      return NextResponse.json(
        { success: false, error: "Trustee not found" },
        { status: 404 }
      );
    }

    // Soft delete - revoke access
    await prisma.trustee.update({
      where: { id },
      data: {
        status: "REVOKED",
        accessToken: null,
        accessGrantedAt: null,
        accessExpiresAt: null,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "TRUSTEE_REMOVED",
        resource: "trustee",
        resourceId: id,
        details: { email: existingTrustee.email },
      },
    });

    return NextResponse.json({ success: true, message: "Trustee removed" });
  } catch (error) {
    console.error("Delete trustee error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove trustee" },
      { status: 500 }
    );
  }
}

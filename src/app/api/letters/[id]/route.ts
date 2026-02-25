import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateLetterSchema = z.object({
  recipientName: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  encryptedBody: z.string().min(1).optional(),
  nonce: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "READY"]).optional(),
});

/**
 * PUT /api/letters/[id]
 * Update a final letter
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.finalLetter.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Letter not found" },
        { status: 404 }
      );
    }

    if (existing.status === "DELIVERED") {
      return NextResponse.json(
        { success: false, error: "Cannot edit a delivered letter" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateLetterSchema.parse(body);

    const letter = await prisma.finalLetter.update({
      where: { id },
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FINAL_LETTER_UPDATED",
        resource: "final_letter",
        resourceId: id,
        details: { updatedFields: Object.keys(validatedData) },
      },
    });

    return NextResponse.json({ success: true, data: letter });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update letter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update letter" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/letters/[id]
 * Delete a final letter
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.finalLetter.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Letter not found" },
        { status: 404 }
      );
    }

    await prisma.finalLetter.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FINAL_LETTER_DELETED",
        resource: "final_letter",
        resourceId: id,
        details: { recipientEmail: existing.recipientEmail },
      },
    });

    return NextResponse.json({ success: true, data: { message: "Letter deleted" } });
  } catch (error) {
    console.error("Delete letter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete letter" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createLetterSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  encryptedBody: z.string().min(1, "Letter body is required"),
  nonce: z.string().min(1, "Nonce is required"),
  status: z.enum(["DRAFT", "READY"]).optional().default("DRAFT"),
});

/**
 * GET /api/letters
 * Fetch all final letters for the current user
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

    const letters = await prisma.finalLetter.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: letters });
  } catch (error) {
    console.error("Get letters error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch letters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/letters
 * Create a new final letter
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

    const body = await request.json();
    const validatedData = createLetterSchema.parse(body);

    const letter = await prisma.finalLetter.create({
      data: {
        userId: session.user.id,
        recipientName: validatedData.recipientName,
        recipientEmail: validatedData.recipientEmail,
        subject: validatedData.subject,
        encryptedBody: validatedData.encryptedBody,
        nonce: validatedData.nonce,
        status: validatedData.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FINAL_LETTER_CREATED",
        resource: "final_letter",
        resourceId: letter.id,
        details: {
          recipientEmail: validatedData.recipientEmail,
          status: validatedData.status,
        },
      },
    });

    return NextResponse.json({ success: true, data: letter }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create letter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create letter" },
      { status: 500 }
    );
  }
}

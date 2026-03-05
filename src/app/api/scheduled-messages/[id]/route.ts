import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  recipientName: z.string().min(1).optional(),
  recipientEmail: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  label: z.string().nullable().optional(),
  scheduledFor: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED"]).optional(),
});

async function getOwnedMessage(userId: string, id: string) {
  return prisma.scheduledMessage.findFirst({
    where: { id, userId },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const message = await getOwnedMessage(session.user.id, id);
    if (!message) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Get scheduled message error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch message" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getOwnedMessage(session.user.id, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (existing.status === "DELIVERED") {
      return NextResponse.json(
        { success: false, error: "Cannot edit a delivered message" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = patchSchema.parse(body);

    if (data.scheduledFor) {
      const scheduledFor = new Date(data.scheduledFor);
      const targetStatus = data.status ?? existing.status;
      if (targetStatus === "SCHEDULED" && scheduledFor <= new Date()) {
        return NextResponse.json(
          { success: false, error: "Scheduled time must be in the future" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        ...(data.recipientName !== undefined && { recipientName: data.recipientName }),
        ...(data.recipientEmail !== undefined && { recipientEmail: data.recipientEmail }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.scheduledFor !== undefined && { scheduledFor: new Date(data.scheduledFor) }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update scheduled message error:", error);
    return NextResponse.json({ success: false, error: "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getOwnedMessage(session.user.id, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (existing.status === "DELIVERED") {
      return NextResponse.json(
        { success: false, error: "Cannot delete a delivered message" },
        { status: 400 }
      );
    }

    await prisma.scheduledMessage.delete({ where: { id } });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("Delete scheduled message error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete message" }, { status: 500 });
  }
}

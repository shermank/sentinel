import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
  label: z.string().optional(),
  scheduledFor: z.string().datetime("Invalid date/time"),
  status: z.enum(["DRAFT", "SCHEDULED"]).default("DRAFT"),
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.scheduledMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { scheduledFor: "asc" },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error("Get scheduled messages error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const scheduledFor = new Date(data.scheduledFor);
    if (data.status === "SCHEDULED" && scheduledFor <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    const message = await prisma.scheduledMessage.create({
      data: {
        userId: session.user.id,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        body: data.body,
        label: data.label ?? null,
        scheduledFor,
        status: data.status,
      },
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create scheduled message error:", error);
    return NextResponse.json({ success: false, error: "Failed to create message" }, { status: 500 });
  }
}

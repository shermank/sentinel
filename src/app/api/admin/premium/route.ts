import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isPremiumOverride: true,
        pollingConfig: { select: { interval: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { userId, enabled } = schema.parse(await req.json());

    await prisma.user.update({
      where: { id: userId },
      data: { isPremiumOverride: enabled },
    });

    if (enabled) {
      await prisma.pollingConfig.upsert({
        where: { userId },
        update: { interval: "WEEKLY" },
        create: {
          userId,
          interval: "WEEKLY",
          emailEnabled: true,
          status: "ACTIVE",
          gracePeriod1: 7,
          gracePeriod2: 14,
          gracePeriod3: 7,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: enabled ? "ADMIN_GRANT_PREMIUM" : "ADMIN_REVOKE_PREMIUM",
        resource: "user",
        resourceId: userId,
        details: { enabled },
      },
    });

    return NextResponse.json({ success: true, data: { isPremiumOverride: enabled } });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.issues[0].message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

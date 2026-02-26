import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin();
    const { userId, role } = await req.json();

    if (!userId || !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    // Prevent demoting yourself
    if (userId === adminUser.id && role === "USER") {
      return NextResponse.json({ success: false, error: "Cannot demote yourself" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as "USER" | "ADMIN" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

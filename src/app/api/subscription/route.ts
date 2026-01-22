import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch subscription" }, { status: 500 });
  }
}

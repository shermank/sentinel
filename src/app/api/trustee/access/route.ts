import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const accessSchema = z.object({
  accessToken: z.string().min(1),
});

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, error: "Access token required" }, { status: 400 });
    }

    const trustee = await prisma.trustee.findUnique({
      where: { accessToken: token },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!trustee) {
      return NextResponse.json({ success: false, error: "Invalid access token" }, { status: 404 });
    }

    if (trustee.accessExpiresAt && trustee.accessExpiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Access has expired" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        trusteeName: trustee.name,
        userName: trustee.user.name,
        userEmail: trustee.user.email,
        accessExpiresAt: trustee.accessExpiresAt,
      },
    });
  } catch (error) {
    console.error("Trustee access check error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify access" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { accessToken } = accessSchema.parse(body);

    const trustee = await prisma.trustee.findUnique({
      where: { accessToken },
      include: {
        user: {
          include: {
            vault: {
              include: { items: true },
            },
          },
        },
      },
    });

    if (!trustee) {
      return NextResponse.json({ success: false, error: "Invalid access token" }, { status: 404 });
    }

    if (trustee.accessExpiresAt && trustee.accessExpiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Access has expired" }, { status: 403 });
    }

    // Log access
    await prisma.trusteeAccessLog.create({
      data: {
        trusteeId: trustee.id,
        action: "VIEW",
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    const vault = trustee.user.vault;
    if (!vault) {
      return NextResponse.json({ success: false, error: "No vault found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        trusteeName: trustee.name,
        userName: trustee.user.name,
        vault: {
          encryptedMasterKey: vault.encryptedMasterKey,
          masterKeySalt: vault.masterKeySalt,
          masterKeyNonce: vault.masterKeyNonce,
          items: vault.items.map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            encryptedData: item.encryptedData,
            nonce: item.nonce,
            metadata: item.metadata,
            createdAt: item.createdAt,
          })),
        },
        accessExpiresAt: trustee.accessExpiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Trustee vault access error:", error);
    return NextResponse.json({ success: false, error: "Failed to access vault" }, { status: 500 });
  }
}

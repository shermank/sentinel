import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse, CreateVaultInput, VaultWithItems } from "@/types";

const createVaultSchema = z.object({
  encryptedMasterKey: z.string().min(1, "Encrypted master key is required"),
  masterKeySalt: z.string().min(1, "Master key salt is required"),
  masterKeyNonce: z.string().min(1, "Master key nonce is required"),
});

/**
 * GET /api/vault
 * Get the current user's vault (without items for initial load)
 */
export async function GET(): Promise<NextResponse<ApiResponse<VaultWithItems | null>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const vault = await prisma.vault.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    console.error("Get vault error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vault" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault
 * Create a new vault for the user
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VaultWithItems>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if vault already exists
    const existingVault = await prisma.vault.findUnique({
      where: { userId: session.user.id },
    });

    if (existingVault) {
      return NextResponse.json(
        { success: false, error: "Vault already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createVaultSchema.parse(body) as CreateVaultInput;

    const vault = await prisma.vault.create({
      data: {
        userId: session.user.id,
        encryptedMasterKey: validatedData.encryptedMasterKey,
        masterKeySalt: validatedData.masterKeySalt,
        masterKeyNonce: validatedData.masterKeyNonce,
      },
      include: {
        items: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VAULT_CREATED",
        resource: "vault",
        resourceId: vault.id,
      },
    });

    return NextResponse.json({ success: true, data: vault }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create vault error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create vault" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vault
 * Update vault (e.g., change password - re-encrypt master key)
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VaultWithItems>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existingVault = await prisma.vault.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingVault) {
      return NextResponse.json(
        { success: false, error: "Vault not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createVaultSchema.parse(body) as CreateVaultInput;

    const vault = await prisma.vault.update({
      where: { userId: session.user.id },
      data: {
        encryptedMasterKey: validatedData.encryptedMasterKey,
        masterKeySalt: validatedData.masterKeySalt,
        masterKeyNonce: validatedData.masterKeyNonce,
      },
      include: {
        items: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VAULT_PASSWORD_CHANGED",
        resource: "vault",
        resourceId: vault.id,
      },
    });

    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update vault error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update vault" },
      { status: 500 }
    );
  }
}

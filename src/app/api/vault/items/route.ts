import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse, VaultItemInput } from "@/types";
import type { VaultItem } from "@prisma/client";

const createItemSchema = z.object({
  type: z.enum(["PASSWORD", "DOCUMENT", "MESSAGE", "SECRET"]),
  name: z.string().min(1, "Name is required"),
  encryptedData: z.string().min(1, "Encrypted data is required"),
  nonce: z.string().min(1, "Nonce is required"),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/vault/items
 * Get all vault items for the current user
 */
export async function GET(): Promise<NextResponse<ApiResponse<VaultItem[]>>> {
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

    if (!vault) {
      return NextResponse.json(
        { success: false, error: "Vault not found. Please create a vault first." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: vault.items });
  } catch (error) {
    console.error("Get vault items error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vault items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault/items
 * Create a new vault item
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VaultItem>>> {
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
    });

    if (!vault) {
      return NextResponse.json(
        { success: false, error: "Vault not found. Please create a vault first." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createItemSchema.parse(body) as VaultItemInput;

    const item = await prisma.vaultItem.create({
      data: {
        vaultId: vault.id,
        type: validatedData.type,
        name: validatedData.name,
        encryptedData: validatedData.encryptedData,
        nonce: validatedData.nonce,
        metadata: validatedData.metadata || {},
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VAULT_ITEM_CREATED",
        resource: "vault_item",
        resourceId: item.id,
        details: { type: item.type },
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create vault item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create vault item" },
      { status: 500 }
    );
  }
}

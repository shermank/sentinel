import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import type { VaultItem, Prisma } from "@/generated/prisma/client";

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  encryptedData: z.string().min(1).optional(),
  nonce: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/vault/items/[id]
 * Get a specific vault item
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<VaultItem>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the item and verify ownership
    const item = await prisma.vaultItem.findFirst({
      where: {
        id,
        vault: {
          userId: session.user.id,
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Vault item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Get vault item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vault item" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vault/items/[id]
 * Update a vault item
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<VaultItem>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existingItem = await prisma.vaultItem.findFirst({
      where: {
        id,
        vault: {
          userId: session.user.id,
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: "Vault item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateItemSchema.parse(body);

    const item = await prisma.vaultItem.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.encryptedData && { encryptedData: validatedData.encryptedData }),
        ...(validatedData.nonce && { nonce: validatedData.nonce }),
        ...(validatedData.metadata && { metadata: validatedData.metadata as Prisma.InputJsonValue }),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VAULT_ITEM_UPDATED",
        resource: "vault_item",
        resourceId: item.id,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Update vault item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update vault item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vault/items/[id]
 * Delete a vault item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existingItem = await prisma.vaultItem.findFirst({
      where: {
        id,
        vault: {
          userId: session.user.id,
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: "Vault item not found" },
        { status: 404 }
      );
    }

    await prisma.vaultItem.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "VAULT_ITEM_DELETED",
        resource: "vault_item",
        resourceId: id,
        details: { type: existingItem.type },
      },
    });

    return NextResponse.json({ success: true, message: "Vault item deleted" });
  } catch (error) {
    console.error("Delete vault item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete vault item" },
      { status: 500 }
    );
  }
}

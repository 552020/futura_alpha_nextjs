import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memoryShares } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { findMemory } from "@/app/api/memories/utils/memory";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const secureCode = searchParams.get("code");

  if (!secureCode) {
    return NextResponse.json({ error: "Secure code is required" }, { status: 400 });
  }

  try {
    // First try to find the memory
    const memory = await findMemory(id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Check if this is an owner's secure code
    if (memory.ownerSecureCode === secureCode) {
      // Owner's secure code - return full memory data
      return NextResponse.json({
        type: memory.type,
        data: memory,
        isOwner: true,
      });
    }

    // If not owner's code, check if it's a valid share code
    const share = await db.query.memoryShares.findFirst({
      where: and(eq(memoryShares.memoryId, id), eq(memoryShares.inviteeSecureCode, secureCode)),
    });

    if (!share) {
      return NextResponse.json({ error: "Invalid secure code" }, { status: 403 });
    }

    // Valid share code - return memory data with appropriate access level
    return NextResponse.json({
      type: memory.type,
      data: {
        ...memory,
        // Remove sensitive data for non-owners
        ownerSecureCode: undefined,
      },
      isOwner: false,
      accessLevel: share.accessLevel,
    });
  } catch (error) {
    console.error("Error accessing shared memory:", error);
    return NextResponse.json({ error: "Failed to access memory" }, { status: 500 });
  }
}

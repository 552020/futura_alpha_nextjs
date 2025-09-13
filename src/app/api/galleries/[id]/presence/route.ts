import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { getGalleryPresenceById, DBGalleryPresence } from "@/db/schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: galleryId } = await params;

    // Validate UUID format for galleryId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(galleryId)) {
      return NextResponse.json({ error: "Invalid galleryId format. Must be a valid UUID" }, { status: 400 });
    }

    // Query the gallery_presence view
    const result = await db.execute(getGalleryPresenceById(galleryId));

    // Handle raw database result format
    const rows = (result as { rows?: unknown[] })?.rows || [];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Gallery not found or no presence data available" }, { status: 404 });
    }

    const presenceData = rows[0] as DBGalleryPresence;

    return NextResponse.json({
      success: true,
      data: {
        galleryId: presenceData.gallery_id,
        totalMemories: presenceData.total_memories,
        icpCompleteMemories: presenceData.icp_complete_memories,
        icpComplete: presenceData.icp_complete,
        icpAny: presenceData.icp_any,
        // Calculate percentages for UI
        icpCompletePercentage:
          presenceData.total_memories > 0
            ? Math.round((presenceData.icp_complete_memories / presenceData.total_memories) * 100)
            : 0,
        // Storage status summary
        storageStatus: presenceData.icp_complete
          ? "stored_forever"
          : presenceData.icp_any
          ? "partially_stored"
          : "web2_only",
      },
    });
  } catch (error) {
    console.error("Error querying gallery presence:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

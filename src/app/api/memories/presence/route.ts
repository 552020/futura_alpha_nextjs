import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memoryType = searchParams.get("type");
    const memoryId = searchParams.get("id");

    // Validate memoryId exists and has valid UUID format
    if (!memoryId) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memoryId)) {
      return NextResponse.json({ error: "Invalid memoryId format. Must be a valid UUID" }, { status: 400 });
    }

    // Validate memory type
    if (!memoryType) {
      return NextResponse.json({ error: "Missing required parameter: type" }, { status: 400 });
    }

    const validMemoryTypes = ["image", "video", "note", "document", "audio"];
    if (!validMemoryTypes.includes(memoryType)) {
      return NextResponse.json(
        { error: `Invalid memory type. Must be one of: ${validMemoryTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database query when memory_presence view is created
    // For now, return mock data for development
    const mockPresenceData = {
      memoryId,
      memoryType,
      // Storage presence flags (mock: assume everything is in Neon for now)
      metaNeon: true,
      assetBlob: true,
      metaIcp: false,
      assetIcp: false,
      // Computed storage status
      storageStatus: {
        neon: true,
        blob: true,
        icp: false,
        icpPartial: false,
      },
      // Overall status summary
      overallStatus: "web2_only" as const,
    };

    return NextResponse.json({
      success: true,
      data: mockPresenceData,
    });
  } catch (error) {
    console.error("Error querying memory presence:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

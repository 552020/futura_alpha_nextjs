import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";

// Mock storage preferences for development
const MOCK_STORAGE_PREFERENCES = {
  preference: "neon" as const,
  primary: "neon-db" as const,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Authentication required" }, { status: 401 });
    }

    // Return mock data for now
    return NextResponse.json(MOCK_STORAGE_PREFERENCES);
  } catch (error) {
    console.error("Error fetching storage preferences:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch storage preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { preference, primary } = body;

    // Basic validation
    if (!preference || !primary) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Missing required fields",
          data: {
            field_errors: {
              preference: preference ? [] : ["preference is required"],
              primary: primary ? [] : ["primary is required"],
            },
          },
        },
        { status: 422 }
      );
    }

    // Mock successful update
    const updatedPreferences = {
      preference,
      primary,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error("Error updating storage preferences:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to update storage preferences" },
      { status: 500 }
    );
  }
}

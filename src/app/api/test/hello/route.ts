import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple GET endpoint for learning Supertest
    // No authentication required
    return NextResponse.json(
      {
        message: "Hello from test endpoint!",
        timestamp: new Date().toISOString(),
        method: "GET",
        endpoint: "/api/test/hello",
        status: "success",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error in test endpoint",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method for testing different HTTP methods
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json(
      {
        message: "Hello from POST test endpoint!",
        receivedData: body,
        timestamp: new Date().toISOString(),
        method: "POST",
        endpoint: "/api/test/hello",
        status: "success",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error in POST test endpoint",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 500 }
    );
  }
}

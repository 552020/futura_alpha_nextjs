import { NextRequest } from "next/server";

// GET /api/memories - List memories with optional assets
export async function GET(request: NextRequest) {
  const { handleApiMemoryGet } = await import("./get");
  return await handleApiMemoryGet(request);
}

// POST /api/memories - Create new memory with optional file upload
export async function POST(request: NextRequest) {
  const { handleApiMemoryPost } = await import("./post");
  return await handleApiMemoryPost(request);
}

// DELETE /api/memories - Bulk delete memories (for testing)
export async function DELETE(request: NextRequest) {
  const { handleApiMemoryDelete } = await import("./delete");
  return await handleApiMemoryDelete(request);
}

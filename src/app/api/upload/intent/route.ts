import { NextRequest, NextResponse } from "next/server";

function idem() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const preferred = body?.storagePreference?.preferred as "icp-canister" | "neon-db" | undefined;

    // Minimal decision: honor preferred if present, default to neon-db
    const chosen_storage = preferred ?? "neon-db";

    const ttl_seconds = 600; // 10 minutes
    const expires_at = new Date(Date.now() + ttl_seconds * 1000).toISOString();

    const payload: {
      uploadStorage: {
        chosen_storage: "icp-canister" | "neon-db" | "vercel-blob";
        idem: string;
        expires_at: string;
        ttl_seconds: number;
        limits: { inline_max: number; chunk_size: number; max_chunks: number };
        icp?: { canister_id: string; network?: string };
      };
    } = {
      uploadStorage: {
        chosen_storage,
        idem: idem(),
        expires_at,
        ttl_seconds,
        limits: { inline_max: 32 * 1024, chunk_size: 64 * 1024, max_chunks: 512 },
      },
    };

    if (chosen_storage === "icp-canister") {
      payload.uploadStorage.icp = {
        canister_id: process.env.NEXT_PUBLIC_ICP_CANISTER_ID ?? "ryjl3-tyaaa-aaaaa-aaaba-cai",
        network: process.env.NEXT_PUBLIC_ICP_NETWORK ?? "ic",
      };
    }

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create upload storage selection" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { app_memory_id, backend, idem, checksum_sha256, size, remote_id, session_id } = body ?? {};

    if (!app_memory_id || !backend || !idem) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          data: {
            field_errors: {
              app_memory_id: app_memory_id ? [] : ['required'],
              backend: backend ? [] : ['required'],
              idem: idem ? [] : ['required'],
            },
          },
        },
        { status: 422 }
      );
    }

    // Mock "verification" and echo back a storage_edge shape
    const storage_edge = {
      id: `edge_${Date.now()}`,
      app_memory_id,
      backend,
      remote_id: remote_id ?? session_id ?? 'mock-remote',
      checksum_sha256: checksum_sha256 ?? null,
      size: size ?? null,
      status: 'verified' as const,
      verified_at: new Date().toISOString(),
    };

    return NextResponse.json({ storage_edge, updatedAt: new Date().toISOString() }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to verify upload' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Update this to work with the new unified schema
  // For now, return error to make build pass
  return NextResponse.json({ error: 'Download not implemented for new schema yet' }, { status: 501 });
}

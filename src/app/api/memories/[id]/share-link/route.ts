import { NextRequest, NextResponse } from 'next/server';
import { findMemory } from '@/app/api/memories/utils/memory';

import { fatLogger } from '@/lib/logger';
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const secureCode = searchParams.get('code');

  if (!secureCode) {
    return NextResponse.json({ error: 'Secure code is required' }, { status: 400 });
  }

  try {
    // First try to find the memory
    const memory = await findMemory(id);
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
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

    // The old share secure code system doesn't directly map to resourceMembership
    // For now, we'll return an error for non-owner codes and suggest using the new access system
    return NextResponse.json({ 
      error: 'Share codes are no longer supported. Please use the new sharing system.',
      suggestion: 'Use direct user sharing via resourceMembership instead.'
    }, { status: 410 }); // 410 Gone - feature no longer available


  } catch (error) {
    fatLogger.error('Error accessing shared memory:', 'be', { data: error instanceof Error ? error : undefined });
    return NextResponse.json({ error: 'Failed to access memory' }, { status: 500 });
  }
}

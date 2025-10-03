import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLinkedPrincipalsFromDB } from '@/lib/get-linked-principals';

/**
 * GET /api/auth/ii/linked
 *
 * Returns the linked Internet Identity principals for the current user.
 * Used by the useIILinks hook to refresh linked principals.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkedIcPrincipals = await getLinkedPrincipalsFromDB(session.user.id);

    return NextResponse.json({ linkedIcPrincipals });
  } catch (error) {
    console.error('Failed to fetch linked principals:', error);
    return NextResponse.json({ error: 'Failed to fetch linked principals' }, { status: 500 });
  }
}

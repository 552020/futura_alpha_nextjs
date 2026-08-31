import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { fatLogger } from '@/lib/logger';

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
    fatLogger.error('Failed to fetch linked principals', 'be', { error });
    return NextResponse.json(
      { error: 'Failed to fetch linked principals' },
      { status: 500 }
    );
  }
}

async function getLinkedPrincipalsFromDB(userId: string): Promise<string[]> {
  try {
    const iiAccounts = await db.query.accounts.findMany({
      where: (a, { and, eq }) =>
        and(eq(a.userId, userId), eq(a.provider, 'internet-identity')),
      columns: { providerAccountId: true },
    });

    return iiAccounts.map((account) => account.providerAccountId);
  } catch (error) {
    fatLogger.warn('Failed to fetch linked principals from DB', 'be', {
      error,
    });
    return [];
  }
}

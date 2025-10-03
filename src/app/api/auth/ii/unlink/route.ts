import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/auth/ii/unlink
 *
 * Unlinks an Internet Identity principal from the current user's account.
 * Used by the useIILinks hook for unlinking operations.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { principal } = await request.json();

    if (!principal || typeof principal !== 'string') {
      return NextResponse.json({ error: 'Invalid principal' }, { status: 400 });
    }

    // TODO: CRITICAL - This permanently deletes the account link
    // Consider data preservation strategies before implementing in production
    // See linked-accounts.tsx for detailed architectural concerns

    // Unlink the principal from the current user
    await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.provider, 'internet-identity'),
          eq(accounts.providerAccountId, principal)
        )
      );

    // Get updated linked principals
    const linkedIcPrincipals = await getLinkedPrincipalsFromDB(session.user.id);

    return NextResponse.json({ linkedIcPrincipals });
  } catch (error) {
    console.error('Failed to unlink principal:', error);
    return NextResponse.json({ error: 'Failed to unlink principal' }, { status: 500 });
  }
}

async function getLinkedPrincipalsFromDB(userId: string): Promise<string[]> {
  try {
    const iiAccounts = await db.query.accounts.findMany({
      where: (a, { and, eq }) => and(eq(a.userId, userId), eq(a.provider, 'internet-identity')),
      columns: { providerAccountId: true },
    });

    return iiAccounts.map(account => account.providerAccountId);
  } catch (error) {
    console.warn('Failed to fetch linked principals from DB:', error);
    return [];
  }
}

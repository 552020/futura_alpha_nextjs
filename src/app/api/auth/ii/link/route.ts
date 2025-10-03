import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/auth/ii/link
 *
 * Links an Internet Identity principal to the current user's account.
 * Used by the useIILinks hook for linking operations.
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

    // Check if this principal is already linked to another user
    const existingAccount = await db.query.accounts.findFirst({
      where: (a, { and, eq }) => and(eq(a.provider, 'internet-identity'), eq(a.providerAccountId, principal)),
    });

    if (existingAccount && existingAccount.userId !== session.user.id) {
      return NextResponse.json({ error: 'Principal already linked to another account' }, { status: 409 });
    }

    // Link the principal to the current user
    await db
      .insert(accounts)
      .values({
        userId: session.user.id,
        type: 'oauth',
        provider: 'internet-identity',
        providerAccountId: principal,
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      })
      .onConflictDoNothing();

    // Get updated linked principals
    const linkedIcPrincipals = await getLinkedPrincipalsFromDB(session.user.id);

    return NextResponse.json({ linkedIcPrincipals });
  } catch (error) {
    console.error('Failed to link principal:', error);
    return NextResponse.json({ error: 'Failed to link principal' }, { status: 500 });
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

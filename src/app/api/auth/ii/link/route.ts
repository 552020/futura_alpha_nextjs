import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/db';
import { accounts } from '@/db';
import { createServerSideActor } from '@/lib/server-actor';
import { fatLogger } from '@/lib/logger';

/**
 * POST /api/auth/ii/link
 *
 * Links an Internet Identity principal to the current user's account.
 * Used by the useIILinks hook for linking operations.
 * 
 * NOTE: This endpoint accepts a direct principal (no nonce verification).
 * For nonce-verified linking, use /api/auth/link-ii instead.
 * 
 * @deprecated Consider migrating to /api/auth/link-ii for better security
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { principal, nonce } = body;

    // If nonce is provided, verify it with canister (more secure)
    let verifiedPrincipal = principal;
    if (nonce && typeof nonce === 'string') {
      try {
        const actor = await createServerSideActor();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nonceResult = (await actor.verify_nonce(nonce)) as { Ok: any } | { Err: any };
        if ('Err' in nonceResult) {
          return NextResponse.json(
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              error: `Nonce verification failed: ${JSON.stringify((nonceResult as { Err: any }).Err)}`,
            },
            { status: 400 }
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        verifiedPrincipal = (nonceResult as { Ok: any }).Ok.toString();
      } catch (error) {
        fatLogger.error('Nonce verification error:', 'be', { data: error instanceof Error ? error : undefined });
        return NextResponse.json({ error: 'Nonce verification failed' }, { status: 400 });
      }
    } else if (!principal || typeof principal !== 'string') {
      return NextResponse.json({ error: 'Invalid principal or nonce required' }, { status: 400 });
    }

    // Check if this principal is already linked to another user
    const existingAccount = await db.query.accounts.findFirst({
      where: (a, { and, eq }) =>
        and(eq(a.provider, 'internet-identity'), eq(a.providerAccountId, verifiedPrincipal)),
    });

    if (existingAccount && existingAccount.userId !== session.user.id) {
      return NextResponse.json(
        {
          error: 'Principal already linked to another account',
          message:
            'This Internet Identity is already linked to another account. Each II Principal can only be linked to one account for security reasons.',
          code: 'PRINCIPAL_CONFLICT',
        },
        { status: 409 }
      );
    }

    // Link the principal to the current user
    await db
      .insert(accounts)
      .values({
        userId: session.user.id,
        type: 'oidc',
        provider: 'internet-identity',
        providerAccountId: verifiedPrincipal,
      })
      .onConflictDoUpdate({
        target: [accounts.provider, accounts.providerAccountId],
        set: { userId: session.user.id },
      });

    // Get updated linked principals
    const linkedIcPrincipals = await getLinkedPrincipalsFromDB(session.user.id);

    return NextResponse.json({ success: true, principal: verifiedPrincipal, linkedIcPrincipals });
  } catch (error) {
    fatLogger.error('Failed to link principal:', 'be', { data: error instanceof Error ? error : undefined });
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

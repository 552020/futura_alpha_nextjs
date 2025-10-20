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
 * 
 * ACTIVELY USED BY:
 * - useIILinks hook (src/hooks/use-ii-links.ts)
 * - Account management components (linked-accounts, internet-identity-management, etc.)
 * - Forever storage modal for ICP operations
 * 
 * SECURITY NOTES:
 * - Supports both direct principal linking AND nonce verification
 * - When nonce is provided, verifies with canister for better security
 * - When only principal is provided, links directly (less secure, legacy behavior)
 * 
 * RELATED ROUTES:
 * - /api/auth/link-ii - Alternative route used by sign-in flows (always uses nonce)
 * - /api/auth/ii/linked - GET linked principals
 * - /api/auth/ii/unlink - Unlink a principal
 * 
 * TODO: Update useIILinks hook to always pass nonce for better security
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

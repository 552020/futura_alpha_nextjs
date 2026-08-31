import { db } from '@/db/db';
import { fatLogger } from '@/lib/logger';

/**
 * Fetches all linked Internet Identity principals for a user from the database.
 *
 * This is the canonical source of truth for linked principals.
 * Used by NextAuth JWT callback on sign-in to populate the session.
 *
 * @param userId - The user ID to fetch linked principals for
 * @returns Array of linked ICP principal strings
 */
export async function getLinkedPrincipalsFromDB(
  userId: string
): Promise<string[]> {
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

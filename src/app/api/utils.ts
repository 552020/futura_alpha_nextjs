import { db } from '@/db/db';
import { allUsers, temporaryUsers } from '@/db/schema';

/**
 * Creates a base temporary user and corresponding allUsers entry.
 * This is the common logic used by both the onboarding upload and share flows.
 *
 * @param role - The role of the temporary user ("inviter" or "invitee")
 * @returns The created temporary user and allUsers entries
 */
export async function createTemporaryUserBase(role: 'inviter' | 'invitee') {
  const [temporaryUser] = await db
    .insert(temporaryUsers)
    .values({
      secureCode: crypto.randomUUID(),
      secureCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      role,
      registrationStatus: 'pending',
    })
    .returning();

  const [allUser] = await db
    .insert(allUsers)
    .values({
      type: 'temporary',
      temporaryUserId: temporaryUser.id,
    })
    .returning();

  return { temporaryUser, allUser };
}

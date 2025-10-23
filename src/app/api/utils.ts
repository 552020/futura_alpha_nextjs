import { db } from '@/db/db';
import { allUsers, temporaryUsers } from '@/db';
import crypto from 'node:crypto';

/**
 * Creates a base temporary user and corresponding allUsers entry.
 * This is the common logic used by both the onboarding upload and share flows.
 *
 * @param role - The role of the temporary user ("inviter" or "invitee")
 * @returns The created temporary user and allUsers entries
 */
export async function createTemporaryUserBase(role: 'inviter' | 'invitee') {
  console.log('🔄 [DEBUG] createTemporaryUserBase: Creating temporary user with role:', role);

  const [temporaryUser] = await db
    .insert(temporaryUsers)
    .values({
      secureCode: crypto.randomUUID(),
      secureCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      role,
      registrationStatus: 'pending',
    })
    .returning();
  console.log('✅ [DEBUG] createTemporaryUserBase: Temporary user created:', { id: temporaryUser.id });

  const [allUser] = await db
    .insert(allUsers)
    .values({
      type: 'temporary',
      temporaryUserId: temporaryUser.id,
    })
    .returning();
  console.log('✅ [DEBUG] createTemporaryUserBase: AllUser created:', { id: allUser.id });

  return { temporaryUser, allUser };
}

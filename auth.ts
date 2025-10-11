// import NextAuth, { DefaultSession } from "next-auth";

import NextAuth, { type DefaultSession } from 'next-auth';
import 'next-auth/jwt';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db/db';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt'; // make sure bcrypt is installed
import { allUsers, temporaryUsers, users, accounts, iiNonces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { consumeNonce } from '@/lib/ii-nonce';
import { getLinkedPrincipalsFromDB } from '@/lib/get-linked-principals';

/**
 * Links Internet Identity to an existing user session if one exists.
 *
 * TODO: Extend this to all authentication providers for complete account linking.
 *
 * PROBLEMS TO SOLVE:
 * - Google/GitHub: Use `profile()` function, not `authorize()` - need custom logic
 * - Email/Password: Already uses existing user lookup (correct behavior)
 * - Need to modify OAuth providers to check for active session before creating new user
 * - DrizzleAdapter handles OAuth linking automatically, but we need session-aware linking
 *
 * @param principal - The Internet Identity principal
 * @returns User data if linking succeeds, null if no active session
 */
async function linkInternetIdentityToActiveSession(principal: string) {
  try {
    const activeSession = await auth();
    if (activeSession?.user?.id) {
      // Link II principal to existing user
      await db.insert(accounts).values({
        userId: activeSession.user.id,
        type: 'oidc',
        provider: 'internet-identity',
        providerAccountId: principal,
      });

      return {
        id: activeSession.user.id,
        email: activeSession.user.email,
        name: activeSession.user.name,
        role: activeSession.user.role,
        icpPrincipal: principal,
      };
    }
  } catch (sessionError) {
    console.warn('Failed to check active session for Internet Identity linking, creating new user:', sessionError);
  }
  return null;
}

declare module 'next-auth' {
  interface User {
    role?: string;
  }
  interface Session {
    accessToken?: string;
    user: User & {
      id: string;
      businessUserId?: string;
      loginProvider?: string;
      linkedIcPrincipals?: string[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    businessUserId?: string;
    loginProvider?: string;
    linkedIcPrincipals?: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          email: profile.email,
          name: profile.name,
          image: profile.avatar_url,
          role: 'user' as string,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,

      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: 'user',
        };
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Early return with type narrowing
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== 'string' ||
          typeof credentials.password !== 'string'
        ) {
          return null;
        }

        const email = credentials.email; // TypeScript now knows this is a string
        const password = credentials.password; // TypeScript now knows this is a string

        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email),
        });

        if (!user || !user.password) return null;

        // Compare passwords
        const passwordMatch = await compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: 'ii',
      name: 'Internet Identity',
      credentials: {
        principal: { label: 'Principal', type: 'text' },
        nonceId: { label: 'Nonce ID', type: 'text' },
        nonce: { label: 'Nonce', type: 'text' },
      },
      async authorize(credentials) {
        const { principal, nonceId, nonce } = credentials;

        // Validate inputs
        if (!principal || typeof principal !== 'string' || principal.length < 5) {
          throw new Error('Invalid principal provided. Please try signing in again.');
        }

        if (!nonceId || typeof nonceId !== 'string') {
          throw new Error('Invalid authentication challenge. Please try signing in again.');
        }

        // 5.2: Check nonce exists, unexpired, unused
        // We need to get the nonce from the database first
        const nonceRecord = await db.query.iiNonces.findFirst({
          where: eq(iiNonces.id, nonceId),
        });

        if (!nonceRecord) {
          throw new Error('Authentication challenge not found. Please try signing in again.');
        }

        if (nonceRecord.usedAt) {
          throw new Error('Authentication challenge already used. Please try signing in again.');
        }

        if (nonceRecord.expiresAt < new Date()) {
          throw new Error('Authentication challenge expired. Please try signing in again.');
        }

        // 5.3: Call API route to verify nonce proof
        try {
          if (!nonce) {
            throw new Error('Authentication nonce not provided. Please try signing in again.');
          }

          const nonceStr = nonce as string;

          // Call our API route to verify the nonce
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/ii/verify-nonce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nonce: nonceStr }),
          });

          if (!response.ok) {
            throw new Error('Authentication verification service unavailable. Please try signing in again.');
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error('Authentication proof verification failed. Please try signing in again.');
          }

          const provedPrincipal = result.principal;
          if (provedPrincipal !== principal) {
            throw new Error('Authentication proof mismatch. Please try signing in again.');
          }
        } catch (_error) {
          throw new Error('Unable to verify authentication. Please try signing in again.');
        }

        // 5.5: In single transaction - mark nonce used, create/link user + account, issue session
        try {
          // Mark nonce as used
          await consumeNonce(nonceId);

          // Try to find an existing II account mapping
          const existingAccount = await db.query.accounts.findFirst({
            where: (a, { and, eq }) => and(eq(a.provider, 'internet-identity'), eq(a.providerAccountId, principal)),
          });

          if (existingAccount) {
            const existingUser = await db.query.users.findFirst({
              where: (u, { eq }) => eq(u.id, existingAccount.userId),
            });
            if (existingUser) {
              return {
                id: existingUser.id,
                email: existingUser.email,
                // name: existingUser.name ?? null,
                name: existingUser.name,
                role: existingUser.role,
                icpPrincipal: principal,
              };
            }
          }

          // NEW: Check for active session to link Internet Identity to existing user
          const linkedUser = await linkInternetIdentityToActiveSession(principal);
          if (linkedUser) {
            return linkedUser;
          }

          // Create a new user and account mapping (fallback)
          const insertedUsers = await db
            .insert(users)
            .values({})
            .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
          const newUser = insertedUsers[0];

          await db.insert(accounts).values({
            userId: newUser.id,
            type: 'oidc',
            provider: 'internet-identity',
            providerAccountId: principal,
          });

          // Ensure allUsers entry exists for business linkage
          await db.insert(allUsers).values({ type: 'user', userId: newUser.id }).onConflictDoNothing?.();

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name ?? null,
            role: newUser.role,
            icpPrincipal: principal,
          };
        } catch (_error) {
          throw new Error('Unable to create user account. Please try signing in again.');
        }
      },
    }),
  ],
  callbacks: {
    // async redirect({ url, baseUrl }) {
    //   if (process.env.NODE_ENV === "development") {
    //     console.log("NextAuth redirect callback called with:", { url, baseUrl });
    //     console.log(`Redirecting to profile: ${baseUrl}/user/profile`);
    //   }
    //   return `${baseUrl}/user/profile`;
    // },
    redirect({ url, baseUrl }) {
      const isLoginFlow = url.includes('/api/auth/signin') || url.includes('/api/auth/callback');

      if (isLoginFlow) {
        // Extract language from URL if available, default to 'en'
        let lang = 'en'; // default fallback

        try {
          const urlObj = new URL(url);
          lang = urlObj.searchParams.get('lang') || 'en';
        } catch (_error) {
          // Fallback to default language if URL is invalid
          lang = 'en';
        }

        const redirectTo = `${baseUrl}/${lang}/dashboard`;
        return redirectTo;
      }

      // Otherwise just return the same URL (no redirect)
      return url;
    },

    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Tests route check
      if (pathname.startsWith('/tests')) {
        return ['admin', 'superadmin', 'developer'].includes(auth?.user?.role ?? '');
      }

      // Admin routes check
      if (pathname.startsWith('/admin')) {
        return ['admin', 'superadmin'].includes(auth?.user?.role ?? '');
      }

      // Other protected routes
      if (pathname.startsWith('/user/')) {
        return !!auth;
      }

      return true;
    },

    async jwt({ token, account, user, trigger, session }) {
      // Handle fresh sign-in (new session)
      if (trigger === 'signIn' && account) {
        // Set base session provider (authoritative on each fresh sign-in)
        token.loginProvider = account.provider;

        // On any sign-in, (re)load linked principals once from DB
        const uid = (user?.id as string | undefined) ?? (token.sub as string | undefined);
        if (uid) {
          token.linkedIcPrincipals = await getLinkedPrincipalsFromDB(uid);
        }
      }

      // Handle session update (link/unlink operations)
      if (trigger === 'update' && session?.linkedIcPrincipals) {
        token.linkedIcPrincipals = session.linkedIcPrincipals;
      }

      // Standard token updates
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (user?.role) {
        token.role = user.role;
      }

      // Business user ID lookup
      if (user?.id && !token.businessUserId) {
        try {
          const allUser = await db.query.allUsers.findFirst({
            where: (allUsers, { eq }) => eq(allUsers.userId, user.id!),
            columns: { id: true },
          });
          if (allUser?.id) {
            token.businessUserId = allUser.id;
          }
        } catch (_error) {
          // console.error("[Auth] ❌ Error looking up business user ID:", _error);
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;

        // Add business user ID
        if (token.businessUserId && typeof token.businessUserId === 'string') {
          (session.user as { businessUserId?: string }).businessUserId = token.businessUserId;
        }

        // Add login provider
        if (token.loginProvider) {
          (session.user as { loginProvider?: string }).loginProvider = token.loginProvider;
        }

        // Add linked principals array
        if (token.linkedIcPrincipals) {
          (session.user as { linkedIcPrincipals?: string[] }).linkedIcPrincipals = token.linkedIcPrincipals;
        }
      }

      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }

      return session;
    },
  },
  debug: true,
  events: {
    async createUser({ user }) {
      // Check if there's a temporary user with the same email
      const temporaryUser = await db.query.temporaryUsers.findFirst({
        where: (temporaryUsers, { eq }) => eq(temporaryUsers.email, user.email!),
      });

      // Find the corresponding allUsers entry if temporary user exists
      const allUserEntry = temporaryUser
        ? await db.query.allUsers.findFirst({
            where: (allUsers, { eq }) => eq(allUsers.temporaryUserId, temporaryUser.id),
          })
        : null;

      if (temporaryUser && allUserEntry) {
        // Update the allUsers entry to point to the new permanent user
        await db
          .update(allUsers)
          .set({
            type: 'user',
            userId: user.id,
            temporaryUserId: null,
          })
          .where(eq(allUsers.id, allUserEntry.id));

        // Delete the temporary user since we've migrated their data
        await db.delete(temporaryUsers).where(eq(temporaryUsers.id, temporaryUser.id));
      } else {
        // No temporary user found, create a new allUsers entry
        await db.insert(allUsers).values({
          type: 'user',
          userId: user.id,
        });
      }
    },
    async linkAccount(account) {
      console.log('[Auth] 🔗 Account linked:', account);
    },
    async signIn({ user: _user, account: _account, profile: _profile }) {},
    async signOut(_message) {},
  },
});

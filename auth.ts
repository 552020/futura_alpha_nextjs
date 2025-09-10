// import NextAuth, { DefaultSession } from "next-auth";

import NextAuth, { type DefaultSession } from "next-auth";
import "next-auth/jwt";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/db";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt"; // make sure bcrypt is installed
import { allUsers, temporaryUsers, users, accounts, iiNonces } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { backendActor } from "@/ic/backend";
import { validateNonce, consumeNonce } from "@/lib/ii-nonce";

// console.log("--------------------------------");
// console.log("auth.ts");
// console.log("--------------------------------");
// console.log("NODE_ENV:", process.env.NODE_ENV);

export type UserType = "user" | "admin" | "superadmin" | "developer";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    accessToken?: string;
    user: User & {
      id: string;
      businessUserId?: string;

      /** ICP Principal Co-Auth System */
      icpPrincipal?: string; // Only when II co-auth is active (activeIcPrincipal)
      linkedIcPrincipal?: string; // Always available if user has linked II
      loginProvider?: string; // Base session provider for UI logic
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Add role to JWT */
    role?: string;
    businessUserId?: string;

    /** ICP Principal Co-Auth System */
    loginProvider?: string; // Base session provider (e.g., "google") - authoritative on each fresh sign-in
    activeIcPrincipal?: string; // II co-auth flag - only when II is currently proven
    activeIcPrincipalAssertedAt?: number; // When II proof was last verified (for TTL) - timestamp
    linkedIcPrincipal?: string; // Stored Principal from DB (identifier only, not proof)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
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
          role: "user" as string,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,

      profile(profile) {
        // console.log("--------------------------------");
        // console.log("Google profile:", profile);
        // console.log("--------------------------------");
        return {
          id: profile.sub, // ✅ crucial line!
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: "user",
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Early return with type narrowing
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
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
      id: "ii",
      name: "Internet Identity",
      credentials: {
        principal: { label: "Principal", type: "text" },
        nonceId: { label: "Nonce ID", type: "text" },
        nonce: { label: "Nonce", type: "text" },
      },
      async authorize(credentials) {
        const { principal, nonceId, nonce } = credentials;
        // console.log("[II] authorize:start", { principal, nonceId });

        // Validate inputs
        if (!principal || typeof principal !== "string" || principal.length < 5) {
          // console.log("[II] authorize:invalid-principal", { principal });
          throw new Error("Invalid principal provided. Please try signing in again.");
        }

        if (!nonceId || typeof nonceId !== "string") {
          // console.log("[II] authorize:invalid-nonceId", { nonceId });
          throw new Error("Invalid authentication challenge. Please try signing in again.");
        }

        // 5.2: Check nonce exists, unexpired, unused
        // We need to get the nonce from the database first
        const nonceRecord = await db.query.iiNonces.findFirst({
          where: eq(iiNonces.id, nonceId),
        });

        if (!nonceRecord) {
          // console.log("[II] authorize:nonce-not-found", { nonceId });
          throw new Error("Authentication challenge not found. Please try signing in again.");
        }

        if (nonceRecord.usedAt) {
          // console.log("[II] authorize:nonce-already-used", { nonceId });
          throw new Error("Authentication challenge already used. Please try signing in again.");
        }

        if (nonceRecord.expiresAt < new Date()) {
          // console.log("[II] authorize:nonce-expired", { nonceId });
          throw new Error("Authentication challenge expired. Please try signing in again.");
        }

        // 5.3: Call API route to verify nonce proof
        try {
          if (!nonce) {
            // console.log("[II] authorize:no-nonce-provided", { nonceId, principal });
            throw new Error("Authentication nonce not provided. Please try signing in again.");
          }

          const nonceStr = nonce as string;
          // console.log("[II] authorize:verifying-nonce", { nonceId, principal, nonceLength: nonceStr.length });

          // Call our API route to verify the nonce
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
          const response = await fetch(`${baseUrl}/api/ii/verify-nonce`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nonce: nonceStr }),
          });

          if (!response.ok) {
            // console.error("[II] authorize:api-error", { status: response.status, statusText: response.statusText });
            throw new Error("Authentication verification service unavailable. Please try signing in again.");
          }

          const result = await response.json();

          if (!result.success) {
            // console.log("[II] authorize:verification-failed", { error: result.error });
            throw new Error("Authentication proof verification failed. Please try signing in again.");
          }

          const provedPrincipal = result.principal;
          if (provedPrincipal !== principal) {
            // console.log("[II] authorize:principal-mismatch", {
            //   claimed: principal,
            //   proved: provedPrincipal,
            // });
            throw new Error("Authentication proof mismatch. Please try signing in again.");
          }

          // console.log("[II] authorize:nonce-verified", { principal, nonceId });
        } catch (error) {
          // console.error("[II] authorize:verification-error", error);
          throw new Error("Unable to verify authentication. Please try signing in again.");
        }

        // 5.5: In single transaction - mark nonce used, create/link user + account, issue session
        try {
          // Mark nonce as used
          await consumeNonce(nonceId);

          // Try to find an existing II account mapping
          const existingAccount = await db.query.accounts.findFirst({
            where: (a, { and, eq }) => and(eq(a.provider, "internet-identity"), eq(a.providerAccountId, principal)),
          });

          if (existingAccount) {
            const existingUser = await db.query.users.findFirst({
              where: (u, { eq }) => eq(u.id, existingAccount.userId),
            });
            if (existingUser) {
              // console.log("[II] authorize:found-existing", { userId: existingUser.id, principal });
              return {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                role: existingUser.role,
                icpPrincipal: principal,
              };
            }
          }

          // Create a new user and account mapping
          const insertedUsers = await db
            .insert(users)
            .values({})
            .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
          const newUser = insertedUsers[0];

          await db.insert(accounts).values({
            userId: newUser.id,
            type: "oidc",
            provider: "internet-identity",
            providerAccountId: principal,
          });

          // Ensure allUsers entry exists for business linkage
          await db.insert(allUsers).values({ type: "user", userId: newUser.id }).onConflictDoNothing?.();

          // console.log("[II] authorize:created", { userId: newUser.id, principal });

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            icpPrincipal: principal,
          };
        } catch (error) {
          // console.error("[II] authorize:db-error", error);
          throw new Error("Unable to create user account. Please try signing in again.");
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
      const isLoginFlow = url.includes("/api/auth/signin") || url.includes("/api/auth/callback");

      if (isLoginFlow) {
        // Extract language from URL if available, default to 'en'
        let lang = "en"; // default fallback
        let urlParseSuccess = false;

        try {
          const urlObj = new URL(url);
          lang = urlObj.searchParams.get("lang") || "en";
          urlParseSuccess = true;
          // console.log("[NextAuth] Successfully parsed URL:", { url, lang });
        } catch (error) {
          // console.warn("[NextAuth] Invalid URL in redirect callback - using fallback:", {
          //   invalidUrl: url,
          //   error: error instanceof Error ? error.message : String(error),
          //   fallbackLang: "en",
          //   baseUrl,
          // });
          // Fallback to default language if URL is invalid
          lang = "en";
        }

        const redirectTo = `${baseUrl}/${lang}/dashboard`;
        // console.log("[NextAuth] Redirecting after login:", {
        //   redirectTo,
        //   urlParseSuccess,
        //   originalUrl: url,
        //   baseUrl,
        //   lang,
        // });
        return redirectTo;
      }

      // Otherwise just return the same URL (no redirect)
      return url;
    },

    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      // console.log("NextAuth authorized callback called with pathname:", pathname);

      // Tests route check
      if (pathname.startsWith("/tests")) {
        return ["admin", "superadmin", "developer"].includes(auth?.user?.role ?? "");
      }

      // Admin routes check
      if (pathname.startsWith("/admin")) {
        return ["admin", "superadmin"].includes(auth?.user?.role ?? "");
      }

      // Other protected routes
      if (pathname.startsWith("/user/")) {
        return !!auth;
      }

      return true;
    },

    async jwt({ token, account, user, trigger, session }) {
      console.log("🔐 [JWT] Callback triggered with:", {
        trigger,
        hasUser: !!user,
        tokenKeys: Object.keys(token),
        userKeys: user ? Object.keys(user) : "no user",
      });

      // 🚫 CRITICAL: NO database writes in JWT callback
      // Linking/unlinking happens in API routes or events.linkAccount/unlinkAccount

      // Handle fresh sign-in (new session) - v5
      if (trigger === "signIn" && account) {
        console.log("🆕 [JWT] Fresh sign-in detected (v5)");

        // Set base session provider (authoritative on each fresh sign-in)
        token.loginProvider = account.provider;
        console.log("🔑 [JWT] Set loginProvider:", token.loginProvider);

        // Clear any existing II co-auth flags on fresh sign-in
        if (account.provider !== "internet-identity") {
          console.log("🧹 [JWT] Clearing II co-auth flags (non-II sign-in)");
          delete token.activeIcPrincipal;
          delete token.activeIcPrincipalAssertedAt;
        }

        // One-time fetch of linkedIcPrincipal from DB (avoid first-pass race)
        if (!token.linkedIcPrincipal) {
          const uid = (user?.id as string | undefined) ?? (token.sub as string | undefined);
          if (uid) {
            try {
              const iiAccount = await db.query.accounts.findFirst({
                where: (a, { and, eq }) => and(eq(a.userId, uid), eq(a.provider, "internet-identity")),
                columns: { providerAccountId: true },
              });
              if (iiAccount?.providerAccountId) {
                token.linkedIcPrincipal = iiAccount.providerAccountId;
                console.log("🔗 [JWT] Set linkedIcPrincipal from DB:", token.linkedIcPrincipal);
              }
            } catch (error) {
              console.warn("⚠️ [JWT] Failed to fetch linkedIcPrincipal:", error);
            }
          }
        }
      }

      // Handle session update (II co-auth activation/clearing) - NextAuth v5
      if (trigger === "update" && session) {
        console.log("🔄 [JWT] Session update triggered (v5)");

        // Set co-auth when provided
        if ((session as any).activeIcPrincipal) {
          token.activeIcPrincipal = (session as any).activeIcPrincipal as string;
          token.activeIcPrincipalAssertedAt = Date.now();
          console.log("✅ [JWT] Set activeIcPrincipal via update():", token.activeIcPrincipal);
        }

        // Clear co-auth when explicitly requested
        if ((session as any).clearActiveIc === true) {
          delete token.activeIcPrincipal;
          delete token.activeIcPrincipalAssertedAt;
          console.log("🧹 [JWT] Cleared activeIcPrincipal via update()");
        }
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
            // console.log("[Auth] ✅ Business user ID added to token:", {
            //   authUserId: user.id,
            //   businessUserId: allUser.id,
            // });
          } else {
            // console.warn("[Auth] ⚠️ No allUsers entry found for Auth.js user:", user.id);
          }
        } catch (error) {
          // console.error("[Auth] ❌ Error looking up business user ID:", error);
        }
      }

      return token;
    },

    session({ session, token }) {
      //   console.log("--------------------------------");
      //   console.log("NextAuth session callback called with session:", session);
      //   console.log("NextAuth session callback called with token:", token);
      //   console.log("--------------------------------");

      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;

        // Add business user ID
        if (token.businessUserId && typeof token.businessUserId === "string") {
          (session.user as { businessUserId?: string }).businessUserId = token.businessUserId;
        }
        // Add ICP Principal Co-Auth System fields
        if (token.loginProvider) {
          (session.user as { loginProvider?: string }).loginProvider = token.loginProvider;
        }

        if (token.linkedIcPrincipal) {
          (session.user as { linkedIcPrincipal?: string }).linkedIcPrincipal = token.linkedIcPrincipal;
        }

        // Only expose icpPrincipal when II co-auth is active
        if (token.activeIcPrincipal && token.activeIcPrincipalAssertedAt) {
          (session.user as { icpPrincipal?: string; icpPrincipalAssertedAt?: number }).icpPrincipal =
            token.activeIcPrincipal;
          (session.user as { icpPrincipal?: string; icpPrincipalAssertedAt?: number }).icpPrincipalAssertedAt =
            token.activeIcPrincipalAssertedAt;
        } else {
          delete (session.user as any).icpPrincipal;
          delete (session.user as any).icpPrincipalAssertedAt;
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
      // console.log("[Auth] ✅ User created:", user);

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
        // console.log("[Auth] 🚀 Promoting temporary user to permanent user:", {
        //   temporaryUserId: temporaryUser.id,
        //   newUserId: user.id,
        //   allUserId: allUserEntry.id,
        //   email: user.email,
        // });

        // Update the allUsers entry to point to the new permanent user
        await db
          .update(allUsers)
          .set({
            type: "user",
            userId: user.id,
            temporaryUserId: null,
          })
          .where(eq(allUsers.id, allUserEntry.id));

        // Delete the temporary user since we've migrated their data
        await db.delete(temporaryUsers).where(eq(temporaryUsers.id, temporaryUser.id));

        // console.log("[Auth] ✅ Successfully promoted user");
      } else if (temporaryUser) {
        // console.log("[Auth] ⚠️ Found temporary user but no corresponding allUsers entry:", {
        //   temporaryUserId: temporaryUser.id,
        //   email: user.email,
        // });
      } else {
        // No temporary user found, create a new allUsers entry
        // console.log("[Auth] 🆕 Creating new allUsers entry for:", {
        //   userId: user.id,
        //   email: user.email,
        // });

        await db.insert(allUsers).values({
          type: "user",
          userId: user.id,
        });

        // console.log("[Auth] ✅ Successfully created allUsers entry");
      }
    },
    async linkAccount(account) {
      console.log("[Auth] 🔗 Account linked:", account);
      // Note: linkedIcPrincipal will be fetched on next sign-in
      // No need to update token here - JWT callback handles it
    },
    async signIn({ user, account, profile }) {
      // console.log("[Auth] 👋 User signed in:", { user, account, profile });
    },
    async signOut(message) {
      if ("session" in message) {
        // console.log("[Auth] User signed out, session object:", message.session);
      } else if ("token" in message) {
        // console.log("[Auth] User signed out, JWT token:", message.token);
      }
    },
  },
});

# auth.md

### **0. Imports Overview**

```ts
import NextAuth, { type DefaultSession } from 'next-auth';
import 'next-auth/jwt';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db/db';
import { compare } from 'bcrypt';
```

1. `import NextAuth, { type DefaultSession } from "next-auth";`
   - Main import for NextAuth.js, provides the core `NextAuth()` function and `DefaultSession` types for extending sessions.

2. `import "next-auth/jwt";`
   - Extends NextAuth types (JWT-specific augmentation). Required if you're customizing the JWT token structure.

3. `import GitHub from "next-auth/providers/github";`
   - GitHub OAuth provider for authentication.

4. `import Google from "next-auth/providers/google";`
   - Google OAuth provider for authentication.

5. `import { DrizzleAdapter } from "@auth/drizzle-adapter";`
   - Adapter to connect NextAuth to your database via Drizzle ORM.

6. `import { db } from "@/db/db";`
   - Your local database instance (configured Drizzle instance).

7. `import CredentialsProvider from "next-auth/providers/credentials";`
   - Provider that enables custom email/password-based authentication.

8. `import { compare } from "bcrypt";`
   - Utility function to compare plain text and hashed passwords.

### NextAuth

We are using the version 5 of NextAuth, which is being rebranded into [Authjs](https://authjs.dev/).

The whole `auth.ts` containes basically just 1 function:

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Some Code
});
```

Basically we are initializing and instantiating the NextAuth object, and we extract from that object 4 objects that we export:

- handlers
- auth
- signIn
- signOut

We pass a a big initialization object into `NextAuth({})` containing
5 objects:

- adapter
- session
- providers
- callbacks
- debug

This is what is also suggested in the docs, in the [installation](https://authjs.dev/getting-started/installation). We do it in the suggested file `auth.ts`.

```ts
import NextAuth from 'next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [],
});
```

### **1. adapter** as initialization object for NextAuth

- **Purpose:** Tells NextAuth **where to save users, sessions, etc.**
- **Type:** A single adapter object (e.g., `DrizzleAdapter(db)`).
- **Role:** Used for DB persistence.

```ts
adapter: DrizzleAdapter(db);
```

**Used to:**

- Save users on first login.
- Update sessions.
- Manage accounts linked to OAuth (e.g., GitHub user linked to DB user).

---

### **2. Session** as initi object for NextAuth

### **3. Providers** as initi object for NextAuth

- **Purpose:** Initializes external or custom providers (GitHub, Google, Credentials).
- **What it does:** Defines "how users can log in".
- **Type:** Array of provider objects.
- **You pass profile() here for OAuth providers!**

```ts
providers: [
  GitHub({
    clientId: "...",
    clientSecret: "...",
    profile(profile) { ... return mapped profile ... }
  }),
  Google({ ... }),
  CredentialsProvider({ ... })
]
```

The providers object is an array of providers, like `GitHub`, `Google`, or for email/password authentication `CredentialProvider`. For the third party OAuth service, we need a clientId and a clientSecret, that we get from them when we register our app.

#### **1. clientId and clientSecret (OAuth Basics)**

**`clientId`** and **`clientSecret`** are something **we provide** to the _provider config_ (e.g., GitHub or Google provider), because they **identify your app to GitHub/Google** when a user tries to log in.

##### ✅ **clientId**

- This is the **public-facing identifier** of your application.
- Think of it like your app’s “username” when communicating with GitHub/Google OAuth servers.
- It **can be visible** to the frontend/browser, because it's passed around in URLs during the OAuth flow.

##### 🔒 **clientSecret**

- This is **private** and should stay on the server-side only.
- It’s like your app’s “password” to prove your backend is authorized to talk to GitHub/Google.
- The OAuth provider uses it to **verify your backend** when exchanging the code for tokens behind the scenes.

---

##### **Why both?**

- **clientId** is used **when redirecting users to GitHub/Google**, so they know which app is requesting access.
- **clientSecret** is used in the **server-to-server token exchange** when your backend sends the “code” back to GitHub/Google to get an **access token** securely, so don't want to **expose the `clientSecret` in frontend code!**

---

#### **1. The `profile(profile)` function**

👉 The **`profile()`** function is part of the provider config you pass to NextAuth, but it runs **AFTER you receive data FROM the provider** (GitHub, Google, etc.).

##### 🧩 Flow:

1. User clicks "Log in with GitHub".
2. They go through GitHub's OAuth login flow.
3. GitHub sends your backend a **profile object** with raw user data (e.g., `id`, `login`, `avatar_url`, `email`).
4. Your custom **`profile()` function** receives that object, and you map or normalize it into **the format NextAuth expects**.

##### **Example**

```js
GitHub({
  clientId: '...',
  clientSecret: '...',
  profile(profile) {
    return {
      id: profile.id, // GitHub ID
      name: profile.name || profile.login, // fallback to login if name missing
      email: profile.email,
      image: profile.avatar_url,
    };
  },
});
```

##### ✅ **So we RECEIVE `profile` from GitHub**, we don’t "give" it to GitHub.

We pass the profile object into each of the single providers. We use GitHub, Google and the CredentialsProvider.

When you use OAuth providers like GitHub or Google, NextAuth internally calls the provider's API to fetch the user's **profile**, which contains information like:

- `id`
- `email`
- `name`
- `avatar_url` (GitHub)
- `picture` (Google)

**Example:**

For **GitHub**, profile looks like:

```json
{
  "id": 123456,
  "login": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://github.com/user123.png"
}
```

For **Google**, profile might look like:

```json
{
  "sub": "123456789",
  "email": "john@gmail.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/url"
}
```

In both cases, you "map" these fields into a user object inside the `profile()` method.

✅ **Your understanding is excellent!** You're definitely getting the hang of how this works! Let's take a deeper dive into each provider’s `profile()` function you’ve written:

---

### **General concept:**

- The `profile(profile)` function **runs after receiving raw data from the provider** (GitHub, Google).
- Your job here is to **normalize or adapt the provider's data** into the format that **Auth.js / NextAuth expects**.

👉 **NextAuth expects a user object that includes at least:**

- `id: string`
- `email: string`
- `name: string`
- `image: string | null`

---

---

### ✅ **1. GitHub Provider Analysis**

```ts
GitHub({
  clientId: process.env.AUTH_GITHUB_ID!,
  clientSecret: process.env.AUTH_GITHUB_SECRET!,
  profile(profile) {
    return {
      id: profile.id.toString(),         // GitHub returns a number; you convert it to string as required
      email: profile.email,              // Comes from GitHub API (can sometimes be null if user has private email)
      name: profile.name,                // Full name from GitHub
      image: profile.avatar_url,         // GitHub avatar URL
      role: "user" as string,            // You add a hardcoded "role" value here
    };
  },
}),
```

### 🧠 **Analysis:**

- ✅ You're correctly handling **GitHub's `id`** which comes as a `number`. Auth.js expects a string, so `.toString()` is perfect.
- ✅ The `email`, `name`, and `avatar_url` fields map directly from the GitHub API to the Auth.js shape.
- ❗ **Note:** Some GitHub profiles may have `email: null` if the user has hidden their email.
- ✅ You're hardcoding `role: "user"`. That’s fine, but later you could dynamically pull roles from your DB if needed.

---

---

### ✅ **2. Google Provider Analysis**

```ts
Google({
  clientId: process.env.AUTH_GOOGLE_ID!,
  clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  profile(profile) {
    console.log("Google profile:", profile);
    return {
      role: profile.role ?? "user", // Default role if not provided
      ...profile,
    };
  },
}),
```

### 🧠 **Analysis:**

- ✅ Google returns a rich profile object with `sub` (unique ID), `email`, `name`, `picture`, etc.
- 🟡 **You are spreading all `profile` values** directly with `...profile` — this might give you extra keys you don’t strictly need (e.g., locale, hd).
- ✅ Adding `role: profile.role ?? "user"` is smart. Though typically **Google doesn’t return a "role"** property, so this will always default to `"user"` for now.

### 📌 Suggestion:

You might want to normalize this more explicitly, like this:

```ts
return {
  id: profile.sub,
  email: profile.email,
  name: profile.name,
  image: profile.picture,
  role: 'user',
};
```

Because:

- Google’s **`sub`** is like GitHub’s `id` — it’s the **unique ID string** for that user on Google.

---

---

### ✅ **3. CredentialsProvider Analysis**

```ts
CredentialsProvider({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    // validation
    if (!credentials?.email || !credentials?.password || typeof credentials.email !== "string" || typeof credentials.password !== "string") {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, credentials.email),
    });

    if (!user || !user.password) return null;

    const passwordMatch = await compare(credentials.password, user.password);
    if (!passwordMatch) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
}),
```

### 🧠 **Analysis:**

- ✅ This is a **classic email/password login** handled via your own database.
- ✅ The `authorize()` function manually:
  - Checks if the provided email & password are valid inputs.
  - Queries your DB using `drizzle-orm`.
  - Verifies the password hash with `bcrypt.compare()`.
  - If everything checks out, you return a **user object** with the expected properties (`id`, `email`, `name`, `role`).

### ✅ **Good:**

- Defensive coding with `!credentials?.email || typeof credentials.email !== "string"` is solid.
- Safe password hashing check.

### 🔔 **Optional improvement:**

- You could return custom **errors** instead of `null` for better UX (e.g., "User not found", "Wrong password").

---

---

### ✅ **Your Summary Is Correct!**

- **You DO receive the `profile` from the provider**.
- You **DO map it** into the format NextAuth expects (with string `id`!).
- The `profile(profile)` **belongs to the provider config** and is used internally by Auth.js when processing logins.

---

Would you like me to also:

1. Help you normalize the **Google profile spread** (`...profile`) into something safer?
2. Suggest an improved **error handling** for the `CredentialsProvider`?

#### **CredentialsProvider**

Yes, exactly! This is your "email + password" authentication flow. You’re manually validating users via your DB.

#### **1b. Role Assignment**

Totally fine! If you're manually updating roles via the database for now, that’s a common thing during early stages. Later you can expose a `/set-role` admin endpoint, but your current approach works.

---

### **4. callbacks** = Hooks into NextAuth lifecycle (as init object for NextAuth())

- **Purpose:** Add custom logic at key points:
  - `jwt`: Change what’s inside the JWT token.
  - `session`: Customize what’s sent to frontend.
  - `authorized`: Protect routes (middleware).
  - `signIn`: Validate on sign-in.

```ts
callbacks: {
  jwt({ token, user }) { ... },
  session({ session, token }) { ... },
  authorized({ request, auth }) { ... },
}
```

**Used to:**

- Modify data before it reaches frontend/backend.
- Guard pages based on session (middleware).
- Add custom fields to session (`role`, `id`, etc.).

---

### **5. session** = Control session strategy

- **Purpose:** Choose if you want **JWTs** or **DB-stored sessions**.
- **Type:** Object.
- **Common values:**

  ```ts
  session: {
    strategy: 'jwt';
  } // (or "database")
  ```

- "jwt" = stateless session via token (stored in cookie).
- "database" = session data is stored server-side in DB.

---

### **5. pages** = Custom NextAuth pages

- **Purpose:** Customize pages like:
  - `/api/auth/signin`
  - `/api/auth/error`
  - `/api/auth/signout`

```ts
pages: {
  signIn: "/custom-signin",
  error: "/auth-error",
}
```

## **HOW TO**

### How to add a role to the user

```ts
declare module 'next-auth' {
  interface User {
    role?: string;
  }
  interface Session {
    accessToken?: string;
    user: User & {
      id: string;
    } & DefaultSession['user'];
  }
}
```

#### Why This Works

1. **Proper Type Extension Order**:
   - First extends `User` interface with `role`
   - Then builds `Session.user` from:
     - Extended `User` (with role)
     - Required `id` field
     - Default session user properties

2. **Type Inheritance Chain**:

   ```
   Session.user = User & { id: string } & DefaultSession["user"]
                  │        │              │
                  │        │              └─ Next-Auth's base user properties
                  │        └─ Required ID field

   ```

#### Failed Attempts

##### Attempt 1: Direct Session.user Extension

```ts
typescript;
interface Session {
  user: {
    id: string;
    role: string;
  } & DefaultSession['user'];
}
```

❌ Failed because: Conflicts with NextAuth's base User type

#### Attempt 2: Separate Role Type

```typescript
interface Session {
  accessToken?: string;
  user: DefaultSession['user'] & {
    id: string;
    role: string;
  };
}
```

❌ Failed because: Doesn't properly extend the User interface

##### Attempt 3: Only Session Extension

```typescript
interface Session {
  user: {
    role: string;
  } & User;
}
```

❌ Failed because: Creates type conflict with existing User properties

#### Key Learnings

1. NextAuth's type system is hierarchical
2. Extensions must happen at the correct level (User before Session)
3. Order of type intersections matters
4. Always extend base types rather than redefining them

#### Usage Example

```typescript
const session = await auth();
if (session?.user?.role === 'admin') {
  // Type-safe role access
}
```

### **2. Suggested Error Handling in CredentialsProvider**

Simple improvement example:

```ts
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Missing email or password");
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, credentials.email),
  });

  if (!user) {
    throw new Error("No user found with this email");
  }

  const passwordMatch = await compare(credentials.password, user.password);
  if (!passwordMatch) {
    throw new Error("Invalid password");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
```

> ⚠️ Careful: In production, you might want to **avoid leaking specific reasons** like "user not found" to avoid enumeration attacks.

---

### **3. Logger with flags**

You could use something like [`pino`](https://getpino.io/) or [`winston`](https://github.com/winstonjs/winston), both very popular.

For example with **pino**:

```bash
npm install pino
```

```ts
// logger.js
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // "debug", "error", "warn"
});
```

Then in your code:

```ts
import { logger } from '@/lib/logger';

logger.debug('This will only log in debug mode');
logger.info('This is general info');
logger.error('Something went wrong');
```

And control with `.env`:

```env
LOG_LEVEL=debug
```

---

### **4. Session Callback Breakdown**

#### What is the session callback?

It's a function in NextAuth that **modifies the session object** sent to the client (browser) whenever you use `useSession()` or `getSession()` on the frontend.

---

#### What is the token?

In **JWT mode** (`session: { strategy: "jwt" }`), NextAuth creates a JWT token containing user info like:

- `sub` (subject = user id by default)
- `role` (custom, you added it)
- `accessToken` (optional, from OAuth)

This token is **stored in a cookie** by NextAuth on the client side (`next-auth.session-token`).

---

#### What is the session object?

The `session` object is the "user-facing" session:

```ts
{
  user: {
    id: "abc123",
    email: "john@example.com",
    role: "admin",
    name: "John"
  },
  accessToken: "xyz",
  expires: "2025-04-10T12:00:00Z"
}
```

---

#### Why do we assign `session.user.id = token.sub`?

Because `sub` = the "subject" claim inside the JWT, which by default is **the user ID**. You’re basically "forwarding" the token's `sub` to the `session.user.id`.

---

### TL;DR

- **token** = JWT payload.
- **session** = what your frontend gets from `useSession()`.
- `token.sub` = default user id field inside the JWT payload.

---

### **5. DrizzleAdapter check**

You can do a simple "is it saving users?" test, like you said. If it creates a new user when signing in via Google or GitHub, then it’s working.

But for **extra safety**, you could also try:

```ts
await db.query.users.findMany();
```

or

```ts
await db.query.users.findFirst({ where: ... });
```

And make sure you’re reading the expected records.

Feel free to share your `db` config if you’d like me to double-check!

---

### **6. Validate Profile Fields**

For GitHub and Google, the fields come from their respective APIs. You can always add a guard:

```ts
profile(profile) {
  return {
    id: profile.id?.toString() ?? "no-id",
    email: profile.email ?? "no-email",
    name: profile.name ?? "anonymous",
    image: profile.avatar_url || profile.picture || "",
    role: "user",
  };
}
```

Or log the whole profile:

```ts
console.log('OAuth profile received:', profile);
```

---

### **7. Callbacks Field**

`callbacks` is an object where you hook into different stages of the NextAuth lifecycle:

- `redirect`
- `authorized`
- `jwt`
- `session`

---

#### Your `authorized` callback

You are **protecting routes** by checking `request.nextUrl.pathname` and `auth.user.role`.

Example:

```ts
if (pathname.startsWith('/tests')) {
  return ['admin', 'superadmin', 'developer'].includes(auth?.user?.role ?? '');
}
```

- ✅ This protects `/tests/*` for certain roles.
- ❗ If your routes could be uppercase (`/Tests`), consider normalizing:

```ts
const pathname = request.nextUrl.pathname.toLowerCase();
```

This ensures `/Tests` and `/tests` behave the same.

---

---

### ✅ Summary of what we covered:

1. ✅ Clear explanation of each import.
2. ✅ What the `profile` object is & role assignment workflow.
3. ✅ Error handling for `CredentialsProvider`.
4. ✅ Recommended logger library.
5. ✅ Full explanation of token/session flow.
6. ✅ How to validate `profile` fields.
7. ✅ Explanation of the `authorized` callback.

---

Would you like me to also give you a cleaned-up version of your `NextAuth` config with these fixes? 😎

### Great! Let's break this down clearly. You're spot on — let’s go deeper into **how NextAuth() is initialized** and what each object’s purpose is.

---

### **The NextAuth() function**

When you call `NextAuth({...})`, you pass **one big configuration object** to it.

**Inside this config object**, you commonly pass 5 major objects (or sections):

###

```ts
NextAuth({
  providers: [],
  adapter: DrizzleAdapter(),
  callbacks: {},
  session: {},
  pages: {},
  // ... and other optional fields
});
```

---

### **The Flow Simplified**

Let’s put this into a flow based on **data you pass / data you receive**.

---

### **WHEN INITIALIZING:**

You pass _static config_ into **NextAuth()**:

1. **providers** → _"Here’s how users log in (GitHub, Google, Email/Pass)"_
2. **adapter** → _"Save everything here (DB)"_
3. **callbacks** → _"Hook into logic, customize data"_
4. **session** → _"Use JWT or DB for sessions"_
5. **pages** → _"My custom pages"_

---

### **WHEN USER LOGS IN:**

**1. If using GitHub/Google (OAuth)**:

- GitHub API sends raw profile data →
- **profile(profile)** callback lets you map this data to NextAuth's user object:
  ```js
  {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    image: profile.avatar_url,
  }
  ```

**2. If using CredentialsProvider**:

- You receive `credentials` (email + password) directly from the user and validate them manually (no external API call here).

---

---

### **How to “name” these sections mentally**

| Object        | Is it data you PASS or RECEIVE?      | Purpose/Role                                 |
| ------------- | ------------------------------------ | -------------------------------------------- |
| **providers** | PASS                                 | Tell NextAuth how users authenticate         |
| **adapter**   | PASS                                 | Define your DB connection                    |
| **callbacks** | PASS callbacks, RECEIVE runtime data | Hook to modify runtime data (session, token) |
| **session**   | PASS                                 | Tell NextAuth how to handle sessions         |
| **pages**     | PASS                                 | Customize your auth pages                    |

---

### 💡 **TL;DR Mental Model**

- **"providers"** = _"How do people log in?"_
- **"adapter"** = _"Where do I store users/sessions?"_
- **"callbacks"** = _"Where do I customize data before it hits the frontend/backend?"_
- **"session"** = _"Do I use JWT or DB?"_
- **"pages"** = _"Custom UIs for login/logout/etc."_

Exactly! You’re on point, let’s break this down 👇

---

---

### **2. `profile(profile)` function**

You’re 100% correct here too:

👉 The **`profile()`** function is part of the provider config you pass to NextAuth, but it runs **AFTER you receive data FROM the provider** (GitHub, Google, etc.).

### 🧩 Flow:

1. User clicks "Log in with GitHub".
2. They go through GitHub's OAuth login flow.
3. GitHub sends your backend a **profile object** with raw user data (e.g., `id`, `login`, `avatar_url`, `email`).
4. Your custom **`profile()` function** receives that object, and you map or normalize it into **the format NextAuth expects**.

---

### **Example**

```js
GitHub({
  clientId: '...',
  clientSecret: '...',
  profile(profile) {
    return {
      id: profile.id, // GitHub ID
      name: profile.name || profile.login, // fallback to login if name missing
      email: profile.email,
      image: profile.avatar_url,
    };
  },
});
```

### ✅ **So we RECEIVE `profile` from GitHub**, we don’t "give" it to GitHub.

---

### **Mental shortcut**

| Step               | Who does what?                               |
| ------------------ | -------------------------------------------- |
| Your app 👉 GitHub | Sends `clientId` + asks user to authorize    |
| GitHub 👉 Your app | Sends back **profile** + OAuth tokens        |
| Your app           | Maps **profile** inside `profile()` function |

---

Would you like me to also show you **how this "code → token" exchange works behind the scenes in OAuth 2.0**, with a diagram of the steps?

Perfect question! Let’s walk through **each NextAuth callback** you have, **what triggers it**, and **why some are called even when you just open the page** — especially that `redirect` one.

---

## ✅ **You currently have 4 callbacks:**

### 1. **`redirect`**

### 2. **`authorized`**

### 3. **`jwt`**

### 4. **`session`**

Let’s go over each with:

- ✅ When it's called
- 🧠 Why it's called (even when you just open the page)
- 🎯 Use case

---

### 1️⃣ `redirect`

```ts
redirect({ url, baseUrl }) {
  return `${baseUrl}/user/profile`;
}
```

#### ✅ When it’s called:

- After **successful login** via any provider (GitHub, Google, Credentials)
- Or when a user **manually visits** `/api/auth/signin?callbackUrl=...`

#### 🧠 Why it shows up just by opening the page:

- If your app is configured to redirect users to `/user/profile` after login,
- And the user already has a valid session (e.g., cookie present),
- The client or server might automatically check session and redirect them there,
  triggering the `redirect` callback again.

**Also**, if you have `signIn()` somewhere with a `callbackUrl`, it gets triggered.

#### 🎯 Use case:

Customize **where users go after login** — e.g., user dashboard, profile page, etc.

---

### 2️⃣ `authorized`

```ts
authorized({ request, auth }) {
  return true; // or conditional
}
```

#### ✅ When it’s called:

- When using **middleware with `auth()` helper from `next-auth`**
- Every time a route is requested that uses that middleware

#### 🧠 Why it's _not_ called by default:

- Only relevant **if you're using `auth()` in `middleware.ts`**.
- You currently **are not** calling `auth()` in your middleware, so this isn't doing anything unless you're planning to secure routes through middleware.

#### 🎯 Use case:

Protect routes at the edge with role checks (e.g., restrict `/admin` to `"admin"` users).

> ⚠️ This is unrelated to the `authorized()` field in `signIn()` callbacks. It's **middleware-specific**.

---

### 3️⃣ `jwt`

```ts
jwt({ token, account, user }) {
  return token;
}
```

#### ✅ When it’s called:

- When a session is being created **or validated**
- Every time you call `getSession()` or `useSession()` and the session is JWT-based
- Also called **on first login**, with `user` and `account` present

#### 🧠 Why it shows up on page load:

- You’re using:
  ```ts
  session: {
    strategy: 'jwt';
  }
  ```
- So every time a page loads and uses `getSession()` or `useSession()`, NextAuth needs to **decode the JWT**, and it calls this callback to do so.

#### 🎯 Use case:

- Add custom fields to token (`token.role`, `token.accessToken`)
- Update or transform token data before session is generated

---

### 4️⃣ `session`

```ts
session({ session, token }) {
  return session;
}
```

#### ✅ When it’s called:

- Every time `useSession()` or `getSession()` is called
- Right after the `jwt()` callback, if you're using JWT strategy

#### 🧠 Why it shows up on page load:

- Likely you are calling `useSession()` in a layout or top-level component
- That triggers a fetch to `/api/auth/session`
- Which triggers `jwt()` → `session()` to build the session object

#### 🎯 Use case:

- Add custom fields to session (`session.user.id`, `session.user.role`)
- Sync fields from JWT → session object visible in the frontend

---

### 🔄 What’s happening when you **just open the app**?

Let’s say you go to `/en`

1. The frontend loads, and somewhere you’re probably calling `useSession()`
2. This triggers:
   - `GET /api/auth/session`
   - → triggers `jwt()` to validate the token
   - → then `session()` to return session to frontend
3. If a session is active, the user might be **automatically redirected** via:
   - logic in your app
   - `callbackUrl` handling in NextAuth
   - OR a pending auth flow that triggers `redirect()`

---

### 🧠 Visual Timeline

| Trigger                              | Callback(s) triggered                                             |
| ------------------------------------ | ----------------------------------------------------------------- |
| User signs in                        | `jwt()` (with `user` + `account`), `session()`, then `redirect()` |
| Page with `useSession()`             | `jwt()` → `session()`                                             |
| Secure page with middleware `auth()` | `authorized()`                                                    |
| Manual login redirect                | `redirect()`                                                      |

---

### ✅ TL;DR

- You have **4 callbacks**
- `redirect()` shows up on start **if session is present or login flow just completed**
- `jwt()` + `session()` are triggered by `useSession()` calls
- `authorized()` only matters if you’re securing pages in **middleware with `auth()`**

---

Want help reviewing where `useSession()` is used in your app so we can trace exactly what's triggering the `redirect()` at startup?

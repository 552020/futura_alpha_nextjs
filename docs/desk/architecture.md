<!-- desk: Architecture -->

# How Futura is built

For readers who know their way around the web but not around this codebase. State of 20 November 2026.

<img src="/diagrams/futura-running.png" alt="Futura running: who talks to whom" />

More sketches, step by step (sign-in, uploads, the local test setup): [Sketches](/desk/sketches). For developers, the same system followed through the code: [How Futura works in the code](/desk/architecture-code).

## The idea in one paragraph

Futura keeps photos, videos and notes ("memories") and lets people share them, hand them over (photographer to couple) and keep them for the long term. Everything works like a normal web service. A person can instead choose to keep their memories on the Internet Computer (ICP), a public network where data sits in a program the person controls with their own key. That choice is the "forever" promise.

## The parts

| Part              | What it is                                                  | What it does                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app           | Next.js on Vercel                                           | All pages (dashboard, galleries, sharing, settings) in English, German and Turkish, plus the server functions behind them                                                                                                  |
| Login             | Auth.js (NextAuth v5)                                       | Google, GitHub, e-mail and password, or Internet Identity. An Internet Identity can also be linked to an existing account                                                                                                  |
| Database          | Postgres                                                    | Accounts, memory details, galleries, shares, and a "storage edge" record per memory saying where each copy lives. Runs on Neon today; the app speaks plain Postgres, so an own server (Hetzner) works without code changes |
| Files             | Vercel Blob or Amazon S3                                    | The photo and video files, plus the smaller display and thumbnail versions made when a file is uploaded                                                                                                                    |
| Backend canister  | Rust program on ICP mainnet (`izhgj-eiaaa-aaaaj-a2f7q-cai`) | One "capsule" per person holding their memories, galleries and files. Hands files out only through short-lived signed links                                                                                                |
| Internet Identity | DFINITY's login service on ICP                              | A passkey (fingerprint, face, security key) gives each person a key of their own                                                                                                                                           |
| Canister factory  | Rust program on ICP                                         | Planned: a personal canister for each person who wants their data fully separate. Built, not in use                                                                                                                        |
| Outside services  | Mailgun, PostHog, OpenAI / Gemini                           | E-mails, visitor analytics, and the AI chat ("Transcendance")                                                                                                                                                              |

## Three things worth knowing

**1. Web2 is the default, Web3 is a choice.** In the settings a person picks where their memories are kept: the database and file store (Web2), or their capsule on ICP (Web3). Switching changes where new memories go; existing ones are not moved. The storage-edge records keep track of where each memory actually is.

**2. The person's own key writes to ICP, not Futura's server.** The browser talks to the canister directly with the key Internet Identity gave the person. The Futura server only checks sign-in proofs there. So Futura cannot quietly change or delete what someone put in their capsule.

**3. Signing in with Internet Identity is a small handshake.** The web app hands the browser a one-time code; the browser registers it on the canister with the person's key; the web app then asks the canister who registered that code. Only if the answers match is the person signed in.

## Where the code lives

| Repository                    | Contents                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `552020/futura_alpha_nextjs`  | The web app, database schema, tests, this desk                                                             |
| `552020/futura_alpha_icp`     | The canisters (Rust), their interface files, the local ICP setup (`dfx.json`) and the backend test scripts |
| `552020/futura_docs_internal` | Older internal notes: grant milestones, research, business memos                                           |

## How it is checked

| Check                                        | What it covers                                                                   | Last result   |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ------------- |
| Web unit tests (Vitest)                      | Auth, sign-in redirects, sharing, galleries, database connector, storage records | 140 pass      |
| Internet Identity browser tests (Playwright) | Real sign-in, linking, sign-out against a local ICP network                      | 8 of 8 pass   |
| Canister unit tests (Rust)                   | Capsules, access rules, uploads, tokens, galleries                               | 261 pass      |
| Canister integration tests (shell)           | The deployed canister on a local network                                         | 19 of 19 pass |
| GitHub CI                                    | Install, build and a smoke test on every push to the web app                     | green         |

How to run the local ICP network and the browser tests: `e2e/README.md` in the web app.

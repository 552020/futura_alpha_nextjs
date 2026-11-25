<!-- desk: Architecture -->

# How Futura works in the code

For developers who open the two repositories for the first time. [How Futura is built](/desk/architecture) gives the parts and the idea; this page follows the code: where things live, what is stored where, and what happens on sign-in, upload and reading. State of 25 November 2026, read from `main` of both repositories.

Pictures of the same flows: [Sketches](/desk/sketches).

## The two programs

Futura is two programs that share one browser.

| Program          | Repository                        | Runs on                 | Language                       |
| ---------------- | --------------------------------- | ----------------------- | ------------------------------ |
| Web app          | `futura_alpha_nextjs`             | Vercel (Node 24)        | TypeScript, Next.js App Router |
| Backend canister | `futura_alpha_icp`, `src/backend` | Internet Computer (ICP) | Rust                           |

The browser talks to both. The web app's server talks to Postgres, to the file store (S3 or Vercel Blob), and to the canister for one purpose only: checking a sign-in.

Two words used throughout:

- **Web2 side:** Postgres plus S3 or Vercel Blob. The default.
- **Web3 side:** the backend canister. A person's data there sits in their **capsule**.

The code and the database often say `neon` where they mean "the Web2 database". That is a label from the time the database ran only on Neon; it does not name the provider. Renaming it would need a data migration in the mainnet canister, so it stays.

## Web app: where things live

| Path                                    | Contents                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.ts`                               | Auth.js configuration: the four login providers and what goes into the session                                                           |
| `src/middleware.ts`                     | Adds the language prefix (`/en`, `/de`, `/tr`) to page URLs                                                                              |
| `src/app/[lang]/`                       | Pages: dashboard, gallery, shared, settings, onboarding, journal, marketing pages                                                        |
| `src/app/[lang]/dictionaries/`          | The texts in the three languages                                                                                                         |
| `src/app/api/`                          | Server routes, 56 of them, grouped by resource: `memories`, `folders`, `galleries`, `shares`, `upload`, `storage`, `ii`, `auth`, `admin` |
| `src/app/desk/`                         | This desk                                                                                                                                |
| `src/db/`                               | Drizzle schema (`tables.ts`, `enums.ts`, `relations.ts`), the connection (`pg-pool.ts`), migrations                                      |
| `src/services/`                         | The logic behind routes and pages: `upload`, `memory`, `gallery`, `folder`, `sharing`, `storage-edges`, `capsule`                        |
| `src/lib/usecases/`                     | Steps that touch several services, such as deleting a memory with its files                                                              |
| `src/ic/`                               | Everything for talking to ICP from the browser: agent, Internet Identity client, the generated canister bindings (`declarations/`)       |
| `src/lib/server-actor.ts`               | The server's own, anonymous connection to the canister                                                                                   |
| `src/workers/image-processor.worker.ts` | Makes the smaller image versions in the browser                                                                                          |
| `e2e/`, `src/tests-unit/`               | Playwright browser tests, Vitest unit tests                                                                                              |

Routes do not hold much logic. A route checks the session, then calls a function in `src/services/`.

## What Postgres holds

The schema is `src/db/tables.ts`, about 35 tables. These carry the system:

| Table                                                              | What a row is                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user`, `account`, `session`, `verificationToken`, `authenticator` | Auth.js tables. A linked Internet Identity is an `account` row with provider `internet-identity` and the principal as account id                                         |
| `temporary_user`                                                   | Someone who uploaded during onboarding, or was invited, before making an account                                                                                         |
| `all_user`                                                         | One row per person, pointing at either a `user` or a `temporary_user`. Everything a person owns points here, so content survives the step from temporary to full account |
| `memories`                                                         | One memory: type (image, video, note, document, audio), title, owner, folder, sharing status                                                                             |
| `memory_assets`                                                    | The files of a memory: `original`, `display`, `thumb`, `placeholder`. One row per type per memory, with location, key, size and processing status                        |
| `folders`, `gallery`, `gallery_item`                               | How memories are grouped                                                                                                                                                 |
| `resource_membership`                                              | Who may do what with a memory, folder or gallery: a role and a permission bit mask                                                                                       |
| `resource_share_tokens`                                            | Public and magic links                                                                                                                                                   |
| `storage_edges`                                                    | Where each piece of a memory really is (next section)                                                                                                                    |
| `user_hosting_preferences`                                         | The person's choice of Web2 or Web3                                                                                                                                      |
| `ii_nonce`                                                         | One-time codes for Internet Identity sign-in, stored as hashes                                                                                                           |

The connection is plain node-postgres through Drizzle. `DATABASE_URL` is the pooled connection the app uses; `DATABASE_URL_UNPOOLED` is for scripts and `drizzle-kit`.

### Storage edges

A memory has two kinds of pieces: its details (`metadata`) and its files (`asset`). A storage edge is one row saying "this piece of this memory is present at this location".

| Field                    | Meaning                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `memoryId`, `memoryType` | Which memory. Not a foreign key: a memory that exists only on ICP has edges but no row in `memories` |
| `artifact`               | `metadata` or `asset`                                                                                |
| `locationMetadata`       | For metadata: `neon` or `icp`                                                                        |
| `locationAsset`          | For assets: `s3`, `vercel_blob`, `icp` (also `arweave`, `ipfs`, `neon`, all unused)                  |
| `present`                | Whether the piece is really there                                                                    |
| `syncState`              | `idle`, `migrating` or `failed`                                                                      |

The table is the only place on the Web2 side that knows about memories kept on ICP. It is also what a later "copy this memory to the other side" would write into; no such migration runs today.

## The canister: where things live

`futura_alpha_icp/src/backend/src/`:

| Path                                           | Contents                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `lib.rs`                                       | Every public method, about 100. Thin: each one calls into a module                                                   |
| `capsule/`, `capsule_store/`, `capsule_acl.rs` | The capsule, how it is stored, and who may read, write and delete                                                    |
| `memories/`                                    | Creating, reading, updating and deleting memories and their assets                                                   |
| `gallery/`, `folder/`                          | Grouping, inside a capsule                                                                                           |
| `upload/`, `session/`                          | Chunked uploads and the blob store                                                                                   |
| `http/`                                        | The canister's HTTP side: serving files against signed tokens                                                        |
| `auth.rs`, `user.rs`                           | The sign-in proof                                                                                                    |
| `admin.rs`                                     | Who is an admin: a fixed superadmin, the canister's controllers, stored admins, and in a personal canister its owner |
| `canister_factory/`                            | An older attempt at moving a capsule into a canister of its own. Written, switched off                               |
| `personal.rs`                                  | Personal mode: the same program with one fixed owner, in a canister of their own                                     |
| `legacy.rs`                                    | Inheritance: trustees confirm a death, then heirs may read                                                           |
| `upgrade.rs`                                   | What survives a code upgrade                                                                                         |

Next to the backend, `src/canister_factory` is a second, small canister: the factory that creates personal canisters and hands them over. Both are explained in [Personal canisters and inheritance](/desk/personal-canisters).

The interface is `src/backend/backend.did`. The TypeScript bindings in the web app (`src/ic/declarations/`) are generated from it by `dfx`.

### The capsule

A capsule is one record per person, keyed by an id, with indexes by subject and by owner.

| Field                              | Meaning                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `subject`                          | Who the capsule is about: a principal, or an opaque id for someone without one (for example a deceased person) |
| `owners`, `controllers`            | Who has full control                                                                                           |
| `memories`, `galleries`, `folders` | The content, as maps inside the record                                                                         |
| `connections`, `connection_groups` | The person's contacts and groups                                                                               |
| `bound_to_neon`                    | Whether a Web2 account is linked                                                                               |
| `hosting_preferences`              | A copy of the person's Web2/Web3 choice                                                                        |

Access to a capsule: owners, controllers and the subject may read and write; only owners and controllers may delete. In a personal canister there is one more gate in front of everything: update calls from anyone but the owner are refused before they run, except a trustee's confirmation and the sign-in handshake.

Each memory, gallery and folder also carries its own list of **access entries**. An entry names a person (or is public), a role, a permission mask (view, download, share, manage, own) and a condition: immediately, after a date, until a date, or after an event such as "after death". "After death" opens when the trustees named by the owner have confirmed and a waiting period has passed; other events the owner records by hand. This is tested on a local network and not on mainnet yet.

A memory's files come in three forms:

- **inline:** the bytes sit inside the memory record. Only for tiny things (the placeholder); 32 KB per capsule in total.
- **internal blob:** the bytes sit in the canister's blob store, the memory holds a reference.
- **external blob:** the memory holds a pointer to a file somewhere else (S3, Vercel Blob).

### Stable memory

Canister data that must survive a code upgrade lives in stable memory, split into numbered regions (`memory.rs`):

| Region | Contents                                                        |
| ------ | --------------------------------------------------------------- |
| 0 to 2 | Capsules and their two indexes                                  |
| 6 to 8 | Blob chunks, blob details, blob counter                         |
| 9      | Admins                                                          |
| 10     | The owner of a personal canister (empty in the shared canister) |
| 11     | State of the old capsule-moving code                            |
| 42     | The secret that signs file links                                |
| 3 to 5 | Reserved for upload sessions, unused                            |

Kept only in working memory, and so lost on every upgrade: upload sessions in progress and sign-in proofs. Both are short-lived by nature, so an upgrade interrupts uploads and sign-ins that are under way and nothing else.

## Signing in

Sessions are Auth.js JWT cookies. Four providers are set up in `auth.ts`: Google, GitHub, e-mail with password, and Internet Identity (provider id `ii`).

The first three are standard. Internet Identity needs its own handshake, because the server cannot see the passkey; it has to learn the person's principal from somewhere it trusts. That somewhere is the canister.

1. The browser opens Internet Identity (`src/ic/ii.ts`). The person uses their passkey; the browser now holds a key that ICP accepts as that person's principal.
2. The browser asks the server for a one-time code: `POST /api/ii/challenge`. The server stores the code's hash in `ii_nonce` with an expiry (3 minutes by default).
3. The browser calls `register_with_nonce(code)` on the canister, signed with the person's key. The canister notes "this principal presented this code" and creates the person's capsule if there is none.
4. The browser signs in to Auth.js with principal and code.
5. The server asks the canister `verify_nonce(code)` through its anonymous connection and gets back a principal. If it equals the one claimed, the code is marked used and the session is issued.

If someone is already signed in with Google, GitHub or a password when step 5 succeeds, the principal is linked to that account instead of making a new one. The session then carries `linkedIcPrincipals`. Routes: `/api/auth/ii/link`, `/unlink`, `/linked`.

Admin pages check the role in the session (`admin` or `superadmin`); `ADMIN_EMAILS` grants it by address.

## Uploading

The browser decides where a file goes from the person's hosting preferences (`src/services/upload/single-file-processor.ts`): ICP if chosen, otherwise Vercel Blob if chosen, otherwise S3.

For images, the browser makes the smaller versions itself, in a Web Worker: `display` (longest side up to 2048 px), `thumb` (up to 512 px), both WebP, and a tiny `placeholder`. JPEG, PNG and WebP are processed; other formats keep only the original.

### To S3

1. `POST /api/upload/s3/presign` returns signed upload links: one for the original and, for images, one each for display and thumb.
2. Two things run side by side. The original goes straight from the browser to S3, then `POST /api/upload/complete` creates the `memories` row, the `memory_assets` row for the original and the storage edges. Meanwhile the worker makes the smaller versions and the browser uploads them.
3. A second `POST /api/upload/complete` records the smaller versions. If making them failed, they are recorded as `failed` and the original still stands.

The file bytes never pass through Futura's server. Reading works the same way: the server signs a download link valid for one hour.

Vercel Blob follows the same shape with its own grant route (`/api/upload/vercel-blob/grant`).

### To ICP

All of this is the browser talking to the canister with the person's key (`src/services/upload/icp-with-processing.ts`):

1. Find the person's capsule, or create it.
2. `uploads_begin`, then `uploads_put_chunk` for each 1.8 MB piece, then `uploads_finish` with the file's SHA-256 and length. The canister checks both and returns a blob id.
3. `memories_create_with_internal_blobs` creates the memory pointing at that blob.
4. The smaller versions are uploaded the same way and attached with `memories_add_asset`; the placeholder goes inline with `memories_add_inline_asset`.
5. Last, the browser tells the Web2 side: `PUT /api/storage/edges` with one metadata edge and one asset edge per file, all with location `icp`.

Only the person who began an upload session can add pieces to it or finish it.

Limits: the browser allows 512 pieces, about 920 MB per file; an unfinished upload session expires after two hours.

## Reading

The dashboard has one switch, the data source, set from the hosting preferences.

- **Web2:** `GET /api/memories` reads Postgres and returns memories with signed S3 links.
- **Web3:** the browser calls `memories_list` on the canister with the person's key.

Files on ICP are not fetched through canister calls but over plain HTTP, so an `<img>` tag can load them. The canister cannot see who is asking on that path, so it uses signed links:

1. The browser asks for a token (`mint_http_token`, or it gets tokens together with the list). The token names the memory, the allowed versions and an expiry, and is signed with a secret that only the canister holds (HMAC-SHA256).
2. The image URL is `https://<canister>/asset/<memory id>/<version>?token=…`.
3. The canister checks signature, expiry and scope, then serves the bytes.

A token lives 3 minutes by default and 30 minutes at most.

## Sharing

On the Web2 side, sharing is two tables. `resource_membership` grants a person a role on a memory, folder or gallery, with where the grant came from (direct, group, magic link, public). `resource_share_tokens` holds the links. The logic is in `src/services/sharing/` and the access checks in `memory-access-operations.ts` and `folder-access-operations.ts`.

On the Web3 side, sharing is the access entries on each item, described above. The two are not connected: sharing a Web2 memory does not write to the canister and the other way round.

## The rest

| Thing                     | Where                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| E-mails                   | Mailgun, `src/app/api/email/send`                                 |
| Visitor analytics         | PostHog, proxied under `/ingest` (`vercel.json`)                  |
| AI chat ("Transcendance") | `src/app/api/chat`: OpenAI `gpt-4o-mini`, with Gemini as fallback |
| Journal                   | Markdown posts under `src/app/[lang]/journal`                     |

## Known rough edges

Things a new developer would otherwise find the hard way:

- **Two models of the same thing.** Memories, galleries, folders and sharing exist once in Postgres and once in the canister, with similar but not identical shapes. Code that shows a memory converts between them in `src/services/memories.ts`.
- **A memory lives on one side.** The preference `dual` and the `migrating` sync state are in the schema; the copying is not written.
- **Sign-in proofs in the canister never expire** and are kept only until the next upgrade. The server's own code record does expire and is single-use, which is what protects the handshake.
- **File tokens** are always allowed the 30-minute maximum; the shorter cap meant for single requests is not applied yet.
- **Unused parts that still show in the code:** the old capsule-moving code inside the backend (`src/backend/src/canister_factory/`), the `arweave` and `ipfs` locations, the lab canisters, the family tree tables.
- **Built but not live:** personal canisters and inheritance work on a local network. Neither is on mainnet, and the web app only has the card that creates a personal canister.
- **Mainnet** runs the canister code from before November 2026. The fixes since then (list paging, gallery visibility and items, inline file links) are in `main`, not deployed. That old code loses the uploaded files on every upgrade; the next mainnet upgrade must be to the fixed version, see the warning in [Personal canisters and inheritance](/desk/personal-canisters).

## Running it

- Web app and local database: the Development section of the `README.md`.
- Local ICP network and the browser tests: `e2e/README.md`.
- Canister tests: the Testing section of the `README.md` in `futura_alpha_icp`.

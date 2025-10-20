# Database User Scripts

This directory contains utility scripts for managing and querying user data in the database.

## Scripts

### `lookup-user-by-email.ts`

Finds comprehensive user information by email address across all user tables.

**Usage:**
```bash
npx tsx scripts/db/users/lookup-user-by-email.ts <email>
```

**Example:**
```bash
npx tsx scripts/db/users/lookup-user-by-email.ts user@example.com
```

**What it does:**
- Searches for the user in the `users` table (permanent users)
- Searches for the user in the `temporaryUsers` table (temporary users)
- Finds the corresponding `allUsers` entry
- Displays comprehensive user information including:
  - Basic user data (name, email, role, plan, etc.)
  - Account status and registration information
  - User relationships (who invited them, who they invited)
  - Account type (permanent vs temporary)

**Output includes:**
- User type (permanent/temporary/not found)
- Complete user profile data
- Account relationships and hierarchy
- Registration status and verification
- Premium status and expiration dates

## Prerequisites

- Node.js and npm/pnpm installed
- Database connection configured in `.env.local`
- `DATABASE_URL_UNPOOLED` environment variable set

## Environment Setup

Make sure your `.env.local` file contains:
```
DATABASE_URL_UNPOOLED=your_database_connection_string
```

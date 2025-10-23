# Database Memory Scripts

This directory contains utility scripts for debugging and managing memory storage in the database.

## Scripts

### `check-storage-edges.ts`

Debug script to investigate storage edge records for a specific memory. Useful for diagnosing "Storage: UNKNOWN" issues.

**Usage:**

```bash
npx tsx scripts/db/memories/check-storage-edges.ts <memoryId>
```

**Example:**

```bash
npx tsx scripts/db/memories/check-storage-edges.ts 123e4567-e89b-12d3-a456-426614174000
```

**What it does:**

- Checks if the memory exists in the database
- Queries all storage edges for the memory
- Shows detailed information about storage locations
- Simulates what the API would return
- Helps diagnose why storage status shows as "UNKNOWN"

**Output includes:**

- Memory basic information (ID, title, type, owner)
- All storage edge records with full details
- Storage location analysis
- API simulation results
- Diagnosis of "UNKNOWN" status causes

## Prerequisites

- Node.js and npm/pnpm installed
- Database connection configured in `.env.local`
- `DATABASE_URL_UNPOOLED` environment variable set

## Environment Setup

Make sure your `.env.local` file contains:

```
DATABASE_URL_UNPOOLED=your_database_connection_string
```

# Upload Verify Route

## Purpose

The `/api/upload/verify` endpoint verifies that uploads were successful by checking both **database** and **blob storage**.

## What it does

1. **Verifies memory exists** in database (Neon)
2. **Verifies blob exists** in storage (S3/Vercel Blob/Arweave/IPFS)
3. **Creates storage_edge records** with verification status for both metadata and assets

## Parameters

```typescript
{
  app_memory_id: string,
  database: 'neon' | 'icp',  // Where metadata is stored
  blob_storage: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs',  // Where files are stored
  idem: string,
  checksum_sha256?: string,
  size?: number,
  remote_id?: string
}
```

## Response

Returns two storage edge records:

- **Metadata edge**: Tracks where memory metadata is stored
- **Asset edge**: Tracks where file assets are stored

## Backend Handling

- **Vercel Backend**: This route handles verification
- **ICP Backend**: Frontend calls ICP canister directly (not this route)

## Usage

Called after every upload to confirm success and create storage tracking records.

## Mock Implementation

Currently returns mock verification results. Real implementation will:

- Query Neon database for memory existence
- Check blob storage for file existence
- Validate checksums and sizes

# Upload Intent API

## Purpose

The `/api/upload/intent` endpoint allows the **backend to control upload routing** while enabling **direct client-to-backend communication**. The client expresses upload intent, and the backend provides configuration for direct uploads (especially to ICP).

## What it does

1. **Receives** hosting preferences from client (blob + database hosting)
2. **Returns** upload storage configuration for direct client uploads:
   - `database`: Database hosting ('neon' for Vercel backend)
   - `blob_storage`: Blob hosting preference (s3, vercel_blob, icp, arweave, ipfs)
   - `idem`: Unique identifier for the upload session
   - `expires_at`: When the configuration expires (10 minutes)
   - `limits`: Upload size limits and chunk configuration
   - `icp`: ICP canister details (if using ICP) - enables direct client-to-ICP communication

## Logic

- **Database**: Always 'neon' (since this is a Vercel route)
- **Blob Storage**: User's blob hosting preference or default to 's3'
- **ICP Config**: Added if `blob_storage === 'icp'`

## Where it's called

### 1. **use-upload-storage.ts** (Hook)

- **Purpose**: Request upload storage configuration
- **Usage**: `uploadStorageMutation.mutateAsync({ preferred: blobHosting })`
- **Returns**: UploadStorage object with configuration

### 2. **use-file-upload.ts** (Hook)

- **Purpose**: Get storage config before file upload
- **Usage**: `requestUploadStorage()` → calls intent API
- **Used for**: Routing to correct upload service (ICP, S3, Vercel Blob)

### 3. **services/upload.ts** (Service)

- **Purpose**: Get ICP-specific configuration
- **Usage**: `uploadToICPBackend()` → calls intent API
- **Used for**: ICP canister ID and network configuration

## Flow

```
Client → Intent API (Backend Control) → Upload Storage Config → Direct Upload to Backend
```

## Key Point

The intent route enables **backend-controlled upload routing** with **direct client-to-backend communication**. For ICP uploads, the client gets canister details and uploads directly to ICP, bypassing the main backend. The backend maintains control by providing the configuration and tracking uploads via the `idem` identifier.

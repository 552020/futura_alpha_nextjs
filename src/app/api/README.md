# API Routes Documentation

This document outlines all API endpoints for the family file sharing application.

## Overview

### Memory Management (Primary System)

- `GET /api/memories` - List all memories owned by the authenticated user
- `POST /api/memories` - Create a new memory (legacy FormData upload)
- `GET /api/memories/[id]` - Get a specific memory
- `PATCH /api/memories/[id]` - Update memory metadata
- `DELETE /api/memories/[id]` - Delete a memory
- `GET /api/memories/shared` - Get memories shared with the current user
- `POST /api/memories/[id]/share` - Share a memory
- `GET /api/memories/[id]/share-link` - Get share link for a memory
- `GET /api/memories/[id]/share-link/code` - Get share code for a memory
- `GET /api/memories/[id]/assets` - Get memory assets
- `GET /api/memories/[id]/download` - Download memory content

### Upload System (413 Solution)

- `POST /api/upload/batch-presign` - Get presigned URLs for multiple files
- `POST /api/upload/intent` - Request upload storage configuration
- `POST /api/upload/verify` - Verify upload completion
- `POST /api/upload/complete` - Mark upload as complete
- `POST /api/upload/grant` - Grant upload permissions
- `POST /api/upload/request` - Request upload access

### Folder Management

- `POST /api/folders` - Create a new folder
- `GET /api/galleries/folders` - List folders (via galleries API)

### Gallery Management

- `GET /api/galleries` - List all galleries owned by the authenticated user
- `POST /api/galleries` - Create a new gallery
- `GET /api/galleries/[id]` - Get a specific gallery with its items
- `PATCH /api/galleries/[id]` - Update gallery metadata
- `DELETE /api/galleries/[id]` - Delete a gallery
- `GET /api/galleries/shared` - Get galleries shared with the current user
- `POST /api/galleries/[id]/share` - Share a gallery
- `DELETE /api/galleries/[id]/share` - Unshare a gallery

### Storage & Sync Management

- `PUT /api/storage/edges` - Upsert storage edge records
- `GET /api/storage/edges` - Query storage edge records
- `GET /api/storage/sync-status` - Get sync status and monitoring data

### Authentication & User Management

- `GET /api/auth/[...nextauth]` - NextAuth.js authentication endpoints
- `POST /api/auth/link-ii` - Link Internet Identity
- `GET /api/users` - List users
- `GET /api/users/[id]` - Get specific user
- `GET /api/ii/challenge` - Internet Identity challenge
- `POST /api/ii/verify-nonce` - Verify Internet Identity nonce

### S3 Integration

- `POST /api/s3/presigned-url` - Generate S3 presigned URLs

### Testing & Development

- `GET /api/test/auth` - Test authentication
- `GET /api/test/hello` - Test endpoint
- `POST /api/test/mailgun` - Test Mailgun integration

---

## Authentication

All API routes require authentication unless specified otherwise. Authentication is handled via Next.js Auth.js session cookies.

## Memory Management

### List Memories

- **URL**: `GET /api/memories`
- **Description**: List all memories owned by the authenticated user
- **Query Parameters**:
  - `page`: (optional) Page number for pagination
  - `limit`: (optional) Number of items per page
  - `type`: (optional) Filter by memory type (image, video, document, note, audio)
- **Response**:
  ```json
  {
    "memories": [
      {
        "id": "uuid",
        "type": "image",
        "title": "Memory title",
        "description": "Memory description",
        "url": "https://storage-url",
        "createdAt": "2023-03-15T12:34:56Z",
        "parentFolderId": "folder-uuid",
        "storageBackend": "s3"
      }
    ],
    "hasMore": true
  }
  ```

### Create Memory (Legacy)

- **URL**: `POST /api/memories`
- **Description**: Create a new memory with file upload (legacy FormData approach)
- **Request Body**: `multipart/form-data`
  ```
  file: File
  type: "image" | "video" | "document" | "note" | "audio"
  caption: string (optional)
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "memory-uuid",
      "type": "image",
      "url": "https://storage-url",
      "caption": "Memory caption"
    }
  }
  ```

### Get Memory

- **URL**: `GET /api/memories/[id]`
- **Description**: Get a specific memory
- **URL Parameters**:
  - `id`: Memory UUID
- **Response**:
  ```json
  {
    "id": "uuid",
    "type": "image",
    "title": "Memory title",
    "description": "Memory description",
    "url": "https://storage-url",
    "createdAt": "2023-03-15T12:34:56Z",
    "parentFolderId": "folder-uuid",
    "storageBackend": "s3"
  }
  ```

### Update Memory

- **URL**: `PATCH /api/memories/[id]`
- **Description**: Update memory metadata
- **URL Parameters**:
  - `id`: Memory UUID
- **Request Body**:
  ```json
  {
    "title": "New title",
    "description": "New description"
  }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "title": "New title",
    "description": "New description"
  }
  ```

### Delete Memory

- **URL**: `DELETE /api/memories/[id]`
- **Description**: Delete a memory
- **URL Parameters**:
  - `id`: Memory UUID
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### Get Shared Memories

- **URL**: `GET /api/memories/shared`
- **Description**: Get memories shared with the current user
- **Query Parameters**:
  - `page`: (optional) Page number for pagination
  - `limit`: (optional) Number of items per page
  - `orderBy`: (optional) Order by "sharedAt" or "createdAt"
- **Response**:
  ```json
  {
    "images": [ ... ],
    "documents": [ ... ],
    "notes": [ ... ],
    "videos": [ ... ],
    "audio": [ ... ],
    "hasMore": true,
    "data": [ ... ],
    "total": 10
  }
  ```

## Upload System (413 Solution)

### Get Presigned URL (Single File)

- **Description**: Get presigned URL for single file upload to S3
- **Request Body**:
  ```json
  {
    "fileName": "example.jpg",
    "fileType": "image/jpeg",
    "fileSize": 1024000
  }
  ```
- **Response**:
  ```json
  {
    "signedUrl": "https://s3.amazonaws.com/...",
    "s3Key": "user-id/example.jpg"
  }
  ```

### Get Presigned URLs (Multiple Files)

- **URL**: `POST /api/upload/batch-presign`
- **Description**: Get presigned URLs for multiple files upload to S3
- **Request Body**:
  ```json
  {
    "files": [
      {
        "fileName": "example1.jpg",
        "fileType": "image/jpeg",
        "fileSize": 1024000
      },
      {
        "fileName": "example2.jpg",
        "fileType": "image/jpeg",
        "fileSize": 2048000
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "presignedUrls": [
      {
        "signedUrl": "https://s3.amazonaws.com/...",
        "s3Key": "user-id/example1.jpg"
      },
      {
        "signedUrl": "https://s3.amazonaws.com/...",
        "s3Key": "user-id/example2.jpg"
      }
    ]
  }
  ```

### Commit Single File

- **Description**: Commit single file to database after S3 upload
- **Request Body**:
  ```json
  {
    "fileName": "example.jpg",
    "fileType": "image/jpeg",
    "fileSize": 1024000,
    "s3Url": "https://bucket.s3.region.amazonaws.com/key",
    "parentFolderId": "folder-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "data": {
      "id": "memory-uuid"
    },
    "results": [
      {
        "memoryId": "memory-uuid",
        "size": 1024000,
        "checksum_sha256": null
      }
    ],
    "userId": "user-uuid"
  }
  ```

### Commit Multiple Files

- **Description**: Commit multiple files to database after S3 upload
- **Request Body**:
  ```json
  {
    "files": [
      {
        "fileName": "example1.jpg",
        "fileType": "image/jpeg",
        "fileSize": 1024000,
        "s3Url": "https://bucket.s3.region.amazonaws.com/key1"
      },
      {
        "fileName": "example2.jpg",
        "fileType": "image/jpeg",
        "fileSize": 2048000,
        "s3Url": "https://bucket.s3.region.amazonaws.com/key2"
      }
    ],
    "parentFolderId": "folder-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "results": [
      {
        "memoryId": "memory-uuid-1",
        "size": 1024000,
        "name": "example1.jpg",
        "type": "image/jpeg",
        "checksum_sha256": null
      }
    ],
    "userId": "user-uuid",
    "successfulUploads": 2
  }
  ```

## Gallery Management

### Create Gallery

- **URL**: `POST /api/galleries`
- **Description**: Create a new gallery
- **Request Body**:
  ```json
  {
    "type": "from-folder" | "from-memories",
    "folderName": "string",
    "memories": ["memory-uuid-1", "memory-uuid-2"],
    "title": "string",
    "description": "string",
    "isPublic": boolean
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "gallery-uuid",
      "title": "Gallery Title",
      "description": "Gallery Description",
      "isPublic": true,
      "createdAt": "2023-03-15T12:34:56Z"
    }
  }
  ```

### Get Gallery

- **URL**: `GET /api/galleries/[id]`
- **Description**: Get a specific gallery with its items
- **URL Parameters**:
  - `id`: Gallery UUID
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "gallery-uuid",
      "title": "Gallery Title",
      "description": "Gallery Description",
      "isPublic": true,
      "items": [
        {
          "id": "item-uuid",
          "position": 1,
          "memory": {
            "id": "memory-uuid",
            "type": "image",
            "url": "https://storage-url"
          }
        }
      ],
      "storageStatus": {
        "status": "stored_forever" | "partially_stored" | "web2_only",
        "totalMemories": 5,
        "icpCompleteMemories": 5,
        "icpCompletePercentage": 100
      }
    }
  }
  ```

### Update Gallery

- **URL**: `PATCH /api/galleries/[id]`
- **Description**: Update gallery metadata
- **URL Parameters**:
  - `id`: Gallery UUID
- **Request Body**:
  ```json
  {
    "title": "New Title",
    "description": "New Description",
    "isPublic": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "gallery-uuid",
      "title": "New Title",
      "description": "New Description",
      "isPublic": false
    }
  }
  ```

### Delete Gallery

- **URL**: `DELETE /api/galleries/[id]`
- **Description**: Delete a gallery
- **URL Parameters**:
  - `id`: Gallery UUID
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### Share Gallery

- **URL**: `POST /api/galleries/[id]/share`
- **Description**: Share a gallery
- **URL Parameters**:
  - `id`: Gallery UUID
- **Request Body**:
  ```json
  {
    "accessLevel": "read" | "write"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "share-uuid",
      "galleryId": "gallery-uuid",
      "accessLevel": "read",
      "shareCode": "ABC123"
    }
  }
  ```

## Folder Management

### Create Folder

- **URL**: `POST /api/folders`
- **Description**: Create a new folder
- **Request Body**:
  ```json
  {
    "folderName": "vacation_photos",
    "parentFolderId": "parent-folder-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "folder": {
      "id": "folder-uuid",
      "ownerId": "user-uuid",
      "name": "vacation_photos",
      "parentFolderId": "parent-folder-uuid",
      "createdAt": "2023-03-15T12:34:56Z"
    }
  }
  ```

## Storage & Sync Management

### Upsert Storage Edge

- **URL**: `PUT /api/storage/edges`
- **Description**: Create or update a storage edge record
- **Request Body**:
  ```json
  {
    "memoryId": "uuid",
    "memoryType": "image" | "video" | "note" | "document" | "audio",
    "artifact": "metadata" | "asset",
    "backend": "neon-db" | "vercel-blob" | "icp-canister",
    "present": boolean,
    "location": "string (optional)",
    "contentHash": "string (optional)",
    "sizeBytes": "number (optional)",
    "syncState": "idle" | "migrating" | "failed",
    "syncError": "string (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "edge-uuid",
      "memoryId": "memory-uuid",
      "memoryType": "image",
      "artifact": "metadata",
      "backend": "icp-canister",
      "present": true,
      "syncState": "idle"
    }
  }
  ```

### Get Sync Status

- **URL**: `GET /api/storage/sync-status`
- **Description**: Get sync status and monitoring data
- **Query Parameters**:
  - `syncState`: (optional) Filter by sync state ("migrating", "failed")
  - `backend`: (optional) Filter by backend ("neon-db", "vercel-blob", "icp-canister")
  - `memoryType`: (optional) Filter by memory type
  - `stuck`: (optional) "true" to get stuck syncs
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "edge-uuid",
        "memoryId": "memory-uuid",
        "memoryType": "image",
        "artifact": "metadata",
        "backend": "icp-canister",
        "syncState": "migrating",
        "syncError": null
      }
    ],
    "summary": {
      "total": 10,
      "migrating": 3,
      "failed": 1,
      "stuck": 0,
      "byBackend": {
        "neon-db": 5,
        "vercel-blob": 3,
        "icp-canister": 2
      }
    }
  }
  ```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Data Types

### Memory Types

- `image` - Image files (JPG, PNG, WebP, etc.)
- `video` - Video files (MP4, MOV, etc.)
- `note` - Text notes
- `document` - Document files (PDF, DOC, etc.)
- `audio` - Audio files (MP3, WAV, etc.)

### Artifact Types

- `metadata` - Memory metadata and information
- `asset` - Actual file content

### Storage Backends

- `neon-db` - PostgreSQL database (metadata)
- `vercel-blob` - Vercel Blob storage (assets)
- `icp-canister` - Internet Computer blockchain (permanent storage)

### Sync States

- `idle` - No sync operation in progress
- `migrating` - Currently syncing to ICP
- `failed` - Sync operation failed

---

## API Route Status Summary

### ✅ **IMPLEMENTED & ACTIVE**

#### Memory Management

- ✅ `GET /api/memories` - List memories with pagination
- ✅ `POST /api/memories` - Create memory (legacy FormData)
- ✅ `GET /api/memories/[id]` - Get specific memory
- ✅ `PATCH /api/memories/[id]` - Update memory metadata
- ✅ `DELETE /api/memories/[id]` - Delete memory
- ✅ `GET /api/memories/shared` - Get shared memories
- ✅ `POST /api/memories/[id]/share` - Share memory
- ✅ `GET /api/memories/[id]/share-link` - Get share link
- ✅ `GET /api/memories/[id]/share-link/code` - Get share code
- ✅ `GET /api/memories/[id]/assets` - Get memory assets
- ✅ `GET /api/memories/[id]/download` - Download memory

#### Upload System (413 Solution)

- ✅ `POST /api/upload/batch-presign` - Multiple files presigned URLs
- ✅ `POST /api/upload/intent` - Upload storage configuration
- ✅ `POST /api/upload/verify` - Upload verification
- ✅ `POST /api/upload/complete` - Upload completion
- ✅ `POST /api/upload/grant` - Upload permissions
- ✅ `POST /api/upload/request` - Upload access request

#### Folder Management

- ✅ `POST /api/folders` - Create folder

#### Gallery Management

- ✅ `GET /api/galleries` - List galleries
- ✅ `POST /api/galleries` - Create gallery
- ✅ `GET /api/galleries/[id]` - Get specific gallery
- ✅ `PATCH /api/galleries/[id]` - Update gallery
- ✅ `DELETE /api/galleries/[id]` - Delete gallery
- ✅ `GET /api/galleries/shared` - Get shared galleries
- ✅ `POST /api/galleries/[id]/share` - Share gallery
- ✅ `DELETE /api/galleries/[id]/share` - Unshare gallery

#### Storage & Sync Management

- ✅ `PUT /api/storage/edges` - Upsert storage edge
- ✅ `GET /api/storage/edges` - Query storage edges
- ✅ `GET /api/storage/sync-status` - Get sync status

#### Authentication & User Management

- ✅ `GET /api/auth/[...nextauth]` - NextAuth.js endpoints
- ✅ `POST /api/auth/link-ii` - Link Internet Identity
- ✅ `GET /api/users` - List users
- ✅ `GET /api/users/[id]` - Get specific user
- ✅ `GET /api/ii/challenge` - Internet Identity challenge
- ✅ `POST /api/ii/verify-nonce` - Verify Internet Identity

#### S3 Integration

- ✅ `POST /api/s3/presigned-url` - Generate S3 presigned URLs

#### Testing & Development

- ✅ `GET /api/test/auth` - Test authentication
- ✅ `GET /api/test/hello` - Test endpoint
- ✅ `POST /api/test/mailgun` - Test Mailgun

### ❌ **NOT IMPLEMENTED (Legacy Documentation)**

#### File Management (Deprecated)

- ❌ `POST /api/files/upload` - **DEPRECATED** - Use `/api/upload/s3/presign` + `/api/upload/complete`
- ❌ `GET /api/files` - **DEPRECATED** - Use `/api/memories`
- ❌ `GET /api/files/[id]` - **DEPRECATED** - Use `/api/memories/[id]`
- ❌ `PATCH /api/files/[id]` - **DEPRECATED** - Use `/api/memories/[id]`
- ❌ `DELETE /api/files/[id]` - **DEPRECATED** - Use `/api/memories/[id]`

#### File Sharing (Deprecated)

- ❌ `POST /api/files/[id]/share` - **DEPRECATED** - Use `/api/memories/[id]/share`
- ❌ `DELETE /api/files/[id]/share/[userId]` - **DEPRECATED** - Use memory sharing
- ❌ `GET /api/shared` - **DEPRECATED** - Use `/api/memories/shared`

#### Memory Upload (Deprecated)

- ❌ `POST /api/memories/upload/file` - **DEPRECATED** - Use 413 solution
- ❌ `POST /api/memories/upload/folder` - **DEPRECATED** - Use 413 solution
- ❌ `POST /api/memories/upload/onboarding` - **DEPRECATED** - Use 413 solution

### 🎯 **KEY ARCHITECTURAL CHANGES**

1. **413 Solution Implementation**: All file uploads now use the 3-step process (presign → upload → commit) to avoid Vercel's request body limits.

2. **Memory-Centric Architecture**: The system has moved from a generic "files" concept to a "memories" concept with rich metadata and relationships.

3. **Multi-Backend Support**: The system supports multiple storage backends (S3, Vercel Blob, ICP) with automatic routing based on user preferences.

4. **Folder Integration**: Folders are now integrated with the memory system, allowing hierarchical organization

5. **Gallery System**: A separate gallery system allows users to create curated collections of memories.

6. **Storage Edge Tracking**: Comprehensive tracking of where data is stored across different backends for sync and monitoring purposes.

### 📊 **USAGE RECOMMENDATIONS**

- **For new uploads**: Use the 413 solution endpoints (`/api/upload/s3/presign`, `/api/upload/complete`)
- **For file management**: Use memory endpoints (`/api/memories/*`)
- **For sharing**: Use memory sharing endpoints (`/api/memories/[id]/share`)
- **For organization**: Use folders (`/api/folders`) and galleries (`/api/galleries`)
- **For monitoring**: Use storage endpoints (`/api/storage/*`)

The API has evolved significantly to solve the 413 problem while providing a more robust and scalable architecture for file management and sharing.

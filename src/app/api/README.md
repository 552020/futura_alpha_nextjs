# API Routes Documentation

This document outlines all API endpoints for the family file sharing application.

## Overview

### File Management

- `POST /api/files/upload` - Upload a new file, text, or photo
- `GET /api/files` - List all files owned by the authenticated user
- `GET /api/files/[id]` - Download or view a specific file
- `PATCH /api/files/[id]` - Update file metadata
- `DELETE /api/files/[id]` - Delete a file

### File Sharing

- `POST /api/files/[id]/share` - Share a file with other users
- `DELETE /api/files/[id]/share/[userId]` - Remove sharing for a specific user
- `GET /api/shared` - Get files shared with the current user

### Gallery Management

- `GET /api/galleries` - List all galleries owned by the authenticated user
- `POST /api/galleries` - Create a new gallery
- `GET /api/galleries/[id]` - Get a specific gallery with its items
- `PATCH /api/galleries/[id]` - Update gallery metadata
- `DELETE /api/galleries/[id]` - Delete a gallery
- `GET /api/galleries/shared` - Get galleries shared with the current user
- `POST /api/galleries/[id]/share` - Share a gallery
- `DELETE /api/galleries/[id]/share` - Unshare a gallery

### Memory Management

- `GET /api/memories` - List all memories owned by the authenticated user
- `POST /api/memories` - Create a new memory
- `GET /api/memories/[id]` - Get a specific memory
- `PATCH /api/memories/[id]` - Update memory metadata
- `DELETE /api/memories/[id]` - Delete a memory
- `POST /api/memories/upload/file` - Upload a single file memory
- `POST /api/memories/upload/folder` - Upload multiple files as folder
- `POST /api/memories/upload/onboarding` - Upload onboarding memories

### Storage & Sync Management

- `PUT /api/storage/edges` - Upsert storage edge records
- `GET /api/storage/sync-status` - Get sync status and monitoring data
- `GET /api/galleries/[id]/presence` - Get gallery storage presence status
- `GET /api/memories/presence` - Get memory storage presence status

---

## Authentication

All API routes require authentication unless specified otherwise. Authentication is handled via Next.js Auth.js session cookies.

## File Management

### Upload File

- **URL**: `POST /api/files/upload`
- **Description**: Upload a new file, text, or photo
- **Request Body**: `multipart/form-data`
  ```
  file: File
  ```
- **Response**:
  ```json
  {
    "type": "photo|file|text",
    "data": {
      "id": "uuid",
      "userId": "user-uuid",
      "url": "https://storage-url",
      "createdAt": "2023-03-15T12:34:56Z",
      "isPublic": true,
      "metadata": { ... }
    }
  }
  ```

### Get File List

- **URL**: `GET /api/files`
- **Description**: List all files owned by the authenticated user
- **Query Parameters**:
  - `type`: (optional) Filter by file type (photo, text, file)
  - `sort`: (optional) Sort order (recent, name, size)
  - `limit`: (optional) Number of items to return
- **Response**:
  ```json
  {
    "photos": [
      {
        "id": "uuid",
        "url": "https://storage-url",
        "createdAt": "2023-03-15T12:34:56Z",
        "isPublic": true,
        "metadata": { ... }
      }
    ],
    "files": [ ... ],
    "texts": [ ... ]
  }
  ```

### Download File

- **URL**: `GET /api/files/[id]`
- **Description**: Download or view a specific file
- **URL Parameters**:
  - `id`: File UUID
- **Response**: Redirects to the file's storage URL

### Update File

- **URL**: `PATCH /api/files/[id]`
- **Description**: Update file metadata
- **URL Parameters**:
  - `id`: File UUID
- **Request Body**:
  ```json
  {
    "caption": "New caption",
    "isPublic": false,
    "metadata": { ... }
  }
  ```
- **Response**:
  ```json
  {
    "id": "uuid",
    "url": "https://storage-url",
    "caption": "New caption",
    "isPublic": false,
    "metadata": { ... }
  }
  ```

### Delete File

- **URL**: `DELETE /api/files/[id]`
- **Description**: Delete a file
- **URL Parameters**:
  - `id`: File UUID
- **Response**:
  ```json
  {
    "success": true
  }
  ```

## File Sharing

### Share File

- **URL**: `POST /api/files/[id]/share`
- **Description**: Share a file with other users
- **URL Parameters**:
  - `id`: File UUID
- **Request Body**:
  ```json
  {
    "userIds": ["user-uuid-1", "user-uuid-2"],
    "accessLevel": "read"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "shares": [
      {
        "id": "share-uuid",
        "fileId": "file-uuid",
        "userId": "user-uuid-1",
        "sharedByUserId": "your-user-id",
        "accessLevel": "read",
        "createdAt": "2023-03-15T12:34:56Z"
      },
      { ... }
    ]
  }
  ```

### Remove File Share

- **URL**: `DELETE /api/files/[id]/share/[userId]`
- **Description**: Remove sharing for a specific user
- **URL Parameters**:
  - `id`: File UUID
  - `userId`: User UUID to remove sharing for
- **Response**:
  ```json
  {
    "success": true
  }
  ```

### List Shared Files

- **URL**: `GET /api/shared`
- **Description**: Get files shared with the current user
- **Query Parameters**:
  - `type`: (optional) Filter by file type
- **Response**:
  ```json
  {
    "photos": [ ... ],
    "files": [ ... ],
    "texts": [ ... ]
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

## Memory Management

### Upload File Memory

- **URL**: `POST /api/memories/upload/file`
- **Description**: Upload a single file memory
- **Request Body**: `multipart/form-data`
  ```
  file: File
  type: "image" | "video" | "document" | "audio"
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

### Upload Folder

- **URL**: `POST /api/memories/upload/folder`
- **Description**: Upload multiple files as a folder
- **Request Body**: `multipart/form-data`
  ```
  files: File[]
  folderName: string
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "folderName": "vacation_photos",
      "memories": [
        {
          "id": "memory-uuid-1",
          "type": "image",
          "url": "https://storage-url-1"
        }
      ]
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

### Get Gallery Presence

- **URL**: `GET /api/galleries/[id]/presence`
- **Description**: Get gallery storage presence status
- **URL Parameters**:
  - `id`: Gallery UUID
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "galleryId": "gallery-uuid",
      "totalMemories": 5,
      "icpCompleteMemories": 3,
      "icpComplete": false,
      "icpAny": true,
      "icpCompletePercentage": 60,
      "storageStatus": "partially_stored"
    }
  }
  ```

### Get Memory Presence

- **URL**: `GET /api/memories/presence`
- **Description**: Get memory storage presence status
- **Query Parameters**:
  - `id`: Memory UUID
  - `type`: Memory type ("image", "video", "note", "document", "audio")
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "memoryId": "memory-uuid",
      "memoryType": "image",
      "storageStatus": {
        "neon": true,
        "blob": true,
        "icp": false,
        "icpPartial": true
      },
      "overallStatus": "partially_stored"
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

# ICP Upload with Processing Analysis

## Overview

This file implements a sophisticated parallel upload system for the Internet Computer Protocol (ICP) that mirrors S3 architecture patterns. It handles both single file and batch uploads with image processing capabilities.

## Key Architecture

### Parallel Lanes Approach

- **Lane A**: `uploadOriginalToICP()` - **Original upload + memory creation** (uploads original file + creates ICP memory record)
- **Lane B**: `processImageDerivativesPure()` + `uploadProcessedAssetsToICP()` - **Derivative processing** (processes derivatives + uploads to ICP)
- **Post-processing**: `createStorageEdgesForAllAssets()` - **Storage edge creation** (creates storage edges for all artifacts after both lanes complete)
- Both lanes run simultaneously for optimal performance

### Main Functions

#### `uploadFileAndCreateMemoryWithDerivatives(file, onProgress)`

- Single file upload with parallel processing and memory creation
- Returns `UploadServiceResult` with memory ID and blob information
- Handles both image and non-image files
- Creates ICP memory record and processes derivatives

#### `uploadMultipleToICPWithProcessing(files, mode, onProgress)`

- Batch upload for multiple files
- Supports 'directory' and 'multiple-files' modes
- Returns aggregated results with success counts

#### `uploadFileToICPWithProgress(file, onProgress)`

- Core ICP upload implementation using chunked uploads
- Handles authentication, capsule management, and progress tracking
- Implements file size validation and chunk streaming

## Upload Functions for Original and Derivatives

### Original File Upload Functions

#### `uploadOriginalToICP(files, onProgress)`

- **Purpose**: **Original upload + memory creation** (Lane A - properly focused)
- **Process**:
  1. **Uploads original file** using `uploadFileToICPWithProgress()`
  2. **Creates ICP memory record** with `createICPMemoryWithOriginalBlob()`
  3. **Returns upload result** with memory ID and blob information
- **Note**: This function now properly focuses on just original upload and memory creation

#### `uploadFileToICPWithProgress(file, onProgress)`

- **Purpose**: Core ICP chunked upload implementation
- **Backend Functions Used**:
  - `backend.capsules_read_basic([])` - Get existing capsule
  - `backend.capsules_create([])` - Create new capsule if needed
  - `backend.uploads_begin(capsuleId, totalChunks, sessionName)` - Start upload session
  - `backend.uploads_put_chunk(session, index, chunk)` - Upload each chunk
  - `backend.uploads_finish(session, hash, fileSize)` - Complete upload
- **Returns**: `{ file: File; uploadResult: UploadFinishResult }`

### Derivative Upload Functions

#### `uploadProcessedAssetsToICP(processedBlobs, originalFileName)`

- **Purpose**: Uploads processed image derivatives (display, thumb, placeholder) to ICP
- **Process**:
  1. Converts processed blobs to File objects
  2. Calls `uploadFileToICPWithProgress()` for each derivative
  3. Handles placeholder as inline storage (not blob)
- **Returns**: `ProcessedAssets` with upload results

#### `processAndUploadDerivatives(file, icpMemoryId)`

- **Purpose**: Processes and uploads derivative assets for a specific memory
- **Process**:
  1. Calls `processImageDerivativesPure(file)` for image processing
  2. Uploads each derivative using `uploadFileToICPWithProgress()`
  3. Converts placeholder data URL to blob for upload
- **Returns**: Object with display, thumb, and placeholder blob IDs

### Memory Creation Functions

#### `createICPMemoryWithOriginalBlob(file, originalBlobId)`

- **Purpose**: Creates ICP memory record with original blob reference
- **Backend Function Used**:
  - `backend.memories_create_with_internal_blobs(capsuleId, memoryMetadata, blobAssets, idempotencyKey)`
- **Returns**: ICP memory ID

#### `createICPMemoryRecordAndEdges(trackingMemoryId, blobAssets, placeholderData, memoryMetadata)`

- **Purpose**: Creates ICP memory record with inline placeholder and storage edges
- **Backend Function Used**:
  - `backend.memories_create(capsuleId, inlineBytes, blobRefs, externalLocation, externalStorageKey, externalUrl, externalSize, externalHash, assetMetadata, idempotencyKey)`
- **Returns**: ICP memory ID

### Storage Edge Functions

#### `createStorageEdgesForAllAssets(icpMemoryId, file, originalBlobId, derivativeAssets)`

- **Purpose**: Creates storage edge records via API to track artifact locations
- **API Endpoint**: `PUT /api/storage/edges`
- **Creates edges for**: metadata, original asset, display asset, thumb asset, placeholder asset

#### `createStorageEdgesViaAPI(trackingMemoryId, icpMemoryId, blobAssets, placeholderData)`

- **Purpose**: Creates storage edges for tracking memory artifacts
- **API Endpoint**: `PUT /api/storage/edges`
- **Creates edges for**: metadata, placeholder (inline), and all blob assets

## Technical Implementation

### Upload Flow

1. **Authentication**: Uses Internet Identity for user authentication
2. **Capsule Management**: Gets or creates user capsule for storage
3. **Chunked Upload**: Streams file in configurable chunks to ICP
4. **Hash Verification**: Computes SHA-256 hash for integrity
5. **Memory Creation**: Creates ICP memory records with metadata
6. **Storage Edges**: Tracks artifact locations via API

### Image Processing

- **Display**: Optimized version for viewing
- **Thumbnail**: Small preview image
- **Placeholder**: Inline data URL for immediate display
- Uses `processImageDerivativesPure()` for client-side processing

### Storage Strategy

- **Original files**: Stored as ICP blobs
- **Derivatives**: Stored as separate ICP blobs
- **Placeholders**: Stored inline in ICP memory records
- **Metadata**: Stored in ICP canister with comprehensive asset tracking

## Key Features

### Progress Tracking

- Real-time upload progress reporting
- Chunk-level progress updates
- Speed and timing metrics

### Error Handling

- Comprehensive error catching and logging
- Graceful degradation for failed derivatives
- Detailed error messages for debugging

### Memory Management

- Creates ICP memory records with full metadata
- Tracks storage locations via storage edges
- Supports both inline and blob storage

## Dependencies

- `@/ic/ii` - Internet Identity authentication
- `@/ic/backend` - ICP backend actor
- `@/utils/memory-type` - File type detection
- `./image-derivatives` - Image processing utilities
- `@/config/upload-limits` - Upload size and chunk limits

## Performance Optimizations

- Parallel processing of uploads and derivatives
- Chunked uploads for large files
- Client-side image processing
- Efficient blob management

## Limitations

- Currently optimized for image files
- Requires Internet Identity authentication
- Limited to ICP storage backend
- No automatic retry mechanisms for failed uploads

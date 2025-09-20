# Gallery API Requirements & Routes

## User Requirements

### Gallery Creation

- **User SHALL** be able to create a gallery directly from a folder name
- **User SHALL** be able to create a gallery from a list of selected memories/items
- **System SHALL** automatically create gallery when adding first memory (no empty galleries)

### Gallery Publishing & Access Control

- **User SHALL** be able to set gallery as private (owner only)
- **User SHALL** be able to set gallery as public (no login required)
- **User SHALL** be able to set gallery as link-based access (no login required)
- **User SHALL** be able to share gallery with specific users (login required)
- **User SHALL** be able to view list of galleries they own
- **User SHALL** be able to view list of galleries they have access to

### Gallery Management

- **User SHALL** be able to edit gallery metadata (title, description)
- **User SHALL** be able to add memories to existing gallery
- **User SHALL** be able to remove memories from gallery
- **User SHALL** be able to delete entire gallery
- **User SHALL** be able to view all memories in a gallery

## Current Routes Structure

### 1. `/api/galleries` (Main)

- **GET**: List user's galleries (paginated)
- **POST**: Create empty gallery (title, description, isPublic)
- **PUT**: Temporarily disabled (503)

### 2. `/api/galleries/[id]` (Individual Gallery)

- **GET**: Get specific gallery (with access control)
- **PUT**: Update gallery metadata (title, description, isPublic)
- **DELETE**: Delete gallery

### 3. `/api/galleries/[id]/share` (Sharing)

- **POST**: Share gallery with user/group/relationship
- **GET**: List gallery shares
- **DELETE**: Remove specific share

### 4. `/api/galleries/items` (Global Items)

- **POST**: Temporarily disabled (503)

### 5. `/api/galleries/items/reorder` (Global Reordering)

- **PUT**: Temporarily disabled (503)

## Evaluation for Demo Context

### ✅ **KEEP - Essential**

1. **GET `/api/galleries`** - List user galleries
2. **GET `/api/galleries/[id]`** - View specific gallery
3. **DELETE `/api/galleries/[id]`** - Remove galleries

### ❓ **SIMPLIFY - Overkill for Demo**

1. **POST `/api/galleries`** - Creates empty gallery
   - **Problem**: Users expect galleries with content
   - **Solution**: Create gallery only when adding first memory

2. **PUT `/api/galleries/[id]`** - Update metadata
   - **Problem**: Low priority for demo
   - **Solution**: Keep but deprioritize

### ❌ **REMOVE - Too Complex for Demo**

1. **All sharing routes** (`/api/galleries/[id]/share/*`)
   - **Problem**: Complex access control, multiple sharing types
   - **Solution**: Remove for demo, add later if needed

2. **Global items/reorder routes**
   - **Problem**: Disabled anyway, unclear purpose
   - **Solution**: Remove completely

## Required API Routes

### Gallery Creation

```
POST /api/galleries/from-folder     # Create gallery from folder name
POST /api/galleries/from-items      # Create gallery from memory list
```

### Gallery Access & Listing

```
GET  /api/galleries                 # User's owned galleries
GET  /api/galleries/accessible      # Galleries user has access to
GET  /api/galleries/[id]            # Get specific gallery with items
```

### Gallery Management

```
PUT  /api/galleries/[id]            # Update gallery metadata
PUT  /api/galleries/[id]/items      # Add/remove memories
DELETE /api/galleries/[id]          # Delete gallery
```

### Publishing & Access Control

```
PUT  /api/galleries/[id]/publish    # Set access level (private/public/link)
POST /api/galleries/[id]/share      # Share with specific users
DELETE /api/galleries/[id]/share    # Remove sharing
```

## Implementation Plan

All routes shall be implemented together to provide complete gallery functionality.

## Testing

✅ **Vitest Setup**: Complete testing framework with Vitest
✅ **Logic Tests**: Business logic validation and data processing
✅ **Mock Strategy**: Database and authentication mocking
📋 **Integration Tests**: API endpoint testing (planned)
📋 **E2E Tests**: Complete user workflow testing (planned)

See `src/app/api/galleries/__tests__/README.md` for detailed testing documentation.

## TODO List

### Endpoints to REMOVE

1. [x] `POST /api/galleries` - Create empty gallery (replace with from-folder/from-items)
2. [x] `PUT /api/galleries` - Temporarily disabled (503)
3. [x] `PUT /api/galleries/[id]` - Update metadata (keep but modify)
4. [x] All `/api/galleries/[id]/share/*` routes - Complex sharing (KEEP - required by user requirements)
5. [x] `/api/galleries/items` - Global items (disabled, remove)
6. [x] `/api/galleries/items/reorder` - Global reorder (disabled, remove)

### Endpoints to ADD

7. [x] `POST /api/galleries/from-folder` - Create gallery from folder name (implemented as unified POST)
8. [x] `POST /api/galleries/from-items` - Create gallery from memory list (implemented as unified POST)
9. [x] `GET /api/galleries/shared` - Galleries shared with user (consistent with memories/shared)
10. [x] `PATCH /api/galleries/[id]` - Update metadata and manage items (extended existing endpoint)
11. [x] `PATCH /api/galleries/[id]` - Set access level (private/public) (extended existing endpoint)

### Schema Requirements (Future Enhancement)

12. [ ] Add `isLinkAccessible` field to galleries table (for link-based access) - LATER
13. [ ] Add `accessToken` field to galleries table (for secure link access) - LATER
14. [x] Ensure `isPublic` field supports public access (no login required) - ALREADY WORKING

### Endpoints to MODIFY

15. [x] `GET /api/galleries/[id]` - Include gallery items/memories in response with access control
16. [x] `PATCH /api/galleries/[id]` - Update metadata (title, description) - already implemented
17. [x] `DELETE /api/galleries/[id]` - Ensure cascade delete of gallery items - already implemented

### Schema Migration Fixes

18. [x] `POST /api/galleries` - Fixed schema mismatch: Updated to use unified `memories` table instead of separate per-type tables
19. [x] `POST /api/galleries` - Fixed folder resolution: Now uses `parentFolderId` instead of `metadata->>'folderName'`

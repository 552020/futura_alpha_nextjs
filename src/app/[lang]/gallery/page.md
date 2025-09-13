# Gallery Page Analysis

## Overview

The gallery page is a React client component that displays a user's photo galleries in either grid or list view. It includes authentication guards, loading states, and interactive gallery management.

## Main Components

### Core State Management

- **Authentication State**: Uses `useAuthGuard` hook for user authorization
- **Gallery Data**: Manages galleries, filtered galleries, and loading states
- **UI State**: Controls view mode (grid/list) and modal visibility

### Key Components Used

1. **GalleryTopBar**: Handles filtering, view mode switching, and gallery creation
2. **GalleryGrid**: Displays galleries in grid/list view with responsive layout
3. **CreateGalleryModal**: Modal for creating new galleries
4. **StorageStatusBadge**: Shows storage status for each gallery
5. **RequireAuth**: Authentication guard component

### Data Flow

1. **Initial Load**: Fetches galleries via `galleryService.listGalleries()`
2. **Filtering**: Real-time filtering through `GalleryTopBar`
3. **Creation**: New galleries trigger reload via `handleGalleryCreated`
4. **Navigation**: Clicking galleries navigates to individual gallery view

### UI Features

- **Responsive Grid**: Adapts from 1 to 4 columns based on screen size
- **Gallery Cards**: Display cover image, title, description, privacy status, and metadata
- **Loading States**: Reusable `LoadingSpinner` component for consistent loading UX
- **Error Handling**: Reusable `ErrorState` component with retry functionality and consistent styling

### Authentication & Security

- Protected route requiring user authentication
- Shows loading spinner during auth check
- Redirects unauthenticated users to login

### Performance Considerations

- Mock data support for development (`USE_MOCK_DATA` flag)
- Pagination support (currently set to 12 items per page)
- Efficient state updates and re-renders

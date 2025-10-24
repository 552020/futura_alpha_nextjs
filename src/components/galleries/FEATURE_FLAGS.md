# Feature Flags

This document describes the feature flags available in the application and how to use them.

## Rating and Hide Features

The rating and hide features in the gallery allow users to:
- Rate photos with 1-5 stars
- Hide/unhide photos from the gallery view
- View hidden photos in a separate tab

### Enabling/Disabling the Feature

This feature is controlled by a localStorage flag called `showRatingAndHideFeatures`.

#### Using the Browser Console

To enable the feature, open your browser's developer console and run:

```javascript
localStorage.setItem('futura_feature_flags', JSON.stringify({ showRatingAndHideFeatures: true }));
```

Then refresh the page.

To disable the feature:

```javascript
localStorage.setItem('futura_feature_flags', JSON.stringify({ showRatingAndHideFeatures: false }));
```

Then refresh the page.

#### Default Behavior

By default, the rating and hide features are **disabled** (`showRatingAndHideFeatures: false`).

### What Changes When Enabled

When the feature is enabled (`showRatingAndHideFeatures: true`):

1. **Rating Stars**: Photo cards in selection mode show rating stars (1-5) at the bottom right
2. **Hide/Unhide Button**: Photo cards in selection mode show a hide/unhide button at the bottom left
3. **Hidden Tab**: The selection bar shows "All Photos" and "Hidden" tabs to switch between views
4. **Filtering**: Photos marked as hidden are removed from the "All Photos" view
5. **Email Integration**: Selected photos' ratings are included when sending selections via email

When disabled (`showRatingAndHideFeatures: false`):

- Rating and hide controls are not shown
- All photos are always visible
- No rating data is included in emails
- The interface is simpler with just selection functionality

### Implementation Details

The feature flag is managed by the `useFeatureFlags` hook located at `/src/hooks/useFeatureFlags.ts`.

The implementation uses conditional prop passing:
- When the flag is `false`, rating and hide handlers are passed as `undefined`
- UI components check for handler existence before rendering controls
- This ensures no UI elements are shown when the feature is disabled

Files affected by this feature flag:
- `/src/app/[lang]/gallery/[id]/page.tsx` - Main gallery page with conditional handler passing
- `/src/components/common/content-card.tsx` - Photo card with conditional UI rendering
- `/src/components/galleries/gallery-photo-grid.tsx` - Grid component with optional handlers
- `/src/components/galleries/gallery-selection-bar.tsx` - Selection bar with conditional tabs
- `/src/components/galleries/gallery-selection-panel.tsx` - Side panel with ratings
- `/src/contexts/SelectionContext.tsx` - Context with rating/hide state
- `/src/components/common/base-grid.tsx` - Base grid with optional props

### Adding More Feature Flags

To add a new feature flag:

1. Update the `FeatureFlags` interface in `/src/hooks/useFeatureFlags.ts`
2. Add the default value in `DEFAULT_FLAGS`
3. Use the `flags` object from `useFeatureFlags()` hook in your components
4. Conditionally render features based on the flag value

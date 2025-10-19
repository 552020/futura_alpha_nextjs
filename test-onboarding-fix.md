# Onboarding 401 Fix Test

## Problem

The onboarding page was showing 401 errors for `/api/me/hosting-preferences` because:

1. `ItemUploadButton` component calls `useFileUpload` hook
2. `useFileUpload` hook calls `useHostingPreferences()`
3. `useHostingPreferences()` tries to fetch from `/api/me/hosting-preferences`
4. This endpoint requires authentication, but onboarding users are unauthenticated

## Solution

Modified `useHostingPreferences` hook to accept an `enabled` option:

- Added `options?: { enabled?: boolean }` parameter
- Added `enabled: options?.enabled !== false` to the query options
- Modified `useFileUpload` to call `useHostingPreferences({ enabled: !isOnboarding })`

## Expected Result

- Onboarding users: No API call to `/api/me/hosting-preferences` (no 401 errors)
- Authenticated users: Normal API call to fetch hosting preferences
- Onboarding flow uses hardcoded Vercel Blob preferences instead

## Test Steps

1. Navigate to `/en/onboarding/items-upload`
2. Check browser console - should see no 401 errors for hosting preferences
3. Verify upload functionality still works with Vercel Blob

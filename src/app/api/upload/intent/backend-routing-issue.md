# Backend Routing Issue

## Upload Flow Analysis (Corrected):

### **1. User Clicks Upload**

- User clicks "Add Folder" or upload button
- `useFileUpload` hook is triggered

### **2. Intent Request (PROBLEM)**

```typescript
// In use-file-upload.ts
const storage = await requestUploadStorage();
```

- **Currently**: Always calls `/api/upload/intent` (Vercel route)
- **Problem**: If backend is ICP, this should call ICP canister directly

### **3. Upload Decision**

```typescript
// In use-file-upload.ts
if (storage.blob_storage === 'icp') {
  // Upload to ICP canister
} else {
  // Upload to S3/Vercel Blob/etc
}
```

### **4. Upload Execution**

- Files are uploaded to the chosen blob storage
- Upload service returns `appMemoryId`

### **5. Verification Call (SAME PROBLEM)**

```typescript
// In use-file-upload.ts
await verifyUpload({
  appMemoryId,
  database: storage.database, // Could be 'icp'
  blob_storage: storage.blob_storage, // Could be 'icp'
  // ...
});
```

### **6. Verification Decision (SAME PROBLEM)**

```typescript
// In verifyUpload function
await fetch('/api/upload/verify', { ... });  // ALWAYS calls Vercel route
```

## The Real Problems:

1. **Intent request** always calls Vercel route, even if backend is ICP
2. **Verification** always calls Vercel route, even if backend is ICP

## What We Need:

The frontend needs to know **which backend to call** for both intent and verification:

- **Vercel backend** → Call Vercel routes
- **ICP backend** → Call ICP canister directly

**How does the frontend know which backend to use?**

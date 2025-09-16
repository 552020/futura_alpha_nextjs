# File Upload Route - Snippet Analysis

## Overview

Analysis of `route.ts` to identify logical units that can be exported as reusable functions.

## Snippet-by-Snippet Analysis

### 1. **Form Data Parsing & File Extraction** (lines 7-15)

```typescript
console.log('📦 Parsing form data...');
const formData = await request.formData();
const file = formData.get('file') as File;

if (!file) {
  console.error('❌ No file found in form data');
  return NextResponse.json({ error: 'Missing file' }, { status: 400 });
}
```

**Exportable?** ✅ **YES** - `parseFormData(request: NextRequest)`

**File vs Folder:** For folder upload, this would extract multiple files instead of a single file. The function would need to handle `formData.getAll("file")` or iterate through all form entries.

### 2. **File Details Logging** (lines 17-22)

```typescript
console.log('📄 File details:', {
  name: file.name,
  type: file.type,
  size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
});
```

**Exportable?** ✅ **YES** - `logFileDetails(file: File)`

### 3. **File Type Validation** (lines 24-26)

```typescript
if (!isAcceptedMimeType(file.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
}
```

**Exportable?** ✅ **YES** - `validateFileType(file: File): NextResponse | null`

### 4. **File Validation Block** (lines 28-47)

```typescript
let validationResult;
try {
  console.log('🔍 Starting file validation...');
  validationResult = await validateFile(file);
  if (!validationResult.isValid) {
    console.error('❌ File validation failed:', validationResult.error);
    return NextResponse.json({ error: validationResult.error }, { status: 400 });
  }
  console.log('✅ File validation successful:', {
    type: file.type,
    size: file.size,
  });
} catch (validationError) {
  console.error('❌ Validation error:', validationError);
  return NextResponse.json(
    {
      error: 'File validation failed',
      step: 'validation',
      details: validationError instanceof Error ? validationError.message : String(validationError),
    },
    { status: 500 }
  );
}
```

**Exportable?** ✅ **YES** - `validateFileWithErrorHandling(file: File): Promise<{ validationResult: any, error: NextResponse | null }>`

### 5. **File Upload to Storage** (lines 49-65)

```typescript
let url;
try {
  console.log('📤 Starting file upload to storage...');
  url = await uploadFileToStorage(file, validationResult.buffer);
  console.log('✅ File uploaded successfully to:', url);
} catch (uploadError) {
  console.error('❌ Upload error:', uploadError);
  return NextResponse.json(
    {
      error: 'File upload failed',
      step: 'upload',
      details: uploadError instanceof Error ? uploadError.message : String(uploadError),
    },
    { status: 500 }
  );
}
```

**Exportable?** ✅ **YES** - `uploadFileToStorageWithErrorHandling(file: File, buffer: Buffer): Promise<{ url: string, error: NextResponse | null }>`

### 6. **User Management** (lines 67-79)

```typescript
let allUser;
const existingUserId = formData.get('existingUserId') as string;

if (existingUserId) {
  console.log('👤 Using existing user:', existingUserId);
  allUser = { id: existingUserId };
} else {
  console.log('👤 Creating temporary user...');
  const result = await createTemporaryUserBase('inviter');
  allUser = result.allUser;
  console.log('✅ Temporary user created:', { userId: allUser.id });
}
```

**Exportable?** ✅ **YES** - `getOrCreateUser(existingUserId?: string): Promise<{ id: string }>`

### 7. **Database Storage** (lines 81-105)

```typescript
try {
  console.log('💾 Storing file metadata in database...');
  const result = await storeInDatabase({
    type: getMemoryType(file.type),
    ownerId: allUser.id,
    url,
    file,
    metadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    },
  });
  console.log('✅ File metadata stored successfully');

  return NextResponse.json({
    ...result,
    ownerId: allUser.id,
  });
} catch (dbError) {
  console.error('❌ Database error:', dbError);
  return NextResponse.json(
    {
      error: 'Failed to store file metadata',
      step: 'database',
      details: dbError instanceof Error ? dbError.message : String(dbError),
    },
    { status: 500 }
  );
}
```

**Exportable?** ✅ **YES** - `storeFileInDatabase(file: File, url: string, ownerId: string): Promise<{ result: any, error: NextResponse | null }>`

### 8. **General Error Handling** (lines 107-117)

```typescript
} catch (error) {
  console.error("❌ Unexpected error:", error);
  return NextResponse.json(
    {
      error: "Unexpected error occurred",
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  );
}
```

**Exportable?** ✅ **YES** - `handleUnexpectedError(error: unknown): NextResponse`

## Summary

**All 8 snippets are exportable as logical units!** Each represents a distinct responsibility that could be reused in other endpoints (like the future folder upload endpoint).

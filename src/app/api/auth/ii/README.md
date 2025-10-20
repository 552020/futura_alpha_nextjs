# Internet Identity API Routes

## Overview

This directory contains API routes for Internet Identity account management operations.

## Routes

### `/api/auth/ii/link` - Link Principal
**Method**: POST  
**Purpose**: Link an Internet Identity principal to the current user's account  
**Used by**: `useIILinks` hook, account management components  
**Security**: Supports both nonce verification (recommended) and direct principal (legacy)

**Request Body**:
```json
{
  "principal": "xxxxx-xxxxx-xxxxx-xxxxx-cai",  // Direct principal (legacy)
  "nonce": "abc123..."                          // OR nonce for verification (recommended)
}
```

### `/api/auth/ii/linked` - Get Linked Principals
**Method**: GET  
**Purpose**: Returns all Internet Identity principals linked to the current user  
**Used by**: `useIILinks` hook  
**Security**: Requires authenticated session

**Response**:
```json
{
  "linkedIcPrincipals": ["principal1", "principal2"]
}
```

### `/api/auth/ii/unlink` - Unlink Principal
**Method**: POST  
**Purpose**: Unlink an Internet Identity principal from the current user's account  
**Used by**: `useIILinks` hook  
**Security**: Requires authenticated session

**Request Body**:
```json
{
  "principal": "xxxxx-xxxxx-xxxxx-xxxxx-cai"
}
```

## Related Routes

- `/api/auth/link-ii` - Alternative linking route used by sign-in flows (always uses nonce)
- `/api/ii/challenge` - Creates nonce for verification
- `/api/ii/verify-nonce` - Verifies nonce with canister

## Security Recommendation

The `useIILinks` hook should be updated to always use nonce verification instead of passing principals directly.

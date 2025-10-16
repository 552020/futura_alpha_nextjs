# User API Endpoints

## Overview
This endpoint provides CRUD operations for users. It supports retrieving users by ID or email, updating user information, and deleting users.

## Endpoints

### GET /api/users/[id]
Retrieves a user by their ID (from allUsers table) or by email address.

#### Authentication
**Required**: Yes - User must be authenticated

#### Path Parameters
| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | The allUsers ID of the user    |

#### Query Parameters
| Parameter | Type   | Required | Description                                           |
|-----------|--------|----------|-------------------------------------------------------|
| email     | string | No       | If provided, searches by email instead of ID          |

#### Behavior
- **With email parameter**: Searches the `users` table by email address (ignores the `[id]` path parameter)
- **Without email parameter**: Searches the `allUsers` table by ID, then retrieves the corresponding user or temporary user

#### Response - Success (200 OK)

**By Email:**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://example.com/avatar.jpg",
    "username": "johndoe",
    "userType": "personal",
    "role": "user",
    "plan": "free",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "allUser": {
    "id": "all-user-123",
    "type": "user",
    "userId": "user-123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**By ID (permanent user):**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://example.com/avatar.jpg",
    "username": "johndoe",
    "userType": "personal",
    "role": "user",
    "plan": "free",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "allUser": {
    "id": "all-user-123",
    "type": "user",
    "userId": "user-123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**By ID (temporary user):**
```json
{
  "user": {
    "id": "temp-user-456",
    "name": "Jane Invitee",
    "email": "jane@example.com",
    "secureCode": "abc-123-def",
    "role": "invitee",
    "registrationStatus": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "allUser": {
    "id": "all-user-456",
    "type": "temporary",
    "temporaryUserId": "temp-user-456",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to retrieve user"
}
```

---

### PATCH /api/users/[id]
Updates a user's information (name and/or email).

#### Authentication
**Required**: Yes (implicit through session)

#### Path Parameters
| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | The allUsers ID of the user    |

#### Request Body
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Response - Success (200 OK)
Returns the updated user and allUser objects (same structure as GET).

#### Error Responses
Same as GET endpoint.

---

### DELETE /api/users/[id]
Deletes a user and their corresponding allUsers entry.

#### Authentication
**Required**: Yes (implicit through session)

#### Path Parameters
| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| id        | string | Yes      | The allUsers ID of the user    |

#### Response - Success (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
Same as GET endpoint.

---

## Usage Examples

### JavaScript/TypeScript

**Get user by email:**
```typescript
async function getUserByEmail(email: string) {
  // Note: The ID parameter is required by the route structure but ignored when email is provided
  const response = await fetch(`/api/users/any-id?email=${encodeURIComponent(email)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

// Usage
const { user, allUser } = await getUserByEmail('john@example.com');
```

**Get user by ID:**
```typescript
async function getUserById(allUserId: string) {
  const response = await fetch(`/api/users/${allUserId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

// Usage
const { user, allUser } = await getUserById('all-user-123');
```

**Update user:**
```typescript
async function updateUser(allUserId: string, updates: { name?: string; email?: string }) {
  const response = await fetch(`/api/users/${allUserId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}
```

**Delete user:**
```typescript
async function deleteUser(allUserId: string) {
  const response = await fetch(`/api/users/${allUserId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}
```

### cURL

**Get user by email:**
```bash
curl -X GET "http://localhost:3000/api/users/any-id?email=john@example.com" \
  -H "Cookie: your-session-cookie"
```

**Get user by ID:**
```bash
curl -X GET "http://localhost:3000/api/users/all-user-123" \
  -H "Cookie: your-session-cookie"
```

**Update user:**
```bash
curl -X PATCH "http://localhost:3000/api/users/all-user-123" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"name": "Updated Name", "email": "updated@example.com"}'
```

**Delete user:**
```bash
curl -X DELETE "http://localhost:3000/api/users/all-user-123" \
  -H "Cookie: your-session-cookie"
```

## Notes

- **GET with email**: Requires authentication to prevent unauthorized access to user data
- **Sensitive fields**: Password and other sensitive fields are excluded from responses
- **allUser field**: May be `null` if the user doesn't have a corresponding entry in the `allUsers` table (only when searching by email)
- **Email lookup**: Case-sensitive based on database collation
- **Temporary users**: When retrieving by ID, the endpoint automatically detects and returns temporary user data if applicable
- **ID parameter with email**: When using the `?email` query parameter, the `[id]` path parameter is ignored but still required by the route structure (you can use any value like "any-id")

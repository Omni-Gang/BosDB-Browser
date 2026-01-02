# User Data Privacy Model

## Overview
BosDB implements strict user-level data isolation to ensure privacy and security. Each user can only see and manage their own data.

## Privacy Guarantees

### 🔒 **Connections**
- **Isolation**: Users can only see connections they created
- **Ownership**: Each connection is tied to the user's email address
- **Access Control**: Users can only modify/delete their own connections
- **Header**: Requires `x-user-email` header for authentication

### 📜 **Query History**  
- **User-Specific**: Each query execution is tagged with user's email
- **Privacy**: Users only see their own query history
- **Filtering**: Automatically filtered by logged-in user's email
- **Retention**: Last 100 queries per user

### ⭐ **Saved Queries**
- **Personal Library**: Each saved query belongs to one user
- **Isolation**: Users cannot see other users' saved queries
- **Management**: Users can only edit/delete their own saved queries
- **Organization**: Optional connection-specific filtering

## API Authentication

All data endpoints require the `x-user-email` header:

```typescript
headers: {
    'x-user-email': 'user@company.com',
    'x-org-id': 'org_123' // Optional, for organization scoping
}
```

### GET /api/connections
**Returns**: Only connections owned by the authenticated user

```typescript
// Request
GET /api/connections
Headers: { 'x-user-email': 'john@company.com' }

// Response
{
    connections: [
        // Only connections where userEmail === 'john@company.com'
    ]
}
```

### POST /api/connections
**Creates**: New connection owned by the authen ticated user

```typescript
// Request
POST /api/connections
Headers: { 'x-user-email': 'john@company.com' }
Body: { name, type, host, database, username, password }

// Stored as:
{
    id: 'conn_123',
    userEmail: 'john@company.com', // Owner
    ...connectionDetails
}
```

### DELETE /api/connections?id={connectionId}
**Deletes**: Connection only if owned by authenticated user

```typescript
// Request
DELETE /api/connections?id=conn_123
Headers: { 'x-user-email': 'john@company.com' }

// Authorization Check:
if (connection.userEmail !== requestUserEmail) {
    return 403 Forbidden
}
```

## Data Structures

### Connection
```typescript
interface Connection {
    id: string;
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    database: string;
    credentials: EncryptedCredentials;
    readOnly: boolean;
    userEmail: string; // Owner's email
    createdAt: string;
}
```

### Query History Entry
```typescript
interface QueryHistoryEntry {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    executedAt: string;
    executionTime: number;
    rowCount: number;
    success: boolean;
    error?: string;
    userEmail: string; // User who executed
}
```

### Saved Query
```typescript
interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdAt: string;
    updatedAt: string;
    userEmail: string; // User who created
}
```

## Functions

### Query History
```typescript
// Get user-specific query history
getUserQueryHistory(userEmail: string, connectionId?: string, limit = 50)

// Add entry with user email
addQueryToHistory(entry: { ...QueryHistoryEntry, userEmail: string })
```

### Saved Queries
```typescript
// Get user-specific saved queries
getUserSavedQueries(userEmail: string, connectionId?: string)

// Create with user email
createSavedQuery(query: { ...SavedQuery, userEmail: string })
```

## Multi-Tenant Isolation

Users in the **same organization** have **separate data** by default, but can **share connections**:

```
Organization: company.com
├── john@company.com
│   ├── Connections: [DB-A (Private), DB-Shared (Shared)]
│   ├── Query History: [10 queries]
│   └── Saved Queries: [5 queries]
│
└── jane@company.com
    ├── Connections: [DB-C (Private), DB-Shared (Visible)]
    ├── Query History: [5 queries]
    └── Saved Queries: [2 queries]
```

**Sharing Logic**:
- **Private Connections**: Visible only to owner (`userEmail` match) using `x-user-email`
- **Shared Connections**: Visible to all org members (`organizationId` match) using `x-org-id`
- **Query History**: ALWAYS private to specific user, regardless of organization

Jane CANNOT see John's:
- Private Connections
- Query history
- Saved queries (unless shared explicitly, future feature)

## Security Benefits

✅ **Privacy**: No user can access another user's data  
✅ **Data Leak Prevention**: Queries and connections isolated  
✅ **Audit Trail**: Every action tied to specific user email  
✅ **Clean Deletion**: Delete button only affects own data  
✅ **Organization Scoping**: Users share org but not personal data  

## Implementation Notes

### Frontend Requirements
All API calls must include the logged-in user's email:

```typescript
const userEmail = currentUser.email;

fetch('/api/connections', {
    headers: {
        'x-user-email': userEmail
    }
});
```

### Backend Validation
Every endpoint validates user email:

```typescript
const userEmail = request.headers.get('x-user-email');

if (!userEmail) {
    return NextResponse.json(
        { error: 'User email required' }, 
        { status: 401 }
    );
}
```

### Data Filtering
All data queries filter by user email:

```typescript
// Connections
const userConnections = connections.filter(c => c.userEmail === userEmail);

// Query History
const userHistory = history.filter(h => h.userEmail === userEmail);

// Saved Queries
const userQueries = queries.filter(q => q.userEmail === userEmail);
```

## Migration from Shared Data

If upgrading from a version without user isolation:

1. **Connections**: Existing connections without `userEmail` will be hidden
2. **Query History**: Old entries without `userEmail` won't appear
3. **Saved Queries**: Legacy queries without `userEmail` won't be visible

**Recommendation**: Add a migration script to assign existing data to appropriate users.

## Testing Privacy

### Test Case 1: Connection Isolation
```bash
# As user A
POST /api/connections (creates DB-A)
GET /api/connections → [DB-A]

# As user B  
GET /api/connections → [] (empty, can't see DB-A)
```

### Test Case 2: Delete Authorization
```bash
# As user A
DELETE /api/connections?id=DB-A → 200 OK

# As user B
DELETE /api/connections?id=DB-A → 403 Forbidden
```

### Test Case 3: Query History Isolation
```bash
# As user A
POST /api/query (executes and logs query)
GET /api/history → [shows user A's queries only]

# As user B
GET /api/history → [shows user B's queries only, not A's]
```

---

**Last Updated**: 2025-12-29  
**Version**: 1.0.0  
**Status**: ✅ Fully Implemented

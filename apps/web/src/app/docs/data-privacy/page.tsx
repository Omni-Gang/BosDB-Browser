'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function DataPrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-6">
                <Link href="/docs" className="no-underline text-muted-foreground hover:text-primary text-sm flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                </Link>
            </div>

            <article className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight 
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:text-foreground
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                prose-p:text-muted-foreground prose-p:leading-7
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-border
                prose-img:rounded-lg prose-img:border prose-img:border-border prose-img:shadow-md
                prose-table:border-collapse prose-table:w-full prose-th:text-left prose-th:p-2 prose-td:p-2 prose-tr:border-b prose-tr:border-border
            ">
                <h1>User Data Privacy Model</h1>

                <h2>Overview</h2>
                <p>BosDB implements strict user-level data isolation to ensure privacy and security. Each user can only see and manage their own data.</p>

                <h2>Privacy Guarantees</h2>

                <h3>🔒 <strong>Connections</strong></h3>
                <ul>
                    <li><strong>Isolation</strong>: Users can only see connections they created</li>
                    <li><strong>Ownership</strong>: Each connection is tied to the user&apos;s email address</li>
                    <li><strong>Access Control</strong>: Users can only modify/delete their own connections</li>
                    <li><strong>Header</strong>: Requires <code>x-user-email</code> header for authentication</li>
                </ul>

                <h3>📜 <strong>Query History</strong></h3>
                <ul>
                    <li><strong>User-Specific</strong>: Each query execution is tagged with user&apos;s email</li>
                    <li><strong>Privacy</strong>: Users only see their own query history</li>
                    <li><strong>Filtering</strong>: Automatically filtered by logged-in user&apos;s email</li>
                    <li><strong>Retention</strong>: Last 100 queries per user</li>
                </ul>

                <h3>⭐ <strong>Saved Queries</strong></h3>
                <ul>
                    <li><strong>Personal Library</strong>: Each saved query belongs to one user</li>
                    <li><strong>Isolation</strong>: Users cannot see other users&apos; saved queries</li>
                    <li><strong>Management</strong>: Users can only edit/delete their own saved queries</li>
                    <li><strong>Organization</strong>: Optional connection-specific filtering</li>
                </ul>

                <h2>API Authentication</h2>
                <p>All data endpoints require the <code>x-user-email</code> header:</p>
                <CodeBlock language="typescript" code={`headers: {
    'x-user-email': 'user@company.com',
    'x-org-id': 'org_123' // Optional, for organization scoping
}`} />

                <h3>GET /api/connections</h3>
                <p><strong>Returns</strong>: Only connections owned by the authenticated user</p>
                <CodeBlock language="typescript" code={`// Request
GET /api/connections
Headers: { 'x-user-email': 'john@company.com' }

// Response
{
    connections: [
        // Only connections where userEmail === 'john@company.com'
    ]
}`} />

                <h3>POST /api/connections</h3>
                <p><strong>Creates</strong>: New connection owned by the authenticated user</p>
                <CodeBlock language="typescript" code={`// Request
POST /api/connections
Headers: { 'x-user-email': 'john@company.com' }
Body: { name, type, host, database, username, password }

// Stored as:
{
    id: 'conn_123',
    userEmail: 'john@company.com', // Owner
    ...connectionDetails
}`} />

                <h3>DELETE /api/connections?id=&#123;connectionId&#125;</h3>
                <p><strong>Deletes</strong>: Connection only if owned by authenticated user</p>
                <CodeBlock language="typescript" code={`// Request
DELETE /api/connections?id=conn_123
Headers: { 'x-user-email': 'john@company.com' }

// Authorization Check:
if (connection.userEmail !== requestUserEmail) {
    return 403 Forbidden
}`} />

                <h2>Data Structures</h2>

                <h3>Connection</h3>
                <CodeBlock language="typescript" code={`interface Connection {
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
}`} />

                <h3>Query History Entry</h3>
                <CodeBlock language="typescript" code={`interface QueryHistoryEntry {
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
}`} />

                <h3>Saved Query</h3>
                <CodeBlock language="typescript" code={`interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdAt: string;
    updatedAt: string;
    userEmail: string; // User who created
}`} />

                <h2>Functions</h2>

                <h3>Query History</h3>
                <CodeBlock language="typescript" code={`// Get user-specific query history
getUserQueryHistory(userEmail: string, connectionId?: string, limit = 50)

// Add entry with user email
addQueryToHistory(entry: { ...QueryHistoryEntry, userEmail: string })`} />

                <h3>Saved Queries</h3>
                <CodeBlock language="typescript" code={`// Get user-specific saved queries
getUserSavedQueries(userEmail: string, connectionId?: string)

// Create with user email
createSavedQuery(query: { ...SavedQuery, userEmail: string })`} />

                <h2>Multi-Tenant Isolation</h2>
                <p>Users in the <strong>same organization</strong> have <strong>separate data</strong> by default, but can <strong>share connections</strong>:</p>
                <CodeBlock language="text" code={`Organization: company.com
├── john@company.com
│   ├── Connections: [DB-A (Private), DB-Shared (Shared)]
│   ├── Query History: [10 queries]
│   └── Saved Queries: [5 queries]
│
└── jane@company.com
    ├── Connections: [DB-C (Private), DB-Shared (Visible)]
    ├── Query History: [5 queries]
    └── Saved Queries: [2 queries]`} />

                <p><strong>Sharing Logic</strong>:</p>
                <ul>
                    <li><strong>Private Connections</strong>: Visible only to owner (<code>userEmail</code> match) using <code>x-user-email</code></li>
                    <li><strong>Shared Connections</strong>: Visible to all org members (<code>organizationId</code> match) using <code>x-org-id</code></li>
                    <li><strong>Query History</strong>: ALWAYS private to specific user, regardless of organization</li>
                </ul>
                <p>Jane CANNOT see John&apos;s:</p>
                <ul>
                    <li>Private Connections</li>
                    <li>Query history</li>
                    <li>Saved queries (unless shared explicitly, future feature)</li>
                </ul>

                <h2>Security Benefits</h2>
                <ul>
                    <li>✅ <strong>Privacy</strong>: No user can access another user&apos;s data</li>
                    <li>✅ <strong>Data Leak Prevention</strong>: Queries and connections isolated</li>
                    <li>✅ <strong>Audit Trail</strong>: Every action tied to specific user email</li>
                    <li>✅ <strong>Clean Deletion</strong>: Delete button only affects own data</li>
                    <li>✅ <strong>Organization Scoping</strong>: Users share org but not personal data</li>
                </ul>

                <h2>Implementation Notes</h2>

                <h3>Frontend Requirements</h3>
                <p>All API calls must include the logged-in user&apos;s email:</p>
                <CodeBlock language="typescript" code={`const userEmail = currentUser.email;

fetch('/api/connections', {
    headers: {
        'x-user-email': userEmail
    }
});`} />

                <h3>Backend Validation</h3>
                <p>Every endpoint validates user email:</p>
                <CodeBlock language="typescript" code={`const userEmail = request.headers.get('x-user-email');

if (!userEmail) {
    return NextResponse.json(
        { error: 'User email required' }, 
        { status: 401 }
    );
}`} />

                <h3>Data Filtering</h3>
                <p>All data queries filter by user email:</p>
                <CodeBlock language="typescript" code={`// Connections
const userConnections = connections.filter(c => c.userEmail === userEmail);

// Query History
const userHistory = history.filter(h => h.userEmail === userEmail);

// Saved Queries
const userQueries = queries.filter(q => q.userEmail === userEmail);`} />

                <h2>Migration from Shared Data</h2>
                <p>If upgrading from a version without user isolation:</p>
                <ol>
                    <li><strong>Connections</strong>: Existing connections without <code>userEmail</code> will be hidden</li>
                    <li><strong>Query History</strong>: Old entries without <code>userEmail</code> won&apos;t appear</li>
                    <li><strong>Saved Queries</strong>: Legacy queries without <code>userEmail</code> won&apos;t be visible</li>
                </ol>
                <p><strong>Recommendation</strong>: Add a migration script to assign existing data to appropriate users.</p>

                <h2>Testing Privacy</h2>

                <h3>Test Case 1: Connection Isolation</h3>
                <CodeBlock language="bash" code={`# As user A
POST /api/connections (creates DB-A)
GET /api/connections → [DB-A]

# As user B  
GET /api/connections → [] (empty, can't see DB-A)`} />

                <h3>Test Case 2: Delete Authorization</h3>
                <CodeBlock language="bash" code={`# As user A
DELETE /api/connections?id=DB-A → 200 OK

# As user B
DELETE /api/connections?id=DB-A → 403 Forbidden`} />

                <h3>Test Case 3: Query History Isolation</h3>
                <CodeBlock language="bash" code={`# As user A
POST /api/query (executes and logs query)
GET /api/history → [shows user A's queries only]

# As user B
GET /api/history → [shows user B's queries only, not A's]`} />

                <hr />
                <p><strong>Last Updated</strong>: 2025-12-29<br />
                    <strong>Version</strong>: 1.0.0<br />
                    <strong>Status</strong>: ✅ Fully Implemented</p>
            </article>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function VersionControlPage() {
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
                <h1>Git-Like Database Branching - Complete Guide</h1>

                <h2>🎉 STATUS: <strong>FULLY IMPLEMENTED</strong></h2>
                <p>BosDB includes a complete Git-style version control system for databases with ALL major Git features!</p>

                <h2>🌟 Implemented Features</h2>

                <h3>✅ Core Branching Operations</h3>
                <ul>
                    <li>✅ <strong>Create Branch</strong> - Create new branches from any commit</li>
                    <li>✅ <strong>Checkout Branch</strong> - Switch between branches</li>
                    <li>✅ <strong>Delete Branch</strong> - Remove branches (with protection)</li>
                    <li>✅ <strong>List Branches</strong> - View all branches</li>
                    <li>✅ <strong>Current Branch</strong> - Track active branch</li>
                </ul>

                <h3>✅ Advanced Git Operations</h3>
                <ul>
                    <li>✅ <strong>Merge</strong> - Merge branches with conflict detection</li>
                    <li>✅ <strong>Cherry-Pick</strong> - Apply specific commits to current branch</li>
                    <li>✅ <strong>Rebase</strong> - Rebase current branch onto another</li>
                    <li>✅ <strong>Stash</strong> - Save and restore uncommitted changes</li>
                    <li>✅ <strong>Tags</strong> - Create lightweight and annotated tags</li>
                    <li>✅ <strong>Diff</strong> - Compare commits and branches</li>
                    <li>✅ <strong>Reflog</strong> - Track all reference updates</li>
                    <li>✅ <strong>Log</strong> - View commit history with filters</li>
                </ul>

                <h3>✅ Specialized Services</h3>
                <ul>
                    <li>✅ <strong>Blame</strong> - Track changes by author and commit</li>
                    <li>✅ <strong>Bisect</strong> - Binary search to find bad commit</li>
                    <li>✅ <strong>Patches</strong> - Create and apply patch files</li>
                </ul>

                <h2>📖 API Endpoints</h2>

                <h3>Branch Management</h3>

                <h4>GET /api/vcs/branches?connectionId=&#123;id&#125;</h4>
                <p><strong>List all branches</strong></p>
                <CodeBlock language="typescript" code={`GET /api/vcs/branches?connectionId=conn_123

// Response
{
  "branches": [
    { "name": "main", "commitId": "abc123", "protected": true },
    { "name": "feature", "commitId": "def456", "protected": false }
  ],
  "currentBranch": "main"
}`} />

                <h4>POST /api/vcs/branches</h4>
                <p><strong>Create new branch</strong></p>
                <CodeBlock language="typescript" code={`POST /api/vcs/branches
Body: {
  "connectionId": "conn_123",
  "name": "feature-new-schema",
  "action": "create"
}

// Response
{
  "success": true,
  "data": {
    "name": "feature-new-schema",
    "commitId": "abc123",
    "protected": false
  }
}`} />

                <h4>POST /api/vcs/branches (Checkout)</h4>
                <p><strong>Switch to a different branch</strong></p>
                <CodeBlock language="typescript" code={`POST /api/vcs/branches
Body: {
  "connectionId": "conn_123",
  "name": "feature-new-schema",
  "action": "checkout"
}

// Response
{
  "success": true,
  "data": {
    "schema": { /* database snapshot */ },
    "data": { /* table data */ },
    "timestamp": "2025-12-29T..."
  }
}`} />

                <h3>Commit Operations</h3>

                <h4>POST /api/vcs/commit</h4>
                <p><strong>Create a new commit</strong></p>
                <CodeBlock language="typescript" code={`POST /api/vcs/commit
Body: {
  "connectionId": "conn_123",
  "message": "Add users table",
  "author": {
    "name": "John Doe",
    "email": "john@company.com"
  },
  "changes": [
    {
      "type": "SCHEMA",
      "operation": "CREATE",
      "target": "users",
      "tableName": "users",
      "description": "Created users table"
    }
  ],
  "snapshot": { /* current database snapshot */ }
}`} />

                <h2>🔄 Common Workflows</h2>

                <h3>Workflow 1: Feature Development</h3>
                <CodeBlock language="bash" code={`# User wants to add a new feature with schema changes

1. Create feature branch
POST /api/vcs/branches
{ "connectionId": "conn_123", "name": "feature-user-profiles", "action": "create" }

2. Checkout feature branch
POST /api/vcs/branches
{ "connectionId": "conn_123", "name": "feature-user-profiles", "action": "checkout" }

3. Make schema changes (add users table, columns, etc.)

4. Commit changes
POST /api/vcs/commit
{ 
  "connectionId": "conn_123",
  "message": "Add user profiles table",
  "changes": [/* changes */],
  "snapshot": {/* current state */}
}

5. When ready, merge to main
POST /api/vcs/merge
{
  "connectionId": "conn_123",
  "sourceBranch": "feature-user-profiles",
  "targetBranch": "main",
  "strategy": "RECURSIVE"
}`} />

                <h3>Workflow 2: Testing Schema Changes Safely</h3>
                <CodeBlock language="bash" code={`# Test schema changes without affecting production

1. Create test branch from main
POST /api/vcs/branches
{ "name": "test-new-indexes", "action": "create" }

2. Switch to test branch
POST /api/vcs/branches
{ "name": "test-new-indexes", "action": "checkout" }

3. Apply schema changes and test performance

4. If good → merge to main
   If bad → delete branch and switch back to main`} />

                <h3>Workflow 3: Rollback to Previous State</h3>
                <CodeBlock language="bash" code={`# Rollback to a previous commit

1. View commit history
GET /api/vcs/log?connectionId=conn_123

2. Find the good commit (e.g., "commit-xyz")

3. Create branch from that commit
POST /api/vcs/branches
{ 
  "name": "rollback-branch",
  "fromCommit": "commit-xyz",
  "action": "create"
}

4. Checkout rollback branch
POST /api/vcs/branches
{ "name": "rollback-branch", "action": "checkout" }

# Database is now at that previous state!`} />

                <h3>Workflow 4: Cherry-Pick Specific Changes</h3>
                <CodeBlock language="bash" code={`# Apply only specific commits from another branch

1. Find commit you want (e.g., from feature-A)
GET /api/vcs/log?connectionId=conn_123&branch=feature-A

2. Cherry-pick that commit to current branch
POST /api/vcs/cherry-pick
{
  "connectionId": "conn_123",
  "commitId": "specific-commit-id"
}

# That commit's changes are now applied to current branch`} />

                <h2>🎨 Data Structures</h2>

                <h3>Branch</h3>
                <CodeBlock language="typescript" code={`interface Branch {
  name: string;
  commitId: string;          // Current commit
  upstream?: string;         // If tracking remote
  protected: boolean;        // Main branch protected
  metadata?: Record<string, any>;
}`} />

                <h3>Commit</h3>
                <CodeBlock language="typescript" code={`interface Commit {
  id: string;
  message: string;
  author: Author;
  timestamp: Date;
  parentIds: string[];       // Support for merge commits
  treeId: string;           // Database snapshot reference
  changes: Change[];        // What changed
  signature?: CommitSignature;
}`} />

                <h3>Merge Result</h3>
                <CodeBlock language="typescript" code={`interface MergeResult {
  success: boolean;
  commitId?: string;
  conflicts: MergeConflict[];
  strategy: 'RECURSIVE' | 'OURS' | 'THEIRS' | 'FAST_FORWARD';
  message: string;
}`} />

                <h2>🔀 Merge Strategies</h2>

                <h3>1. Fast-Forward Merge</h3>
                <ul>
                    <li>Used when target branch is ancestor of source</li>
                    <li>No merge commit created</li>
                    <li>Cleanest history</li>
                </ul>

                <h3>2. Recursive Merge (3-way)</h3>
                <ul>
                    <li>Used when branches have diverged</li>
                    <li>Creates merge commit</li>
                    <li>Can detect conflicts</li>
                </ul>

                <h3>3. Ours Strategy</h3>
                <ul>
                    <li>Always use changes from current branch</li>
                    <li>Ignores incoming changes</li>
                </ul>

                <h3>4. Theirs Strategy</h3>
                <ul>
                    <li>Always use changes from source branch</li>
                    <li>Overrides current branch</li>
                </ul>

                <h2>⚔️ Conflict Resolution</h2>
                <p>When merging, conflicts can occur:</p>
                <CodeBlock language="typescript" code={`interface MergeConflict {
  type: 'SCHEMA' | 'DATA';
  target: string;              // Table/column name
  description: string;
  currentValue: any;           // Current branch value
  incomingValue: any;          // Source branch value
  baseValue?: any;             // Common ancestor value
  resolved: boolean;
  resolution?: any;            // User's resolution
}`} />
                <p><strong>Resolution Process:</strong></p>
                <ol>
                    <li>Merge attempt returns conflicts</li>
                    <li>User reviews each conflict</li>
                    <li>User provides resolution</li>
                    <li>Retry merge with resolutions</li>
                </ol>

                <h2>📊 Advanced Features</h2>

                <h3>Stash - Save Work in Progress</h3>
                <CodeBlock language="typescript" code={`// Save current changes
POST /api/vcs/stash
{
  "connectionId": "conn_123",
  "message": "WIP: Adding indexes",
  "changes": [/* current uncommitted changes */]
}

// Apply stashed changes later
POST /api/vcs/stash/apply
{ "connectionId": "conn_123" }

// Or pop (apply + delete)
POST /api/vcs/stash/pop
{ "connectionId": "conn_123" }`} />

                <h3>Tags - Mark Important Versions</h3>
                <CodeBlock language="typescript" code={`// Create release tag
POST /api/vcs/tags
{
  "connectionId": "conn_123",
  "name": "v1.0.0",
  "commitId": "commit-abc",
  "message": "Production release 1.0.0",
  "type": "ANNOTATED"
}

// Checkout a tag
POST /api/vcs/checkout/tag
{ "tagName": "v1.0.0" }`} />

                <h3>Reflog - Track All Changes</h3>
                <CodeBlock language="typescript" code={`// View all reference updates (checkout, commit, merge, etc.)
GET /api/vcs/reflog?connectionId=conn_123

// Response shows complete history of HEAD movements
[
  {
    "ref": "main",
    "oldCommitId": "abc",
    "newCommitId": "def",
    "action": "COMMIT",
    "message": "commit: Add users table",
    "timestamp": "..."
  },
  {
    "ref": "feature",
    "oldCommitId": "def",
    "newCommitId": "ghi",
    "action": "CHECKOUT",
    "message": "checkout: moving from main to feature",
    "timestamp": "..."
  }
]`} />

                <h3>Diff - Compare Branches/Commits</h3>
                <CodeBlock language="typescript" code={`POST /api/vcs/diff
{
  "connectionId": "conn_123",
  "timestamp": "2025-01-01"
}`} />

                <h2>🎯 Best Practices</h2>

                <h3>1. Protected Branches</h3>
                <ul>
                    <li>Keep <code>main</code> branch protected</li>
                    <li>Require reviews before merging to main</li>
                    <li>Test changes in feature branches first</li>
                </ul>

                <h3>2. Meaningful Commits</h3>
                <CodeBlock language="typescript" code={`// Good
"Add user authentication table with email and password columns"

// Bad
"updates"`} />

                <h3>3. Feature Branch Workflow</h3>
                <CodeBlock language="text" code={`main
 │
 ├── feature-user-auth
 │   └── (develop here)
 │
 ├── feature-analytics
 │   └── (develop here)
 │
 └── (merge when ready)`} />

                <h2>🔒 Security</h2>

                <h3>Branch Protection</h3>
                <CodeBlock language="typescript" code={`{
  name: "main",
  protected: true  // Cannot be deleted without force flag
}`} />

                <h2>🚀 Summary</h2>
                <p>BosDB&apos;s Git-like version control gives you:</p>
                <ul>
                    <li>✅ <strong>Safe Experimentation</strong> - Test changes in branches</li>
                    <li>✅ <strong>Easy Rollback</strong> - Revert to any previous state</li>
                    <li>✅ <strong>Collaboration</strong> - Multiple developers, separate branches</li>
                    <li>✅ <strong>Audit Trail</strong> - Complete history of all changes</li>
                    <li>✅ <strong>Conflict Resolution</strong> - Merge branches safely</li>
                    <li>✅ <strong>Production Safety</strong> - Protected main branch</li>
                </ul>
                <p><strong>All the power of Git, for your database!</strong> 🚀</p>

                <hr />
                <p><strong>Last Updated</strong>: 2025-12-29<br />
                    <strong>Version</strong>: 1.0.0<br />
                    <strong>Package</strong>: @bosdb/version-control<br />
                    <strong>Status</strong>: ✅ Production Ready</p>
            </article>
        </div>
    );
}

# Git-Like Database Branching - Complete Guide

## 🎉 STATUS: **FULLY IMPLEMENTED**

BosDB includes a complete Git-style version control system for databases with ALL major Git features!

## 🌟 Implemented Features

### ✅ Core Branching Operations
- ✅ **Create Branch** - Create new branches from any commit
- ✅ **Checkout Branch** - Switch between branches
- ✅ **Delete Branch** - Remove branches (with protection)
- ✅ **List Branches** - View all branches
- ✅ **Current Branch** - Track active branch

### ✅ Advanced Git Operations
- ✅ **Merge** - Merge branches with conflict detection
- ✅ **Cherry-Pick** - Apply specific commits to current branch
- ✅ **Rebase** - Rebase current branch onto another
- ✅ **Stash** - Save and restore uncommitted changes
- ✅ **Tags** - Create lightweight and annotated tags
- ✅ **Diff** - Compare commits and branches
- ✅ **Reflog** - Track all reference updates
- ✅ **Log** - View commit history with filters

### ✅ Specialized Services
- ✅ **Blame** - Track changes by author and commit
- ✅ **Bisect** - Binary search to find bad commit
- ✅ **Patches** - Create and apply patch files

## 📖 API Endpoints

### Branch Management

#### GET /api/vcs/branches?connectionId={id}
**List all branches**
```typescript
GET /api/vcs/branches?connectionId=conn_123

// Response
{
  "branches": [
    { "name": "main", "commitId": "abc123", "protected": true },
    { "name": "feature", "commitId": "def456", "protected": false }
  ],
  "currentBranch": "main"
}
```

#### POST /api/vcs/branches
**Create new branch**
```typescript
POST /api/vcs/branches
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
}
```

#### POST /api/vcs/branches (Checkout)
**Switch to a different branch**
```typescript
POST /api/vcs/branches
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
}
```

### Commit Operations

#### POST /api/vcs/commit
**Create a new commit**
```typescript
POST /api/vcs/commit
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
}
```

## 🔄 Common Workflows

### Workflow 1: Feature Development

```bash
# User wants to add a new feature with schema changes

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
}
```

### Workflow 2: Testing Schema Changes Safely

```bash
# Test schema changes without affecting production

1. Create test branch from main
POST /api/vcs/branches
{ "name": "test-new-indexes", "action": "create" }

2. Switch to test branch
POST /api/vcs/branches
{ "name": "test-new-indexes", "action": "checkout" }

3. Apply schema changes and test performance

4. If good → merge to main
   If bad → delete branch and switch back to main
```

### Workflow 3: Rollback to Previous State

```bash
# Rollback to a previous commit

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

# Database is now at that previous state!
```

### Workflow 4: Cherry-Pick Specific Changes

```bash
# Apply only specific commits from another branch

1. Find commit you want (e.g., from feature-A)
GET /api/vcs/log?connectionId=conn_123&branch=feature-A

2. Cherry-pick that commit to current branch
POST /api/vcs/cherry-pick
{
  "connectionId": "conn_123",
  "commitId": "specific-commit-id"
}

# That commit's changes are now applied to current branch
```

## 🎨 Data Structures

### Branch
```typescript
interface Branch {
  name: string;
  commitId: string;          // Current commit
  upstream?: string;         // If tracking remote
  protected: boolean;        // Main branch protected
  metadata?: Record<string, any>;
}
```

### Commit
```typescript
interface Commit {
  id: string;
  message: string;
  author: Author;
  timestamp: Date;
  parentIds: string[];       // Support for merge commits
  treeId: string;           // Database snapshot reference
  changes: Change[];        // What changed
  signature?: CommitSignature;
}
```

### Merge Result
```typescript
interface MergeResult {
  success: boolean;
  commitId?: string;
  conflicts: MergeConflict[];
  strategy: 'RECURSIVE' | 'OURS' | 'THEIRS' | 'FAST_FORWARD';
  message: string;
}
```

## 🔀 Merge Strategies

### 1. Fast-Forward Merge
- Used when target branch is ancestor of source
- No merge commit created
- Cleanest history

### 2. Recursive Merge (3-way)
- Used when branches have diverged
- Creates merge commit
- Can detect conflicts

### 3. Ours Strategy
- Always use changes from current branch
- Ignores incoming changes

### 4. Theirs Strategy
- Always use changes from source branch
- Overrides current branch

## ⚔️ Conflict Resolution

When merging, conflicts can occur:

```typescript
interface MergeConflict {
  type: 'SCHEMA' | 'DATA';
  target: string;              // Table/column name
  description: string;
  currentValue: any;           // Current branch value
  incomingValue: any;          // Source branch value
  baseValue?: any;             // Common ancestor value
  resolved: boolean;
  resolution?: any;            // User's resolution
}
```

**Resolution Process:**
1. Merge attempt returns conflicts
2. User reviews each conflict3. User provides resolution
4. Retry merge with resolutions

## 📊 Advanced Features

### Stash - Save Work in Progress
```typescript
// Save current changes
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
{ "connectionId": "conn_123" }
```

### Tags - Mark Important Versions
```typescript
// Create release tag
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
{ "tagName": "v1.0.0" }
```

### Reflog - Track All Changes
```typescript
// View all reference updates (checkout, commit, merge, etc.)
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
]
```

### Diff - Compare Branches/Commits
```typescript
POST /api/vcs/diff
{
  "connectionId": "conn_123",
  "fromCommit": "commit-abc",
  "toCommit": "commit-xyz"
}

// Response
{
  "schemaChanges": [/* table/column changes */],
  "dataChanges": [/* data modifications */],
  "summary": {
    "filesChanged": 5,
    "insertions": 42,
    "deletions": 17,
    "modifications": 8
  }
}
```

## 🎯 Best Practices

### 1. Protected Branches
- Keep `main` branch protected
- Require reviews before merging to main
- Test changes in feature branches first

### 2. Meaningful Commits
```typescript
// Good
"Add user authentication table with email and password columns"

// Bad
"updates"
```

### 3. Feature Branch Workflow
```
main
 │
 ├── feature-user-auth
 │   └── (develop here)
 │
 ├── feature-analytics
 │   └── (develop here)
 │
 └── (merge when ready)
```

### 4. Regular Commits
- Commit logical units of work
- Don't wait too long between commits
- Easy to rollback smaller changes

## 🔒 Security

### Branch Protection
```typescript
{
  name: "main",
  protected: true  // Cannot be deleted without force flag
}
```

### Commit Signing (Available)
```typescript
{
  signature: {
    signer: "John Doe",
    publicKey: "...",
    signature: "...",
    algorithm: "RSA",
    verified: true
  }
}
```

## 🚀 Example: Complete Feature Development

```typescript
// 1. Start from main
POST /api/vcs/branches
{ "name": "main", "action": "checkout" }

// 2. Create feature branch
POST /api/vcs/branches
{ "name": "feature-payments", "action": "create" }

// 3. Switch to feature branch
POST /api/vcs/branches
{ "name": "feature-payments", "action": "checkout" }

// 4. Add payments table
// (make schema changes via regular DB operations)

// 5. Commit changes
POST /api/vcs/commit
{
  "message": "Add payments table with Stripe integration",
  "changes": [
    {
      "type": "SCHEMA",
      "operation": "CREATE",
      "tableName": "payments",
      "description": "Created payments table"
    }
  ],
  "snapshot": { /* current state */ }
}

// 6. Add indexes
// (make more changes)

// 7. Commit again
POST /api/vcs/commit
{
  "message": "Add indexes for payment queries",
  "changes": [...]
}

// 8. Test thoroughly in feature branch

// 9. Switch back to main
POST /api/vcs/branches
{ "name": "main", "action": "checkout" }

// 10. Merge feature to main
POST /api/vcs/merge
{
  "sourceBranch": "feature-payments",
  "strategy": "RECURSIVE",
  "message": "Merge: Add payment system"
}

// 11. If successful, delete feature branch
DELETE /api/vcs/branches?name=feature-payments

// ✅ Feature complete and in production!
```

## 📈 Monitoring & Debugging

### View Commit History
```typescript
GET /api/vcs/log?connectionId=conn_123&maxCount=50

// With filters
GET /api/vcs/log?connectionId=conn_123&author=John&since=2025-01-01
```

### Blame - Find Who Changed What
```typescript
POST /api/vcs/blame
{
  "connectionId": "conn_123",
  "table": "users",
  "column": "email"
}

// Shows which commit/author added or modified that column
```

### Bisect - Find Bug Introduction
```typescript
// Start bisect session
POST /api/vcs/bisect/start
{ "goodCommit": "commit-old", "badCommit": "commit-current" }

// Mark commits as good/bad
POST /api/vcs/bisect/good
POST /api/vcs/bisect/bad

// Automatically finds first bad commit
```

## 🎓 Summary

BosDB's Git-like version control gives you:

✅ **Safe Experimentation** - Test changes in branches  
✅ **Easy Rollback** - Revert to any previous state  
✅ **Collaboration** - Multiple developers, separate branches  
✅ **Audit Trail** - Complete history of all changes  
✅ **Conflict Resolution** - Merge branches safely  
✅ **Production Safety** - Protected main branch  

**All the power of Git, for your database!** 🚀

---

**Last Updated**: 2025-12-29  
**Version**: 1.0.0  
**Package**: @bosdb/version-control  
**Status**: ✅ Production Ready

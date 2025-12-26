# Version Control Package

Git-like version control for databases - track, commit, rollback, and compare database changes.

## Features

### ✅ Implemented

- **Commit System** - Save database state with messages
- **Branch Management** - Create and switch branches
- **Rollback** - Revert to any previous commit
- **Compare** - Diff between revisions
- **History** - Complete audit trail
- **Reflog** - Track all ref changes
- **SVN-style Revisions** - r0, r-1, r-2 notation
- **Multi-user Tracking** - Per-user commits

### Core Operations

```typescript
import { createVersionControl } from '@bosdb/version-control';
import { FileStorage } from '@bosdb/version-control/dist/storage/FileStorage';

// Initialize
const storage = new FileStorage('./vcs-data');
const vc = createVersionControl('connection-id', storage);
await vc.initialize();

// Commit changes
await vc.commit(
  'Added users table',
  { name: 'Ayush', email: 'ayush@example.com', userId: 'ayush-g' },
  [{ type: 'SCHEMA', operation: 'CREATE', target: 'users' }],
  snapshot
);

// Rollback
const commits = await vc.log({ maxCount: 100 });
const targetCommit = commits[2]; // r-2
await vc.commit('Revert to previous state', author, [], targetCommit.snapshot);

// Compare revisions
const diff = compareTwoCommits(commits[0], commits[2]);
```

## Storage Structure

```
.bosdb-vcs/
├── {connectionId}/
│   ├── branches/
│   │   ├── main.json
│   │   └── feature.json
│   ├── commits/
│   │   ├── {timestamp}-{id}.json
│   │   └── ...
│   ├── snapshots/
│   │   ├── {timestamp}-{id}.json
│   │   └── ...
│   ├── pending.json
│   ├── config.json
│   └── reflog/
│       └── reflog.jsonl
```

## API Integration

See `apps/web/src/app/api/vcs/` for Next.js API routes:

- `POST /api/vcs/commit` - Create commit
- `GET /api/vcs/commit` - Get history
- `GET /api/vcs/branches` - List branches
- `GET /api/vcs/pending` - Get pending changes
- `POST /api/vcs/rollback` - Rollback to revision
- `GET /api/vcs/rollback/diff` - Compare revisions

## License

MIT

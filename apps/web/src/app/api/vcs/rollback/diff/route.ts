import { NextRequest, NextResponse } from 'next/server';
import { createVersionControl } from '@bosdb/version-control';
import { FileStorage } from '@bosdb/version-control';
import path from 'path';
import { promises as fs } from 'fs';

// GET /api/vcs/rollback/diff?connectionId=xxx&fromRevision=0&toRevision=-1
// Compare two revisions
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const fromRev = parseInt(searchParams.get('fromRevision') || '0');
    const toRev = parseInt(searchParams.get('toRevision') || '-1');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        await fs.mkdir(vcsPath, { recursive: true });

        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        try {
            await vc.getHEAD();
        } catch {
            await vc.initialize();
        }

        // Get commits
        const logResult = await vc.log({ maxCount: 1000 });
        if (!logResult.success || !logResult.data || logResult.data.length === 0) {
            return NextResponse.json({
                error: 'No commits to compare',
                from: { revision: fromRev, commit: null, changes: [] },
                to: { revision: toRev, commit: null, changes: [] },
                changesSummary: { added: [], modified: [], removed: [] }
            });
        }

        const commits = logResult.data;

        const fromIndex = Math.abs(fromRev);
        const toIndex = Math.abs(toRev);

        const fromCommit = commits[fromIndex];
        const toCommit = commits[toIndex];

        if (!fromCommit && !toCommit) {
            return NextResponse.json({
                error: 'Revisions not found - not enough commits in history',
                from: { revision: fromRev, commit: null, changes: [] },
                to: { revision: toRev, commit: null, changes: [] },
                changesSummary: { added: [], modified: [], removed: [] }
            });
        }

        // Calculate differences
        const differences = {
            from: {
                revision: fromRev,
                commit: fromCommit || null,
                changes: fromCommit?.changes || []
            },
            to: {
                revision: toRev,
                commit: toCommit || null,
                changes: toCommit?.changes || []
            },
            changesSummary: {
                added: [],
                modified: [],
                removed: []
            }
        };

        return NextResponse.json(differences);
    } catch (error) {
        console.error('Diff error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

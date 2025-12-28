import { NextRequest, NextResponse } from 'next/server';
import { createVersionControl } from '@bosdb/version-control';
import { FileStorage } from '@bosdb/version-control';
import path from 'path';
import { promises as fs } from 'fs';

// POST /api/vcs/rollback - Rollback to a specific commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, commitId, targetRevision, author } = body;

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        // Initialize VCS
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

        // Get all commits
        const logResult = await vc.log({ maxCount: 1000 });
        if (!logResult.success || !logResult.data || logResult.data.length === 0) {
            return NextResponse.json({ error: 'No commits to rollback to' }, { status: 404 });
        }

        const commits = logResult.data;

        // Find target commit
        let targetCommit;
        if (targetRevision !== undefined) {
            // Rollback by revision number (e.g., -2 for 2nd previous)
            const targetIndex = Math.abs(targetRevision);
            targetCommit = commits[targetIndex];
        } else if (commitId) {
            // Rollback by commit ID
            targetCommit = commits.find((c: any) => c.id === commitId);
        }

        if (!targetCommit) {
            return NextResponse.json({ error: 'Target commit not found' }, { status: 404 });
        }

        // Use provided author or default to system
        const rollbackAuthor = author || {
            name: 'System',
            email: 'system@bosdb.com'
        };

        // Create a new commit that reverts to this state
        const currentCommit = commits[0];
        const revertMessage = `Rollback to: ${targetCommit.message} (${targetCommit.id.substring(0, 8)})`;

        const revertCommit = await vc.commit(
            revertMessage,
            {
                ...rollbackAuthor,
                timestamp: new Date()
            },
            [{
                type: 'DATA' as any,
                operation: 'ROLLBACK' as any,
                target: 'database',
                description: `Rolled back ${Math.abs(targetRevision || 0)} revision(s) by ${rollbackAuthor.name}`
            }] as any[],
            (targetCommit as any).snapshot || { schema: { tables: {} }, data: { tables: {} }, timestamp: new Date() }
        );

        if (!revertCommit.success) {
            return NextResponse.json({ error: 'Failed to create revert commit' }, { status: 500 });
        }

        // Clear pending changes as they're now invalid after rollback
        const pendingPath = path.join(vcsPath, 'pending.json');
        await fs.writeFile(pendingPath, JSON.stringify({ changes: [] }));

        return NextResponse.json({
            success: true,
            message: `Rolled back to revision ${targetRevision || 'unknown'} by ${rollbackAuthor.name}`,
            targetCommit,
            currentCommit,
            revertCommit: revertCommit.data,
            performedBy: rollbackAuthor
        });
    } catch (error) {
        console.error('Rollback error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

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

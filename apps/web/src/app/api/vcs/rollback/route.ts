import { NextRequest, NextResponse } from 'next/server';
import { generateRollbackSQL } from '@/lib/vcs-helper';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import { getConnectedAdapter } from '@/lib/db-utils';
import { getCommits, createCommit, clearPendingChanges, getCurrentBranch } from '@/lib/vcs-storage';
import { Logger } from '@bosdb/utils';

const logger = new Logger('RollbackAPI');

// POST /api/vcs/rollback - Rollback to a specific commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, commitId, targetRevision, author, isRevert } = body;

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        console.log(`[Rollback] Request: conn=${connectionId}, commit=${commitId}, targetRev=${targetRevision}, isRevert=${isRevert}`);

        // Get connection info
        const connectionInfo = await getConnection(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: `Connection not found: ${connectionId}` }, { status: 404 });
        }

        // Get all commits using shared storage
        const commits = await getCommits(connectionId);
        
        if (commits.length === 0) {
            return NextResponse.json({ error: 'No commits to rollback to' }, { status: 404 });
        }

        // Find target commit
        let targetCommit;
        let commitsToUndo: any[] = [];

        if (isRevert && commitId) {
            // Revert a single specific commit
            targetCommit = commits.find((c: any) => c.id === commitId);
            if (targetCommit) {
                commitsToUndo = [targetCommit];
            }
        } else if (targetRevision !== undefined) {
             // Rollback by revision number (e.g., -1 for previous)
             // Commits are sorted new -> old
             const targetIndex = Math.abs(targetRevision);
             if (commits.length > targetIndex) {
                 targetCommit = commits[targetIndex];
                 // Undo everything strictly NEWER than target
                 commitsToUndo = commits.slice(0, targetIndex);
             } else if (targetIndex === commits.length) {
                 // Rollback to initial state via revision
                 commitsToUndo = commits;
                 targetCommit = { id: 'initial', message: 'Initial State' };
             }
        } else if (commitId) {
            // Rollback BY commit ID (revert state TO match this commit)
            const targetIndex = commits.findIndex((c: any) => c.id === commitId);
            if (targetIndex !== -1) {
                targetCommit = commits[targetIndex];
                commitsToUndo = commits.slice(0, targetIndex);
            } else if (targetIndex === commits.length) {
                // Rollback to initial state
                commitsToUndo = commits;
                targetCommit = { id: 'initial', message: 'Initial State' }; 
            }
        }

        if (!targetCommit) {
            return NextResponse.json({ error: 'Target commit not found' }, { status: 404 });
        }

        // Check if already reverted
        const isAlreadyReverted = commits.some((c: any) =>
            c.message.includes(`Revert:`) && c.message.includes(targetCommit.id.substring(0, 8))
        );

        if (isRevert && isAlreadyReverted) {
            return NextResponse.json({ error: `Commit ${targetCommit.id.substring(0, 8)} has already been reverted.` }, { status: 400 });
        }

        // --- PHYSICAL ROLLBACK ---
        const undoSQLs: string[] = [];
        let skippedManual = false;

        for (const commit of commitsToUndo) {
            // Undo changes in REVERSE order within the commit
            const reversedChanges = [...commit.changes].reverse();
            for (const change of reversedChanges) {
                if (change.status === 'REVERTED') continue; 

                const sql = change.rollbackSQL || generateRollbackSQL(change.query, change.metadata);
                if (sql && sql !== 'MANUAL') {
                    undoSQLs.push(sql);
                } else {
                    // Treat 'MANUAL' or undefined/null as manual intervention required
                    skippedManual = true;
                }
            }
        }

        if (undoSQLs.length === 0 && skippedManual) {
            // Identify what operations were skipped
            const skippedOps = commitsToUndo.flatMap(c => c.changes)
                .filter(ch => !ch.rollbackSQL || ch.rollbackSQL === 'MANUAL')
                .map(ch => ch.operation)
                .join(', ');

            return NextResponse.json({ 
                error: `Cannot automatically revert this commit. It contains operations that require manual rollback: ${skippedOps || 'Data Changes'}` 
            }, { status: 400 });
        }

        logger.info(`Rollback initiated for ${connectionId}. ${undoSQLs.length} undo operations found.`);

        // Execute SQL on database
        if (undoSQLs.length > 0) {
            const { adapter, adapterConnectionId } = await getConnectedAdapter(connectionId);

            for (const sql of undoSQLs) {
                try {
                    logger.info(`Executing undo SQL: ${sql}`);
                    await adapter.executeQuery({
                        connectionId: adapterConnectionId,
                        query: sql,
                        timeout: 30000,
                    });
                } catch (sqlError) {
                    logger.error(`Failed to execute undo SQL: ${sql}`, sqlError);
                }
            }
        }

        // --- VCS SNAPSHOT UPDATE ---
        const rollbackAuthor = author || {
            name: 'System',
            email: 'system@bosdb.com'
        };

        const revertMessage = isRevert
            ? `Revert: ${targetCommit.message} (${targetCommit.id.substring(0, 8)})`
            : `Rollback to: ${targetCommit.message} (${targetCommit.id.substring(0, 8)})`;

        // Get current branch for new commit
        const branch = await getCurrentBranch(connectionId);
        
        const newCommit = {
            id: `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            connectionId,
            branch,
            message: revertMessage,
            author: rollbackAuthor,
            changes: commitsToUndo.flatMap(c => c.changes).map(change => ({
                ...change,
                operation: 'ROLLBACK' as any,
                description: `Undone: ${change.description}`
            })),
            timestamp: new Date().toISOString()
        };

        await createCommit(newCommit);

        // Clear pending changes as they're now invalid after rollback
        await clearPendingChanges(connectionId);

        return NextResponse.json({
            success: true,
            message: isRevert ? `Reverted commit ${targetCommit.id.substring(0, 8)}` : `Rolled back to revision ${targetRevision || 'unknown'}`,
            targetCommit,
            revertCommit: newCommit,
            performedBy: rollbackAuthor
        });

    } catch (error) {
        logger.error('Rollback error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// GET /api/vcs/rollback/diff
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const fromRev = parseInt(searchParams.get('fromRevision') || '0');
    const toRev = parseInt(searchParams.get('toRevision') || '-1');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const commits = await getCommits(connectionId);
        
        if (commits.length === 0) {
            return NextResponse.json({
                error: 'No commits to compare',
                from: { revision: fromRev, commit: null, changes: [] },
                to: { revision: toRev, commit: null, changes: [] },
                changesSummary: { added: [], modified: [], removed: [] }
            });
        }

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
        logger.error('Diff error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

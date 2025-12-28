import { NextRequest, NextResponse } from 'next/server';
import { createVersionControl } from '@bosdb/version-control';
import { FileStorage } from '@bosdb/version-control';
import path from 'path';
import { promises as fs } from 'fs';

// POST /api/vcs/commit - Create a commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, message, author, changes, snapshot } = body;

        if (!connectionId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Initialize VCS
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        await fs.mkdir(vcsPath, { recursive: true });

        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        // Check if initialized, if not initialize
        try {
            await vc.getHEAD();
        } catch {
            await vc.initialize();
        }

        // Ensure branches directory exists and main branch is created
        const branchesDir = path.join(vcsPath, 'branches');
        await fs.mkdir(branchesDir, { recursive: true });

        const mainBranchPath = path.join(branchesDir, 'main.json');
        try {
            await fs.access(mainBranchPath);
        } catch {
            // Create main branch if it doesn't exist
            await fs.writeFile(mainBranchPath, JSON.stringify({
                name: 'main',
                commitId: '',
                protected: true
            }));
        }

        // Use provided author or default
        const commitAuthor = author || {
            name: 'System User',
            email: 'user@bosdb.com',
            timestamp: new Date()
        };

        // Create commit
        const result = await vc.commit(
            message,
            { ...commitAuthor, timestamp: new Date() },
            changes || [],
            snapshot || { schema: { tables: {} }, data: { tables: {} }, timestamp: new Date() }
        );

        if (!result.success) {
            console.error('Commit failed:', result.error);
            return NextResponse.json({ error: result.error || 'Commit failed' }, { status: 500 });
        }

        // Remove only the committed changes from pending
        const pendingPath = path.join(vcsPath, 'pending.json');
        try {
            const pendingData = await fs.readFile(pendingPath, 'utf-8');
            const pending = JSON.parse(pendingData);

            // Filter out the changes that were just committed
            // Match by operation, target, and query for accurate removal
            const remainingChanges = pending.changes.filter((pendingChange: any) => {
                return !changes.some((committedChange: any) =>
                    pendingChange.operation === committedChange.operation &&
                    pendingChange.target === committedChange.target &&
                    pendingChange.query === committedChange.query
                );
            });

            await fs.writeFile(pendingPath, JSON.stringify({ changes: remainingChanges }, null, 2));
        } catch (error) {
            // If pending file doesn't exist or has issues, just create empty one
            await fs.writeFile(pendingPath, JSON.stringify({ changes: [] }));
        }

        return NextResponse.json({ success: true, commit: result.data });
    } catch (error) {
        console.error('Commit API error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// GET /api/vcs/commit?connectionId=xxx - Get commit history
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        await fs.mkdir(vcsPath, { recursive: true });

        const storage = new FileStorage(vcsPath);

        try {
            await storage.initialize();
        } catch {
            // Already initialized
        }

        const vc = createVersionControl(connectionId, storage);

        try {
            await vc.getHEAD();
        } catch {
            await vc.initialize();
        }

        const result = await vc.log({ maxCount: 50 });

        if (!result.success) {
            return NextResponse.json({ commits: [] });
        }

        return NextResponse.json({ commits: result.data || [] });
    } catch (error) {
        console.error('Get commits error:', error);
        return NextResponse.json({ commits: [] });
    }
}

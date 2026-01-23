import { NextRequest, NextResponse } from 'next/server';
import { createCommit, getCommits, getPendingChangesFromStorage, getCurrentBranch } from '@/lib/vcs-storage';

// POST /api/vcs/commit - Create a commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, message, author } = body;

        if (!connectionId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get pending changes
        // Use provided changes (partial commit) or fetch all pending (commit all)
        const changes = body.changes || await getPendingChangesFromStorage(connectionId);

        if (changes.length === 0) {
            return NextResponse.json({ error: 'No pending changes to commit' }, { status: 400 });
        }

        // Get current branch
        const branch = await getCurrentBranch(connectionId);

        // Create commit
        const commitId = `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const commit = {
            id: commitId,
            connectionId,
            branch,
            message,
            author: author || {
                name: 'System User',
                email: 'user@bosdb.com'
            },
            changes,
            timestamp: new Date().toISOString()
        };

        await createCommit(commit);

        return NextResponse.json({ success: true, commit });
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
        const commits = await getCommits(connectionId);
        return NextResponse.json({ commits });
    } catch (error) {
        console.error('Get commits error:', error);
        return NextResponse.json({ commits: [] });
    }
}

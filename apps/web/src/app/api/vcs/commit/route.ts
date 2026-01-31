import { NextRequest, NextResponse } from 'next/server';
import { createCommit, getCommits, getPendingChangesFromStorage, getCurrentBranch } from '@/lib/vcs-storage';

// Helper for CORS headers
function cors(res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email, x-org-id, x-user-role');
    return res;
}

export async function OPTIONS() {
    return cors(new NextResponse(null, { status: 200 }));
}

// POST /api/vcs/commit - Create a commit
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, message, author } = body;

        if (!connectionId || !message) {
            return cors(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }));
        }

        // --- ENFORCE USER PERMISSIONS ---
        const userEmail = request.headers.get('x-user-email');
        const userRole = request.headers.get('x-user-role');

        if (userRole !== 'admin') {
            const { findUserByEmail } = await import('@/lib/users-store');
            if (userEmail) {
                const user = await findUserByEmail(userEmail);
                if (user) {
                    const permission = user.permissions?.find(p => p.connectionId === connectionId);
                    if (!permission || !permission.canCommit) {
                        return cors(NextResponse.json({ error: 'Access denied: Commit permission required' }, { status: 403 }));
                    }
                }
            }
        }
        // --- END ENFORCE USER PERMISSIONS ---

        // Get pending changes
        // Use provided changes (partial commit) or fetch all pending (commit all)
        const changes = body.changes || await getPendingChangesFromStorage(connectionId);

        if (changes.length === 0) {
            return cors(NextResponse.json({ error: 'No pending changes to commit' }, { status: 400 }));
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

        return cors(NextResponse.json({ success: true, commit }));
    } catch (error) {
        console.error('Commit API error:', error);
        return cors(NextResponse.json({ error: String(error) }, { status: 500 }));
    }
}

// GET /api/vcs/commit?connectionId=xxx - Get commit history
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return cors(NextResponse.json({ error: 'Connection ID required' }, { status: 400 }));
    }

    try {
        const commits = await getCommits(connectionId);
        return cors(NextResponse.json({ commits }));
    } catch (error) {
        console.error('Get commits error:', error);
        return cors(NextResponse.json({ commits: [] }));
    }
}

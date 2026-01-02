import { NextRequest, NextResponse } from 'next/server';
import { createVersionControl } from '@bosdb/version-control';
import { FileStorage } from '@bosdb/version-control';
import path from 'path';

// GET /api/vcs/branches?connectionId=xxx - List branches
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    try {
        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        // Ensure initialized and state is loaded
        await vc.initialize();
        await vc.loadHEAD();

        const result = await vc.listBranches();
        const currentBranch = await vc.getCurrentBranch();

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ branches: result.data, currentBranch });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// POST /api/vcs/branches - Create or checkout branch
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, name, action } = body;

        if (!connectionId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const vcsPath = path.join(process.cwd(), '.bosdb-vcs', connectionId);
        const storage = new FileStorage(vcsPath);
        await storage.initialize();

        const vc = createVersionControl(connectionId, storage);

        // Ensure initialized and state is loaded
        await vc.initialize();
        await vc.loadHEAD();

        let result;
        if (action === 'checkout') {
            result = await vc.checkout(name);
        } else {
            result = await vc.createBranch(name);
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

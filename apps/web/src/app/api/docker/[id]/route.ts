import { NextRequest, NextResponse } from 'next/server';
import { startDatabase, stopDatabase, removeDatabase } from '@/lib/docker-manager';

// POST /api/docker/[id]/start - Start a Docker database
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get current user
        const userEmail = request.headers.get('x-user-email');
        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        const { findUserByEmail } = await import('@/lib/users-store');
        const user = await findUserByEmail(userEmail);
        if (!user || !user.organizationId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const action = new URL(request.url).pathname.split('/').pop();

        if (action === 'start') {
            await startDatabase(id, user.organizationId);
            return NextResponse.json({ success: true, message: 'Database started' });
        } else if (action === 'stop') {
            await stopDatabase(id, user.organizationId);
            return NextResponse.json({ success: true, message: 'Database stopped' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error(`[Docker API] Failed to perform action:`, error);
        return NextResponse.json({
            error: error.message || 'Operation failed'
        }, { status: 500 });
    }
}

// DELETE /api/docker/[id] - Remove a Docker database
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const userEmail = request.headers.get('x-user-email');
        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        const { findUserByEmail } = await import('@/lib/users-store');
        const user = await findUserByEmail(userEmail);
        if (!user || !user.organizationId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await removeDatabase(id, user.organizationId);
        return NextResponse.json({ success: true, message: 'Database removed' });

    } catch (error: any) {
        console.error(`[Docker API] Failed to remove database:`, error);
        return NextResponse.json({
            error: error.message || 'Failed to remove database'
        }, { status: 500 });
    }
}

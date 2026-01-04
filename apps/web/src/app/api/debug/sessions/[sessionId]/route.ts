/**
 * Debug API - Session Operations
 * GET/DELETE /api/debug/sessions/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugEngine } from '@/lib/debug-engine';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
    params: {
        sessionId: string;
    };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const debugEngine = getDebugEngine();
        const session = debugEngine.getSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({
            session: {
                id: session.id,
                connectionId: session.connectionId,
                createdAt: session.createdAt.toISOString(),
                config: session.config,
                state: session.state,
                metadata: session.metadata,
            },
        });
    } catch (error: any) {
        console.error('Error getting debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get session' },
            { status: 500 }
        );
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const debugEngine = getDebugEngine();
        const session = debugEngine.getSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        debugEngine.deleteSession(params.sessionId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete session' },
            { status: 500 }
        );
    }
}

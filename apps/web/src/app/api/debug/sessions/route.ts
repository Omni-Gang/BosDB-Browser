/**
 * Debug API - Create Session
 * POST /api/debug/sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugEngine } from '@/lib/debug-engine';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { connectionId, config } = body;

        if (!connectionId) {
            return NextResponse.json(
                { error: 'connectionId is required' },
                { status: 400 }
            );
        }

        const debugEngine = getDebugEngine();
        const session = debugEngine.createSession(user.id, connectionId, config);

        return NextResponse.json({
            sessionId: session.id,
            createdAt: session.createdAt.toISOString(),
            config: session.config,
        });
    } catch (error: any) {
        console.error('Error creating debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create session' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/debug/sessions
 * Get all sessions for current user
 */
export async function GET(_req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const debugEngine = getDebugEngine();
        const sessions = debugEngine.getUserSessions(user.id);

        return NextResponse.json({
            sessions: sessions.map((s) => ({
                id: s.id,
                connectionId: s.connectionId,
                createdAt: s.createdAt.toISOString(),
                status: s.state.status,
                config: s.config,
                metadata: s.metadata,
            })),
        });
    } catch (error: any) {
        console.error('Error getting debug sessions:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get sessions' },
            { status: 500 }
        );
    }
}

/**
 * Debug API - Session Operations
 * GET/DELETE /api/debug/sessions/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugSession, deleteSession } from '@/lib/debug-engine';

interface RouteParams {
    params: {
        sessionId: string;
    };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const session = getDebugSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // --- ENFORCE USER PERMISSIONS ---
        const userEmail = _req.headers.get('x-user-email');
        const userRole = _req.headers.get('x-user-role');

        if (userRole !== 'admin') {
            const { findUserByEmail } = await import('@/lib/users-store');
            if (userEmail) {
                const user = await findUserByEmail(userEmail);
                if (user) {
                    const permission = user.permissions?.find(p => p.connectionId === session.connectionId);
                    if (!permission || !permission.canDebug) {
                        return NextResponse.json({ error: 'Access denied: Debug permission required' }, { status: 403 });
                    }
                }
            }
        }
        // --- END ENFORCE USER PERMISSIONS ---

        return NextResponse.json({
            session: {
                id: session.id,
                connectionId: session.connectionId,
                status: session.state.status.toLowerCase(),
                state: {
                    ...session.state,
                    status: session.state.status.toLowerCase()
                },
                snapshots: session.snapshots,
                currentStatementIndex: session.currentStatementIndex,
                breakpoints: session.state.activeBreakpoints.map(b => (b as any).lineNumber),
                statements: session.statements.length
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
        const session = getDebugSession(params.sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // --- ENFORCE USER PERMISSIONS ---
        const userEmail = _req.headers.get('x-user-email');
        const userRole = _req.headers.get('x-user-role');

        if (userRole !== 'admin') {
            const { findUserByEmail } = await import('@/lib/users-store');
            if (userEmail) {
                const user = await findUserByEmail(userEmail);
                if (user) {
                    const permission = user.permissions?.find(p => p.connectionId === session.connectionId);
                    if (!permission || !permission.canDebug) {
                        return NextResponse.json({ error: 'Access denied: Debug permission required' }, { status: 403 });
                    }
                }
            }
        }
        // --- END ENFORCE USER PERMISSIONS ---

        deleteSession(params.sessionId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting debug session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete session' },
            { status: 500 }
        );
    }
}

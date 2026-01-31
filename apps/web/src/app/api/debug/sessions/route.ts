import { NextRequest, NextResponse } from 'next/server';
import { createDebugSession } from '@/lib/debug-engine';
import { log } from '@/lib/console-logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { connectionId, query, breakpoints, sandbox, commitOnFinish } = body;

        log.api('Creating debug session', { connectionId, queryLength: query?.length, breakpoints, sandbox, commitOnFinish });

        if (!connectionId || !query) {
            log.warn('Missing required fields for debug session');
            return NextResponse.json(
                { error: 'connectionId and query are required' },
                { status: 400 }
            );
        }

        // --- ENFORCE USER PERMISSIONS ---
        const userEmail = req.headers.get('x-user-email');
        const userRole = req.headers.get('x-user-role');

        if (userRole !== 'admin') {
            const { findUserByEmail } = await import('@/lib/users-store');
            if (userEmail) {
                const user = await findUserByEmail(userEmail);
                if (user) {
                    const permission = user.permissions?.find(p => p.connectionId === connectionId);
                    if (!permission || !permission.canDebug) {
                        return NextResponse.json({ error: 'Access denied: Debug permission required' }, { status: 403 });
                    }
                }
            }
        }
        // --- END ENFORCE USER PERMISSIONS ---

        const session = createDebugSession(connectionId, query, breakpoints || [], {
            sandbox,
            commitOnFinish,
            userId: userEmail
        });

        log.success(`Debug session created: ${session.id}`);

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                connectionId: session.connectionId,
                status: session.state.status.toLowerCase(),
                breakpoints: (session.state.activeBreakpoints || []).map(bp => (bp as any).lineNumber),
                statements: session.statements.length
            }
        });
    } catch (error: any) {
        log.error('Failed to create debug session', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create session' },
            { status: 500 }
        );
    }
}

export async function GET(_req: NextRequest) {
    return NextResponse.json({ sessions: [] });
}

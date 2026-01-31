/**
 * Debug API - Control Operations
 * POST /api/debug/sessions/[sessionId]/control/[action]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugEngine } from '@/lib/debug-engine';
import { getCurrentUser } from '@/lib/auth';
import { getConnectedAdapter } from '@/lib/db-utils';

interface RouteParams {
    params: {
        sessionId: string;
        action: string;
    };
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
    try {
        const { sessionId, action } = params;
        const debugEngine = getDebugEngine();
        const session = debugEngine.getSession(sessionId);

        if (!session) {
            console.log(`[API] Session ${sessionId} not found`);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        switch (action) {
            case 'resume':
                debugEngine.resume(sessionId);
                break;
            case 'pause':
                debugEngine.pause(sessionId);
                break;
            case 'step':
            case 'stepOver':
                await debugEngine.stepOver(sessionId);
                break;
            case 'rewind':
                await debugEngine.rewind(sessionId);
                break;
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, status: session.state.status.toLowerCase() });
    } catch (error: any) {
        console.error(`Error performing debug action ${params.action}:`, error);
        return NextResponse.json(
            { error: error.message || 'Action failed' },
            { status: 500 }
        );
    }
}

/**
 * Debug API - Breakpoints
 * POST/GET /api/debug/sessions/[sessionId]/breakpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDebugEngine } from '@/lib/debug-engine';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
    params: {
        sessionId: string;
    };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const debugEngine = getDebugEngine();
        const session = debugEngine.getSession(params.sessionId);

        if (!session || session.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { type, config } = body;

        if (!type) {
            return NextResponse.json(
                { error: 'Breakpoint type is required' },
                { status: 400 }
            );
        }

        const breakpoint = debugEngine.setBreakpoint(params.sessionId, type, config || {});

        return NextResponse.json({ breakpoint });
    } catch (error: any) {
        console.error('Error setting breakpoint:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to set breakpoint' },
            { status: 500 }
        );
    }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const debugEngine = getDebugEngine();
        const session = debugEngine.getSession(params.sessionId);

        if (!session || session.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const breakpoints = debugEngine.getBreakpoints(params.sessionId);

        return NextResponse.json({ breakpoints });
    } catch (error: any) {
        console.error('Error getting breakpoints:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get breakpoints' },
            { status: 500 }
        );
    }
}

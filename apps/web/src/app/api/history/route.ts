import { NextRequest, NextResponse } from 'next/server';
import { getQueryHistory, clearQueryHistory } from '@/lib/queryStore';
import { Logger } from '@bosdb/utils';

const logger = new Logger('QueryHistoryAPI');

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        let history;
        if (userEmail) {
            history = require('@/lib/queryStore').getUserQueryHistory(
                userEmail,
                orgId || undefined,
                connectionId || undefined,
                limit
            );
        } else {
            // Fallback for backward compatibility (or admin view)
            history = getQueryHistory(connectionId || undefined, limit);
        }

        return NextResponse.json({ history });
    } catch (error: any) {
        logger.error('Failed to get query history', error);
        return NextResponse.json(
            { error: 'Failed to get query history', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const userEmail = request.headers.get('x-user-email');

        clearQueryHistory(connectionId || undefined, userEmail || undefined);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to clear query history', error);
        return NextResponse.json(
            { error: 'Failed to clear query history', message: error.message },
            { status: 500 }
        );
    }
}

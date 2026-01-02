import { NextRequest, NextResponse } from 'next/server';
import {
    getSavedQueries,
    getUserSavedQueries,
    createSavedQuery,
    updateSavedQuery,
    deleteSavedQuery,
} from '@/lib/queryStore';
import { Logger } from '@bosdb/utils';

const logger = new Logger('SavedQueriesAPI');

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        let queries;
        if (userEmail) {
            queries = getUserSavedQueries(userEmail, orgId || undefined, connectionId || undefined);
        } else {
            queries = getSavedQueries(connectionId || undefined);
        }

        return NextResponse.json({ queries });
    } catch (error: any) {
        logger.error('Failed to get saved queries', error);
        return NextResponse.json(
            { error: 'Failed to get saved queries', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, query, connectionId } = body;
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        if (!name || !query) {
            return NextResponse.json(
                { error: 'Name and query are required' },
                { status: 400 }
            );
        }

        const savedQuery = createSavedQuery({
            name,
            description,
            query,
            connectionId,
            userEmail: userEmail || undefined,
            orgId: orgId || undefined,
        });

        return NextResponse.json({ query: savedQuery });
    } catch (error: any) {
        logger.error('Failed to create saved query', error);
        return NextResponse.json(
            { error: 'Failed to create saved query', message: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, description, query } = body;
        const userEmail = request.headers.get('x-user-email');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Verify ownership if userEmail is provided
        if (userEmail) {
            const queries = require('@/lib/queryStore').getSavedQueries();
            const existing = queries.find((q: any) => q.id === id);
            if (existing && existing.userEmail && existing.userEmail !== userEmail) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        }

        const updated = updateSavedQuery(id, { name, description, query });

        if (!updated) {
            return NextResponse.json({ error: 'Query not found' }, { status: 404 });
        }

        return NextResponse.json({ query: updated });
    } catch (error: any) {
        logger.error('Failed to update saved query', error);
        return NextResponse.json(
            { error: 'Failed to update saved query', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userEmail = request.headers.get('x-user-email');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Verify ownership
        if (userEmail) {
            const queries = require('@/lib/queryStore').getSavedQueries();
            const existing = queries.find((q: any) => q.id === id);
            if (existing && existing.userEmail && existing.userEmail !== userEmail) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        }

        const deleted = deleteSavedQuery(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Query not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error('Failed to delete saved query', error);
        return NextResponse.json(
            { error: 'Failed to delete saved query', message: error.message },
            { status: 500 }
        );
    }
}

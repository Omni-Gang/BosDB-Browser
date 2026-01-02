import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import { connections, adapterInstances, getConnection } from '@/lib/store';

const logger = new Logger('SchemaAPI');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');

        if (!connectionId) {
            return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
        }

        // Get connection info
        const connectionInfo = await getConnection(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: `Connection not found: ${connectionId}` }, { status: 404 });
        }

        // Get adapter instance using shared helper
        const { adapter, adapterConnectionId } = await import('@/lib/db-utils').then(m => m.getConnectedAdapter(connectionId));

        // List schemas
        const schemas = await adapter.listSchemas(adapterConnectionId);

        return NextResponse.json({ schemas });
    } catch (error: any) {
        logger.error('Failed to fetch schemas', error);
        return NextResponse.json({ error: 'Failed to fetch schemas' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import { connections, adapterInstances, getConnection } from '@/lib/store';

const logger = new Logger('TablesAPI');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const schemaName = searchParams.get('schema');

        if (!connectionId || !schemaName) {
            return NextResponse.json(
                { error: 'Missing connectionId or schema' },
                { status: 400 }
            );
        }

        // Get connection info
        const connectionInfo = await getConnection(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: `Connection not found: ${connectionId}` }, { status: 404 });
        }

        // Get adapter instance using shared helper
        const { adapter, adapterConnectionId } = await import('@/lib/db-utils').then(m => m.getConnectedAdapter(connectionId));

        // Get tables
        const tables = await adapter.listTables(adapterConnectionId, schemaName);

        return NextResponse.json({ tables });
    } catch (error: any) {
        logger.error('Failed to fetch tables', error);
        return NextResponse.json(
            { error: 'Failed to fetch tables', message: error.message },
            { status: 500 }
        );
    }
}

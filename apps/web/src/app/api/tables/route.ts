import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import { connections, adapterInstances } from '@/lib/store';

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
        const connectionInfo = connections.get(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Get or create adapter instance
        let adapter = adapterInstances.get(connectionId);
        let adapterConnectionId = connectionId;

        if (!adapter) {
            adapter = AdapterFactory.create(connectionInfo.type);

            // Decrypt credentials
            const credentials = decryptCredentials(connectionInfo.credentials);

            // Connect to database
            const connectResult = await adapter.connect({
                name: connectionInfo.name,
                host: connectionInfo.host,
                port: connectionInfo.port,
                database: connectionInfo.database,
                username: credentials.username,
                password: credentials.password,
                ssl: connectionInfo.ssl,
                readOnly: connectionInfo.readOnly,
            });

            if (!connectResult.success) {
                return NextResponse.json(
                    { error: 'Failed to connect to database' },
                    { status: 500 }
                );
            }

            adapterConnectionId = connectResult.connectionId;
            adapterInstances.set(connectionId, { adapter, adapterConnectionId });
        } else {
            adapterConnectionId = adapter.adapterConnectionId;
            adapter = adapter.adapter;
        }

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

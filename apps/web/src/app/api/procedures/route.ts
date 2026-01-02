import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import type { QueryRequest } from '@bosdb/core';

const logger = new Logger('ProceduresAPI');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const schema = searchParams.get('schema') || 'public';

        if (!connectionId) {
            return NextResponse.json(
                { error: 'Missing connectionId' },
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

        // define query based on DB type
        let query = '';
        const dbType = connectionInfo.type.toLowerCase();

        if (dbType === 'postgresql' || dbType === 'postgres') {
            query = `
                SELECT routine_name as name, routine_type as type 
                FROM information_schema.routines 
                WHERE routine_schema = '${schema}' 
                AND routine_type IN ('FUNCTION', 'PROCEDURE')
                ORDER BY routine_name ASC
            `;
        } else if (dbType === 'mysql' || dbType === 'mariadb') {
            // In MySQL, schema is the database name
            const dbName = schema === 'public' || !schema ? connectionInfo.database : schema;
            query = `
                SELECT ROUTINE_NAME as name, ROUTINE_TYPE as type 
                FROM information_schema.ROUTINES 
                WHERE ROUTINE_SCHEMA = '${dbName}' 
                AND ROUTINE_TYPE IN ('PROCEDURE', 'FUNCTION')
                ORDER BY ROUTINE_NAME ASC
            `;
        } else {
            logger.info(`Procedures not supported for DB type: ${connectionInfo.type}`);
            return NextResponse.json({ procedures: [] });
        }

        logger.info(`Fetching procedures for ${connectionInfo.type}, schema: ${schema}, query: ${query}`);

        const queryRequest: QueryRequest = {
            connectionId: adapterConnectionId,
            query,
            timeout: 10000,
            maxRows: 1000,
        };

        const result = await adapter.executeQuery(queryRequest);
        logger.info(`Found ${result.rows.length} procedures/functions`);
        if (result.rows.length > 0) {
            logger.debug('First procedure:', JSON.stringify(result.rows[0]));
        }

        const procedures = result.rows.map((row: any) => ({
            name: row.name || row.NAME || row.routine_name,
            type: row.type || row.TYPE || row.routine_type
        }));

        return NextResponse.json({ procedures });
    } catch (error: any) {
        logger.error('Failed to fetch procedures', error);
        return NextResponse.json(
            { error: 'Failed to fetch procedures', message: error.message },
            { status: 500 }
        );
    }
}

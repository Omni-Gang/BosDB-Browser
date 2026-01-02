import { NextRequest, NextResponse } from 'next/server';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import { getConnectedAdapter } from '@/lib/db-utils';
import { generateUpdateStatement } from '@/lib/sql-helper';
import { Logger } from '@bosdb/utils';

const logger = new Logger('DataUpdateAPI');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, schema, table, updates, filters } = body;

        // Basic validation
        if (!connectionId || !schema || !table || !updates) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get connection info
        const connectionInfo = await getConnection(connectionId);
        if (!connectionInfo) {
            return NextResponse.json({ error: `Connection not found: ${connectionId}` }, { status: 404 });
        }

        // Get adapter instance using shared helper
        const { adapter, adapterConnectionId } = await getConnectedAdapter(connectionId);

        const results = [];
        const errors = [];

        // For this MVP, we execute updates sequentially. 
        // In a real production app, we should use a transaction block (BEGIN...COMMIT).

        for (const update of updates) {
            try {
                const { primaryKey, changes } = update;

                // Generate SQL
                const sql = generateUpdateStatement(schema, table, primaryKey, changes, connectionInfo.type);

                // Execute with the correct adapter connection ID
                await adapter.executeQuery({
                    connectionId: adapterConnectionId,
                    query: sql
                });

                results.push({ success: true, primaryKey });
            } catch (err: any) {
                console.error('Update failed:', err);
                errors.push({
                    primaryKey: update.primaryKey,
                    error: err.message
                });
            }
        }

        if (errors.length > 0 && results.length === 0) {
            // All failed
            return NextResponse.json({
                success: false,
                error: 'All updates failed',
                details: errors
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            updatedCount: results.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Batch update error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

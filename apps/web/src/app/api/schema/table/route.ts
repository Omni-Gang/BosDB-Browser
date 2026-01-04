import { NextRequest, NextResponse } from 'next/server';
import { getConnectedAdapter } from '@/lib/db-utils';
import { trackSchemaChange } from '@/lib/vcs-helper';
import { generateCreateTableSQL } from '@/lib/sql-helper';
import { getCurrentUser } from '@/lib/auth';
import type { QueryRequest } from '@bosdb/core';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, action, tableDef, schema = 'public' } = body;

        // Get user for VCS tracking
        // In a real app we'd get this from the session/token properly
        const userId = request.headers.get('x-user-id') || 'system';
        const userName = request.headers.get('x-user-name') || 'System';

        if (!connectionId || !action || !tableDef) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { adapter, adapterConnectionId } = await getConnectedAdapter(connectionId);
        const { getConnection } = await import('@/lib/store');
        const connection = await getConnection(connectionId);

        let sql = '';

        if (action === 'create') {
            sql = generateCreateTableSQL(tableDef, schema, connection?.type || 'postgresql');
        } else {
            return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
        }

        // Execute SQL
        await adapter.executeQuery({
            connectionId: adapterConnectionId,
            query: sql,
            timeout: 30000
        });

        // Track in VCS
        try {
            await trackSchemaChange(
                connectionId,
                action,
                tableDef.name,
                sql,
                { id: userId, name: userName }
            );
        } catch (vcsError) {
            console.warn('Failed to track schema change in VCS:', vcsError);
            // Don't fail the request if VCS fails, but log it
        }

        return NextResponse.json({ success: true, sql });
    } catch (error: any) {
        console.error('Schema operation failed:', error);
        return NextResponse.json({ error: error.message || 'Schema operation failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const tableName = searchParams.get('table');
        const schema = searchParams.get('schema') || 'public';

        if (!connectionId || !tableName) {
            return NextResponse.json({ error: 'Missing connectionId or table name' }, { status: 400 });
        }

        const { adapter, adapterConnectionId } = await getConnectedAdapter(connectionId);
        const { getConnection } = await import('@/lib/store');
        const connection = await getConnection(connectionId);

        // Describe table
        const tableMetadata = await adapter.describeTable(adapterConnectionId, schema, tableName);

        // Generate CREATE TABLE SQL
        const sql = generateCreateTableSQL(tableMetadata, schema, connection?.type || 'postgresql');

        return NextResponse.json({ success: true, tableMetadata, sql });
    } catch (error: any) {
        console.error('Failed to fetch table definition:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch table definition' }, { status: 500 });
    }
}

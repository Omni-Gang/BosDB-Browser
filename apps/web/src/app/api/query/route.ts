import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { validateQuery, isReadOnlyQuery } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import type { QueryRequest } from '@bosdb/core';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import { addQueryToHistory } from '@/lib/queryStore';

const logger = new Logger('QueryAPI');

export async function POST(request: NextRequest) {
    let body: any;
    try {
        body = await request.json();
        const { connectionId, query, timeout, maxRows } = body;

        if (!connectionId || !query) {
            return NextResponse.json(
                { error: 'Missing connectionId or query' },
                { status: 400 }
            );
        }

        // Debug: Log connection ID and available connections
        logger.info(`Looking for connection: ${connectionId}`);
        logger.info(`Available connections: ${Array.from(connections.keys()).join(', ')}`);
        logger.info(`Total connections in store: ${connections.size}`);

        // Get connection info
        const connectionInfo = await getConnection(connectionId);
        if (!connectionInfo) {
            logger.error(`Connection ${connectionId} not found in store`);
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Validate query for SQL injection
        const validation = validateQuery(query);
        if (!validation.safe) {
            logger.warn(`Unsafe query blocked: ${validation.reason}`, validation.patterns);
            return NextResponse.json(
                {
                    error: 'Unsafe query detected',
                    reason: validation.reason,
                    patterns: validation.patterns,
                },
                { status: 400 }
            );
        }

        // Check if read-only connection allows this query
        if (connectionInfo.readOnly && !isReadOnlyQuery(query)) {
            return NextResponse.json(
                { error: 'Write operations not allowed on read-only connection' },
                { status: 403 }
            );
        }

        // Get adapter instance
        let adapter;
        let adapterConnectionId;

        try {
            // Use shared helper to get connected adapter
            // This ensures consistent connection state across all API routes
            const result = await import('@/lib/db-utils').then(m => m.getConnectedAdapter(connectionId));
            adapter = result.adapter;
            adapterConnectionId = result.adapterConnectionId;
        } catch (connError: any) {
            logger.error(`Failed to connect to database: ${connError.message}`);
            return NextResponse.json(
                { error: `Failed to connect to database: ${connError.message}` },
                { status: 500 }
            );
        }

        const userEmail = request.headers.get('x-user-email');


        // --- PRE-FETCH DATA FOR AUTOMATIC ROLLBACK ---
        let dmlMetadata: any = {};
        const upperQuery = query.trim().toUpperCase();
        
        // Only run for UPDATE/DELETE if not part of a transaction block
        // (Transaction support is future work, basic single-statement DML support now)
        if (upperQuery.startsWith('UPDATE') || upperQuery.startsWith('DELETE FROM')) {
            try {
                // Simple regex extraction - robust enough for basic single-table queries
                // UPDATE table SET ... WHERE condition
                // DELETE FROM table WHERE condition
                let tableName, whereClause;
                
                if (upperQuery.startsWith('UPDATE')) {
                    const match = query.match(/UPDATE\s+((?:"[^"]+"|[\w]+)(?:\.(?:"[^"]+"|[\w]+))*)\s+SET\s+[\s\S]+?\s+WHERE\s+([\s\S]+?)(?:;|$)/i);
                    if (match) {
                        tableName = match[1];
                        whereClause = match[2];
                    }
                } else if (upperQuery.startsWith('DELETE FROM')) {
                     const match = query.match(/DELETE\s+FROM\s+((?:"[^"]+"|[\w]+)(?:\.(?:"[^"]+"|[\w]+))*)\s+WHERE\s+([\s\S]+?)(?:;|$)/i);
                     if (match) {
                        tableName = match[1];
                        whereClause = match[2];
                     }
                }

                if (tableName && whereClause) {
                    // Fetch primary key info
                    const schemaParts = tableName.replace(/"/g, '').split('.');
                    const schema = schemaParts.length > 1 ? schemaParts[0] : 'public';
                    const table = schemaParts.length > 1 ? schemaParts[1] : schemaParts[0];
                    
                    const tableMeta = await adapter.describeTable(adapterConnectionId, schema, table);
                    const primaryKeyFields = tableMeta.primaryKeys;

                    // Fetch the data that is about to be changed
                    const selectQuery = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
                    const selectResult = await adapter.executeQuery({
                        connectionId: adapterConnectionId,
                        query: selectQuery,
                        timeout: 5000, // Short timeout for pre-fetch
                        maxRows: 1000 // Cap to prevent massive memory usage
                    });
                    
                    dmlMetadata = {
                        oldRows: selectResult.rows,
                        primaryKeyFields,
                        originalCreateSQL: null // Not needed for DML
                    };
                    
                    logger.info(`[AutoRollback] Pre-fetched ${selectResult.rows.length} rows for ${upperQuery.split(' ')[0]} on ${tableName}`);
                }
            } catch (preFetchError) {
                // Non-blocking: If pre-fetch fails, we proceed but rollback will be MANUAL
                logger.warn('Failed to pre-fetch data for automatic rollback. Rollback will be MANUAL.', preFetchError);
            }
        }

        // Execute query
        const queryRequest: QueryRequest = {
            connectionId: adapterConnectionId,
            query,
            timeout: timeout || 30000,
            maxRows: maxRows || 1000,
        };
        
        const result = await adapter.executeQuery(queryRequest);

        logger.info(
            `Query executed: ${query.substring(0, 50)}... (${result.executionTime}ms, ${result.rowCount} rows)`
        );

        // Add to query history
        try {
            addQueryToHistory({
                connectionId,
                connectionName: connectionInfo.name,
                query,
                executedAt: new Date().toISOString(),
                executionTime: result.executionTime,
                rowCount: result.rowCount,
                success: true,
                userEmail: userEmail || undefined,
                orgId: request.headers.get('x-org-id') || undefined,
            });

            // TRACKING VCS CHANGES
            // Parse query to see if it modifies the schema/data
            const { parseQueryForChanges } = await import('@/lib/vcs-helper');
            const { addPendingChange } = await import('@/lib/vcs-storage');
            
            const change = parseQueryForChanges(query, result.rowCount);
            if (change) {
                // Attach pre-fetched metadata for DML operations
                if (dmlMetadata.oldRows) {
                    change.metadata = { ...change.metadata, ...dmlMetadata };
                }

                await addPendingChange(connectionId, {
                    ...change,
                    timestamp: new Date().toISOString()
                });
                logger.info(`Tracked VCS change: ${change.type} - ${change.description}`);
            }

        } catch (historyError) {
            // Don't fail query if history/tracking fails
            logger.error('Failed to save query history or track changes', historyError);
        }

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error: any) {
        logger.error('Query execution failed', error);

        // Add failed query to history (with safe access)
        try {
            // body is already parsed at the top of POST
            const connInfo = await getConnection(body.connectionId);
            const userEmail = request.headers.get('x-user-email');
            const orgId = request.headers.get('x-org-id');

            if (connInfo) {
                addQueryToHistory({
                    connectionId: body.connectionId,
                    connectionName: connInfo.name,
                    query: body.query,
                    executedAt: new Date().toISOString(),
                    executionTime: 0,
                    rowCount: 0,
                    success: false,
                    error: error.message,
                    userEmail: userEmail || undefined,
                    orgId: orgId || undefined,
                });
            }
        } catch (historyError) {
            logger.error('Failed to save failed query to history', historyError);
        }

        // Extract the actual database error message
        let errorMessage = error.message;

        // If error message contains "Query execution failed: ", extract just the DB error
        if (errorMessage.includes('Query execution failed: ')) {
            errorMessage = errorMessage.replace('Query execution failed: ', '');
        }

        return NextResponse.json(
            {
                error: errorMessage, // Show actual database error
                success: false,
            },
            { status: 500 }
        );
    }
}

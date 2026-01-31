import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { validateQuery } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import type { QueryRequest } from '@bosdb/core';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import { addQueryToHistory } from '@/lib/queryStore';
import { findUserByEmail } from '@/lib/users-store';

const logger = new Logger('QueryAPI');

/**
 * Check if query is read-only (safe for read-only connections)
 */
function isReadOnlyQuery(query: string): boolean {
    const normalized = query.trim().toLowerCase();
    const readOnlyKeywords = ['select', 'explain', 'show', 'describe', 'with'];
    return readOnlyKeywords.some((keyword) => normalized.startsWith(keyword));
}

/**
 * Check if query is a DDL (Data Definition Language) query
 */
function isDDLQuery(query: string): boolean {
    const normalized = query.trim().toLowerCase();
    const ddlKeywords = ['create', 'alter', 'drop', 'truncate', 'rename', 'comment'];
    return ddlKeywords.some((keyword) => normalized.startsWith(keyword));
}

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

        // --- ENFORCE USER PERMISSIONS ---
        const userEmail = request.headers.get('x-user-email');
        const userRole = request.headers.get('x-user-role');

        // Admin role bypasses granular permission checks
        if (userRole !== 'admin') {
            if (userEmail) {
                const user = await findUserByEmail(userEmail);
                if (user) {
                    // Bypass for Admin/Super Admin resolved from DB
                    if (user.role === 'admin' || user.role === 'super-admin') {
                        // Allowed
                    } else {
                        let permission = user.permissions?.find(p => p.connectionId === connectionId);

                        if (!permission) {
                            // Fallback: If no granular permissions exist, grant full access by default.
                            // This ensures users can access connections they created or in single-user environments.
                            permission = {
                                connectionId,
                                canRead: true,
                                canEdit: true,
                                canManageSchema: true
                            };
                        }

                        const isRead = isReadOnlyQuery(query);
                        const isDDL = isDDLQuery(query);

                        // 1. Check Read Permission
                        if (!permission.canRead) {
                            return NextResponse.json({ error: 'Access denied: Read permission required' }, { status: 403 });
                        }

                        // 2. Check Edit/Write Permission (if not a pure select/read-only)
                        if (!isRead && !permission.canEdit) {
                            return NextResponse.json({ error: 'Access denied: Edit (Write) permission required' }, { status: 403 });
                        }

                        // 3. Check Schema Permission (if DDL)
                        if (isDDL && !permission.canManageSchema) {
                            return NextResponse.json({ error: 'Access denied: Manage Schema permission required' }, { status: 403 });
                        }
                    }
                }
            }
        }
        // --- END ENFORCE USER PERMISSIONS ---

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
            const { findUserByEmail } = await import('@/lib/users-store');
            const user = userEmail ? await findUserByEmail(userEmail) : null;
            const shouldSave = user?.settings?.autoSave !== false;

            if (shouldSave) {
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

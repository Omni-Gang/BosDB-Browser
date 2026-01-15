import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { encryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import type { ConnectionConfig } from '@bosdb/core';
import { connections, saveConnections, getConnection, deleteConnection } from '@/lib/store';

const logger = new Logger('ConnectionsAPI');

// Active connection tracking
const activeConnections = new Map<string, string>(); // connectionId -> adapterId

export async function GET(request: NextRequest) {
    try {
        // Get user email and org ID from headers
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        // ⚠️ SECURITY FIX: Require authentication
        if (!userEmail && !orgId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please login to view connections' },
                { status: 401 }
            );
        }

        // Filter connections by user or organization
        const visibleConnections = Array.from(connections.values()).filter(conn => {
            const isOwner = userEmail && conn.userEmail === userEmail;
            const isOrgShared = orgId && conn.organizationId === orgId;
            return isOwner || isOrgShared;
        });

        logger.info(`User ${userEmail || 'org:' + orgId} viewing ${visibleConnections.length} connections`);

        return NextResponse.json({
            connections: visibleConnections.map((conn) => ({
                id: conn.id,
                name: conn.name,
                type: conn.type,
                host: conn.host,
                port: conn.port,
                database: conn.database,
                readOnly: conn.readOnly,
                userEmail: conn.userEmail,
                organizationId: conn.organizationId,
                status: activeConnections.has(conn.id) ? 'connected' : 'disconnected',
            })),
        });
    } catch (error: any) {
        logger.error('Failed to fetch connections', error);
        return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userEmail = request.headers.get('x-user-email') || 'guest';
        const orgId = request.headers.get('x-org-id');

        const body = await request.json();
        const { name, type, host, port, database, username, password, ssl, readOnly, skipTest } = body;
        // Check if this is a request for Auto-Provisioning
        // We assume "New Connection" flow without explicit host/port means "Auto-Provision" 
        // OR if the client explicitly requests it.
        const shouldProvision = !host && !port && (type === 'postgres' || type === 'mysql' || type === 'postgresql');

        let finalConfig: ConnectionConfig;
        let provisionedUsername = username;

        if (shouldProvision) {
            // AUTO-PROVISIONING FLOW
            const { provisionCloudDatabase } = await import('@/lib/cloud-provisioner');
            const result = await provisionCloudDatabase(type, name, userEmail);

            if (!result.success || !result.database) {
                return NextResponse.json(
                    { error: 'Failed to provision database', details: result.error },
                    { status: 500 }
                );
            }

            const dbInfo = result.database;
            finalConfig = {
                name,
                host: dbInfo.host,
                port: dbInfo.port,
                database: dbInfo.database,
                username: dbInfo.username,
                password: dbInfo.password,
                ssl: dbInfo.ssl,
                readOnly: false
            };
            provisionedUsername = dbInfo.username;

            logger.info(`Auto-provisioned database for ${name}: ${dbInfo.database} on ${dbInfo.host}`);

        } else {
            // MANUAL CONNECTION FLOW
            // Validate required fields
            if (!name || !type || !host || !database || !username || !password) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // AUTO-CORRECT: Use sanitizeHost here too, in case user/UI sent localhost for a cloud port
            const { sanitizeHost } = await import('@/lib/cloud-provisioner');
            const effectiveHost = sanitizeHost(host, port || 5432);

            finalConfig = {
                name,
                host: effectiveHost,
                port: port || 5432,
                database,
                username,
                password,
                ssl: ssl || false,
                readOnly: readOnly || false,
            };

            // Skip connection test if requested
            if (!skipTest) {
                const adapter = AdapterFactory.create(type);
                const testResult = await adapter.testConnection(finalConfig);

                if (!testResult.success) {
                    return NextResponse.json(
                        { error: 'Connection test failed', details: testResult.error },
                        { status: 400 }
                    );
                }
            }
        }

        // Encrypt credentials
        const encryptedCredentials = encryptCredentials({
            username: finalConfig.username,
            password: finalConfig.password,
        });

        // Generate connection ID
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store connection info
        const connectionInfo = {
            id: connectionId,
            name: finalConfig.name,
            type,
            host: finalConfig.host,
            port: finalConfig.port,
            database: finalConfig.database,
            credentials: encryptedCredentials,
            readOnly: finalConfig.readOnly,
            userEmail: userEmail,
            organizationId: orgId,
            createdAt: new Date().toISOString(),
            isProvisioned: shouldProvision, // Mark as managed
            managedUsername: shouldProvision ? provisionedUsername : undefined
        };

        connections.set(connectionId, connectionInfo);

        // Persist to file
        saveConnections();

        logger.info(`Connection created: ${connectionId} (${type}://${finalConfig.host}:${finalConfig.port}/${finalConfig.database}) by ${userEmail} [Provisioned: ${shouldProvision}]`);

        // Return connection without credentials
        return NextResponse.json({
            id: connectionId,
            name: finalConfig.name,
            type,
            host: finalConfig.host,
            port: finalConfig.port,
            database: finalConfig.database,
            readOnly: finalConfig.readOnly,
            status: 'disconnected',
        });
    } catch (error: any) {
        logger.error('Failed to create connection', error);
        return NextResponse.json(
            { error: 'Failed to create connection', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userEmail = request.headers.get('x-user-email');

        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('id');

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        const connection = await getConnection(connectionId);

        if (!connection) {
            return NextResponse.json({ error: `Connection not found: ${connectionId}` }, { status: 404 });
        }

        // Verify user owns this connection
        if (connection.userEmail !== userEmail) {
            return NextResponse.json({ error: 'Not authorized to delete this connection' }, { status: 403 });
        }

        // Deprovision from cloud if this was a managed connection
        // We check 'isProvisioned' property or infer from database name convention if needed
        if (connection.isProvisioned || (connection.database && connection.database.startsWith('bosdb_'))) {
            try {
                const { destroyCloudDatabase } = await import('@/lib/cloud-provisioner');
                // Extract username if we stored it, otherwise might rely on cascade or admin force
                // We persisted 'managedUsername' in the new flow.
                await destroyCloudDatabase(connection.type, connection.database, connection.managedUsername);
            } catch (e) {
                logger.error('Failed to destroy cloud database', e);
                // Continue with deletion anyway
            }
        }

        // Delete the connection using shared helper
        deleteConnection(connectionId);

        // Close active connection if exists (local map)
        if (activeConnections.has(connectionId)) {
            activeConnections.delete(connectionId);
        }

        logger.info(`Connection deleted: ${connectionId} by ${userEmail}`);

        return NextResponse.json({ success: true, message: 'Connection deleted successfully' });
    } catch (error: any) {
        logger.error('Failed to delete connection', error);
        return NextResponse.json(
            { error: 'Failed to delete connection', message: error.message },
            { status: 500 }
        );
    }
}

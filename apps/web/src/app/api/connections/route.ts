import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { encryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import type { ConnectionConfig } from '@bosdb/core';
import { connections, saveConnections, getConnection } from '@/lib/store';

const logger = new Logger('ConnectionsAPI');

// Active connection tracking
const activeConnections = new Map<string, string>(); // connectionId -> adapterId

export async function GET(request: NextRequest) {
    try {
        // Get user email and org ID from headers (optional for backward compatibility)
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        let visibleConnections;

        if (userEmail || orgId) {
            // Filter connections: 
            // 1. Owned by user (userEmail matches)
            // 2. Shared with organization (organizationId matches)
            visibleConnections = Array.from(connections.values()).filter(conn => {
                const isOwner = userEmail && conn.userEmail === userEmail;
                const isOrgShared = orgId && conn.organizationId === orgId;
                return isOwner || isOrgShared;
            });
        } else {
            // Backward compatibility: show all connections if no context provided
            visibleConnections = Array.from(connections.values());
        }

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

        // Validate required fields
        if (!name || !type || !host || !database || !username || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const config: ConnectionConfig = {
            name,
            host,
            port: port || 5432,
            database,
            username,
            password,
            ssl: ssl || false,
            readOnly: readOnly || false,
        };

        // Skip connection test if requested (for auto-provisioned databases)
        if (!skipTest) {
            // Create adapter and test connection
            const adapter = AdapterFactory.create(type);
            const testResult = await adapter.testConnection(config);

            if (!testResult.success) {
                return NextResponse.json(
                    { error: 'Connection test failed', details: testResult.error },
                    { status: 400 }
                );
            }
        }

        // Encrypt credentials
        const encryptedCredentials = encryptCredentials({
            username,
            password,
        });

        // Generate connection ID
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store connection info (without plaintext password)
        const connectionInfo = {
            id: connectionId,
            name,
            type,
            host,
            port: config.port,
            database,
            credentials: encryptedCredentials,
            readOnly: config.readOnly,
            userEmail: userEmail, // Store user email as owner
            organizationId: orgId, // Store organization ID for sharing
            createdAt: new Date().toISOString(),
        };

        connections.set(connectionId, connectionInfo);

        // Persist to file
        saveConnections();

        logger.info(`Connection created: ${connectionId} (${type}://${host}:${port}/${database}) by ${userEmail}`);

        // Return connection without credentials
        return NextResponse.json({
            id: connectionId,
            name,
            type,
            host,
            port: config.port,
            database,
            readOnly: config.readOnly,
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

        // Delete the connection
        connections.delete(connectionId);

        // Close active connection if exists
        if (activeConnections.has(connectionId)) {
            activeConnections.delete(connectionId);
        }

        // Persist changes
        saveConnections();

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

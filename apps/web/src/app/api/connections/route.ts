import { NextRequest, NextResponse } from 'next/server';
import { AdapterFactory } from '@bosdb/db-adapters';
import { encryptCredentials } from '@bosdb/security';
import { Logger } from '@bosdb/utils';
import type { ConnectionConfig } from '@bosdb/core';
import { connections, saveConnections } from '@/lib/store';

const logger = new Logger('ConnectionsAPI');

// Active connection tracking
const activeConnections = new Map<string, string>(); // connectionId -> adapterId

export async function GET(request: NextRequest) {
    try {
        // Get user info from headers (simulating session for this simple implementation)
        const userId = request.headers.get('x-user-id');
        const userRole = request.headers.get('x-user-role');

        let visibleConnections;

        if (userRole === 'admin') {
            // Admin sees all connections
            visibleConnections = Array.from(connections.values());
        } else if (userId) {
            // Regular user sees owned + shared connections
            visibleConnections = Array.from(connections.values()).filter(conn =>
                conn.ownerId === userId ||
                (conn.sharedWith && conn.sharedWith.includes(userId)) ||
                // Fallback: If no owner/shared info (legacy), treat as public for now or hide?
                // For backward compatibility, showing untagged connections might be safer 
                // but strictly we should hide them. Let's show them for now to avoid breaking existing flow 
                // until everything is migrated.
                (!conn.ownerId && !conn.sharedWith?.length)
            );
        } else {
            // No user info? Fallback to all for backward compat or empty?
            // Let's fallback to all for now to not break existing "Guest" flow if any
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
                ownerId: conn.ownerId,
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
        const body = await request.json();
        const { name, type, host, port, database, username, password, ssl, readOnly } = body;

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

        // Create adapter and test connection
        const adapter = AdapterFactory.create(type);
        const testResult = await adapter.testConnection(config);

        if (!testResult.success) {
            return NextResponse.json(
                { error: 'Connection test failed', details: testResult.error },
                { status: 400 }
            );
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
            ownerId: body.userId || 'admin', // Default to admin if not provided
            sharedWith: [], // Initial shared users list
            createdAt: new Date().toISOString(),
        };

        connections.set(connectionId, connectionInfo);

        // Persist to file
        saveConnections();

        logger.info(`Connection created: ${connectionId} (${type}://${host}:${port}/${database})`);

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

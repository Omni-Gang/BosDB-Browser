import { NextRequest, NextResponse } from 'next/server';
import { getConnection, connections } from '@/lib/store';
import { decryptCredentials } from '@bosdb/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/sync
 * Returns full connection data including encrypted credentials
 * Used by desktop client to sync connections with passwords
 */
export async function GET(request: NextRequest) {
    try {
        const userEmail = request.headers.get('x-user-email');
        const orgId = request.headers.get('x-org-id');

        if (!userEmail || !orgId) {
            return NextResponse.json(
                { error: 'Missing authentication headers' },
                { status: 401 }
            );
        }

        // Get all connections for this user/org
        const userConnections = Array.from(connections.entries())
            .filter(([_, conn]) => {
                return conn.userEmail === userEmail || conn.organizationId === orgId;
            })
            .map(([id, conn]) => {
                let decrypted = {};
                if (conn.credentials) {
                    try {
                        decrypted = decryptCredentials(conn.credentials);
                    } catch (e) {
                        console.error(`Failed to decrypt credentials for ${id}`);
                    }
                }
                return {
                    id: conn.id,
                    name: conn.name,
                    type: conn.type,
                    host: conn.host,
                    port: conn.port,
                    database: conn.database,
                    ...decrypted, // Spread username/password
                    ssl: conn.ssl,
                    readOnly: conn.readOnly,
                    isCloud: true,
                    createdAt: conn.createdAt
                };
            });

        return NextResponse.json({
            success: true,
            connections: userConnections
        });
    } catch (error: any) {
        console.error('[ConnectionsSyncAPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to sync connections', message: error.message },
            { status: 500 }
        );
    }
}

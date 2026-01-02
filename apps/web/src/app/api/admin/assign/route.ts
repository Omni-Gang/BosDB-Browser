
import { NextRequest, NextResponse } from 'next/server';
import { connections, saveConnections } from '@/lib/store';
import { findUserById, updateUser, getUsers } from '@/lib/users-store';
import { ConnectionPermission } from '@/lib/auth';

// POST /api/admin/assign - Assign/revoke connection access with granular permissions
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, connectionId, action, permissions } = body;
        // action: 'assign' | 'unassign' | 'revoke' | 'update'
        // permissions: { canRead, canEdit, canCommit, canManageSchema }

        if (!userId || !connectionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get connection directly from map since we are on server (Legacy JSON store for connections)
        const connection = connections.get(connectionId);

        if (!connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Initialize sharedWith if missing
        if (!connection.sharedWith) {
            connection.sharedWith = [];
        }

        // Handle revoke/unassign actions
        if (action === 'unassign' || action === 'revoke') {
            // Remove from connection's sharedWith
            connection.sharedWith = connection.sharedWith.filter((id: string) => id !== userId);

            // Also remove permission from user's permissions array
            if (user.permissions) {
                const newPermissions = user.permissions.filter(p => p.connectionId !== connectionId);
                await updateUser(userId, { permissions: newPermissions });
            }
        } else if (action === 'update' && permissions) {
            // Update granular permissions
            let userPermissions = user.permissions || [];

            // Find or create permission for this connection
            const permIndex = userPermissions.findIndex(p => p.connectionId === connectionId);

            const newPerm: ConnectionPermission = {
                connectionId,
                canRead: permissions.canRead ?? true,
                canEdit: permissions.canEdit ?? false,
                canCommit: permissions.canCommit ?? false,
                canManageSchema: permissions.canManageSchema ?? false
            };

            if (permIndex !== -1) {
                userPermissions[permIndex] = newPerm;
            } else {
                userPermissions.push(newPerm);
            }

            // Update user
            await updateUser(userId, { permissions: userPermissions });

            // Also ensure user is in sharedWith
            if (!connection.sharedWith.includes(userId)) {
                connection.sharedWith.push(userId);
            }
        } else {
            // Simple assign - default permissions (read only)
            if (!connection.sharedWith.includes(userId)) {
                connection.sharedWith.push(userId);
            }

            // Add default read-only permission if not exists
            let userPermissions = user.permissions || [];
            const existingPerm = userPermissions.find(p => p.connectionId === connectionId);

            if (!existingPerm) {
                userPermissions.push({
                    connectionId,
                    canRead: true,
                    canEdit: false,
                    canCommit: false,
                    canManageSchema: false
                });
                await updateUser(userId, { permissions: userPermissions });
            }
        }

        // Save connection updates (Legacy store)
        connections.set(connectionId, connection);
        saveConnections();

        // Get updated user permissions
        const updatedUser = await findUserById(userId);

        return NextResponse.json({
            success: true,
            connectionId,
            userId,
            sharedWith: connection.sharedWith,
            userPermissions: updatedUser?.permissions?.find(p => p.connectionId === connectionId)
        });
    } catch (error: any) {
        console.error('Failed to assign connection:', error);
        return NextResponse.json({ error: 'Failed to assign connection' }, { status: 500 });
    }
}

// GET /api/admin/assign - Get user's permissions for a connection
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const connectionId = searchParams.get('connectionId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (connectionId) {
            // Return specific connection permission
            const perm = user.permissions?.find(p => p.connectionId === connectionId);
            return NextResponse.json({ permission: perm || null });
        } else {
            // Return all permissions
            return NextResponse.json({ permissions: user.permissions || [] });
        }
    } catch (error: any) {
        console.error('Failed to get permissions:', error);
        return NextResponse.json({ error: 'Failed to get permissions' }, { status: 500 });
    }
}

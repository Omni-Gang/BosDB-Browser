import { NextRequest, NextResponse } from 'next/server';
import { connections, saveConnections } from '@/lib/store';
import { findUserById } from '@/lib/users-store';

// POST /api/admin/assign - Assign connection to user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, connectionId, action } = body; // action: 'assign' | 'unassign'

        if (!userId || !connectionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const user = findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get connection directly from map since we are on server
        const connection = connections.get(connectionId);

        if (!connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        // Initialize sharedWith if missing
        if (!connection.sharedWith) {
            connection.sharedWith = [];
        }

        if (action === 'unassign') {
            connection.sharedWith = connection.sharedWith.filter((id: string) => id !== userId);
        } else {
            // Assign - avoid duplicates
            if (!connection.sharedWith.includes(userId)) {
                connection.sharedWith.push(userId);
            }
        }

        // Save updates
        connections.set(connectionId, connection);
        saveConnections();

        return NextResponse.json({
            success: true,
            connectionId,
            userId,
            sharedWith: connection.sharedWith
        });
    } catch (error: any) {
        console.error('Failed to assign connection:', error);
        return NextResponse.json({ error: 'Failed to assign connection' }, { status: 500 });
    }
}

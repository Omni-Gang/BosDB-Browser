import { NextRequest, NextResponse } from 'next/server';
import { loadDockerDatabases } from '@/lib/docker-manager';

// GET /api/docker/containers - List Docker databases for user's organization
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Get current user from headers
        const userEmail = request.headers.get('x-user-email');
        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        // Find user to get organization ID
        const { findUserByEmail } = await import('@/lib/users-store');
        const user = await findUserByEmail(userEmail);
        if (!user || !user.organizationId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Load databases for this organization
        const databases = loadDockerDatabases(user.organizationId);

        return NextResponse.json({
            success: true,
            databases: databases.map(db => ({
                id: db.id,
                type: db.type,
                name: db.name,
                port: db.port,
                status: db.status,
                autoStart: db.autoStart,
                createdAt: db.createdAt
            }))
        });

    } catch (error: any) {
        console.error('[Docker API] Failed to list containers:', error);
        return NextResponse.json({
            error: 'Failed to list containers'
        }, { status: 500 });
    }
}

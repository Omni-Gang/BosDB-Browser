import { NextRequest, NextResponse } from 'next/server';
import { VALID_DATABASE_TYPES, DatabaseType } from '@/constants/database-types';
import {
    provisionCloudDatabase,
    isCloudProvisioningSupported,
    getCloudSupportedTypes
} from '@/lib/cloud-provisioner';

// POST /api/docker/provision - Provision a new cloud database (no Docker required!)
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { type, name } = body;

        // Validate inputs
        if (!type || !name) {
            return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
        }

        if (!VALID_DATABASE_TYPES.includes(type)) {
            return NextResponse.json({
                error: `Invalid database type: ${type}. Supported types: ${VALID_DATABASE_TYPES.join(', ')}`
            }, { status: 400 });
        }

        console.log(`[Provision API] Provisioning ${type} database "${name}" for ${userEmail}`);

        // Use cloud provisioning (no Docker required!)
        const result = await provisionCloudDatabase(
            type as DatabaseType,
            name,
            user.organizationId
        );

        if (!result.success) {
            return NextResponse.json({
                error: result.error,
                cloudProvisioningSupported: isCloudProvisioningSupported(type),
                suggestion: 'Use "External Connection" to connect to an existing database instance.'
            }, { status: 400 });
        }

        console.log(`[Provision API] Successfully provisioned ${type} database "${name}"`);

        return NextResponse.json({
            success: true,
            database: result.database,
            mode: 'cloud', // Indicates this is a cloud-provisioned database
        });

    } catch (error: any) {
        console.error('[Provision API] Failed to provision database:', error);
        return NextResponse.json({
            error: error.message || 'Failed to provision database'
        }, { status: 500 });
    }
}

// GET /api/docker/provision - Get provisioning capabilities
export async function GET() {
    return NextResponse.json({
        mode: 'cloud',
        dockerRequired: false,
        message: 'Cloud database provisioning is available. No Docker required!',
        cloudSupportedTypes: getCloudSupportedTypes(),
        allSupportedTypes: VALID_DATABASE_TYPES,
        notes: {
            cloudProvisioned: 'PostgreSQL, MySQL, MariaDB, MongoDB, Redis, and compatible databases are provisioned on shared cloud instances.',
            externalConnection: 'For other databases (SQL Server, Oracle, Cassandra, etc.), use "External Connection" to connect to your own instance.',
        }
    });
}

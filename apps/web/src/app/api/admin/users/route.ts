
import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, findUserByEmail, getUsersByOrg, updateUser, findUserById } from '@/lib/users-store';
import { hashPassword } from '@/lib/auth';

// GET /api/admin/users - List users from admin's organization only
export async function GET(request: NextRequest) {
    try {
        // Get current user's email from header (passed by frontend)
        const userEmail = request.headers.get('x-user-email');
        const role = request.headers.get('x-user-role');

        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        if (role && role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Find the admin user to get their organization
        const adminUser = await findUserByEmail(userEmail);
        if (!adminUser || !adminUser.organizationId) {
            return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
        }

        // Get users from the same organization only
        const orgUsers = await getUsersByOrg(adminUser.organizationId);

        // Return users without sensitive data
        const sanitizedUsers = orgUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            accountType: u.accountType,
            createdAt: u.createdAt
        }));

        return NextResponse.json({ users: sanitizedUsers });
    } catch (error: any) {
        console.error('Failed to list users:', error);
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
}

// POST /api/admin/users - Create a new user in admin's organization
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, role } = body;

        // Get admin's email to determine organization
        const adminEmail = request.headers.get('x-user-email');
        if (!adminEmail) {
            return NextResponse.json({ error: 'Admin email required' }, { status: 401 });
        }

        const adminUser = await findUserByEmail(adminEmail);
        if (!adminUser || !adminUser.organizationId) {
            return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
        }

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user exists
        if (await findUserByEmail(email)) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = {
            id: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''), // Generate ID from email
            name,
            email,
            password: hashedPassword,
            role: role as 'admin' | 'user',
            status: 'approved' as const, // Admin-created users are auto-approved
            accountType: adminUser.accountType, // Same as admin
            organizationId: adminUser.organizationId, // Same organization as admin
            createdAt: new Date()
        };

        await createUser(newUser);

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status
            }
        });
    } catch (error: any) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}

// PATCH /api/admin/users - Update user status
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, status } = body;

        if (!userId || !['approved', 'rejected', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await updateUser(userId, { status });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to update user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, findUserByEmail } from '@/lib/users-store';
import { requireAdmin, verifyAdminRole } from '@/middleware/requireAdmin';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
    try {
        // In a real app, verify admin session here
        // requireAdmin(request);

        // For now, client sends x-user-role header or we assume it's protected by frontend
        // But let's check header for safety if implementing properly
        const role = request.headers.get('x-user-role');
        if (role && role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = getUsers();

        // Return users without sensitive data (like passwords if we add them)
        const sanitizedUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt
        }));

        return NextResponse.json({ users: sanitizedUsers });
    } catch (error: any) {
        console.error('Failed to list users:', error);
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
    try {
        // requireAdmin(request);

        const body = await request.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user exists
        if (findUserByEmail(email)) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const newUser = {
            id: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''), // Generate ID from email
            name,
            email,
            password, // In real app, hash this!
            role: role as 'admin' | 'user',
            createdAt: new Date()
        };

        createUser(newUser);

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error: any) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}

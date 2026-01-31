
import { NextRequest, NextResponse } from 'next/server';
import { updateOrganization } from '@/lib/organization';
import { updateUser } from '@/lib/users-store';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // 1. Auth Check - STRICT SUPER ADMIN ONLY
        // 1. Auth Check - STRICT SUPER ADMIN ONLY
        const userEmail = request.headers.get('x-user-email');
        if (!userEmail) {
            return NextResponse.json({ error: 'Unauthorized: Missing email' }, { status: 403 });
        }

        // Allow original super admin or any user with 'super-admin' role
        const User = (await import('@/models/User')).default;
        const requestingUser = await User.findOne({ email: userEmail }).lean();
        const isSuperAdmin = userEmail === 'ayush@bosdb.com' || (requestingUser && requestingUser.role === 'super-admin');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Unauthorized: Access restricted to Super Admin' }, { status: 403 });
        }

        const body = await request.json();
        const { action, id, data } = body;

        console.log('[SuperAdmin Mutate] Action:', action, 'ID:', id, 'Data:', data);

        if (!action || !id || !data) {
            return NextResponse.json({ error: 'Missing required fields: action, id, data' }, { status: 400 });
        }

        if (action === 'update_org') {
            // Validate allowed updates for Org
            // e.g. name, plan, type, domain, STATUS
            await updateOrganization(id, data);
            return NextResponse.json({ success: true, message: 'Organization updated successfully' });
        }

        if (action === 'block_org') {
            await updateOrganization(id, { status: data.status });
            return NextResponse.json({ success: true, message: `Organization ${data.status === 'suspended' ? 'blocked' : 'unblocked'} successfully` });
        }

        if (action === 'delete_org') {
            // Permanent Delete using mongoose directly for now, or add delete method in lib
            const Organization = (await import('@/models/Organization')).default;
            await Organization.deleteOne({ id: id });
            return NextResponse.json({ success: true, message: 'Organization deleted successfully' });
        }

        if (action === 'create_user') {
            const { name, email, password, role, organizationId } = data;
            if (!name || !email || !password || !role) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            // Security: Enforce Domain for Super Admins
            if (role === 'super-admin' && !email.endsWith('@bosdb.com')) {
                return NextResponse.json({ error: 'Security Violation: Super Admins must have a @bosdb.com email address.' }, { status: 403 });
            }

            // Hash password
            const bcrypt = (await import('bcryptjs')).default;
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create User
            // Ensure IDs are unique. In a real app we'd use cuid or similar.
            // For simplicity, we assume ID is email-based or provided. 
            // Logic in createUser handles some validation but we need to pass a unique ID if schema requires string.
            const userId = email.split('@')[0] + '_' + Date.now().toString(36).slice(-4);

            // If no org ID provided, create a personal one or use existing logic?
            // The prompt implies "creating super admin" or "user".
            // If role is super-admin, maybe add to a specific org?
            // We will require an organizationId or auto-create one. 
            // Let's assume we pass a valid org ID or create a "ind-[userId]" one if missing.

            const { getOrCreateOrgForUser } = await import('@/lib/organization');
            let targetOrgId = organizationId;

            if (!targetOrgId) {
                const { org } = await getOrCreateOrgForUser(email, 'individual');
                targetOrgId = org.id;
            }

            const { createUser } = await import('@/lib/users-store');
            await createUser({
                id: userId,
                name,
                email,
                password: hashedPassword,
                role,
                status: 'approved',
                organizationId: targetOrgId,
                // avatar: '', // Removed due to type mismatch
                createdAt: new Date(),
                // lastLogin: new Date() // Removed due to type
            });

            return NextResponse.json({ success: true, message: 'User created successfully' });
        }

        if (action === 'update_user') {
            // Validate allowed updates for User
            const updateData: any = {};

            // Password handling - hash if provided
            if (data.password) {
                // SECURITY: Restrict password changes to account owner only
                // id is the target user id, requestingUser.id is the current admin's id
                if (!requestingUser || id !== requestingUser.id) {
                    return NextResponse.json({
                        error: 'Unauthorized: You can only change your own password.'
                    }, { status: 403 });
                }

                const bcrypt = (await import('bcryptjs')).default;
                updateData.password = await bcrypt.hash(data.password, 10);
            }

            // Safe fields to update
            if (data.name) updateData.name = data.name;
            if (data.email) updateData.email = data.email;
            if (data.role) updateData.role = data.role;
            if (data.status) updateData.status = data.status;

            await updateUser(id, updateData);
            return NextResponse.json({ success: true, message: 'User updated successfully' });
        }

        if (action === 'update_system_settings') {
            const SystemSettings = (await import('@/models/SystemSettings')).default;

            await SystemSettings.updateOne(
                { id: 'global_settings' },
                { $set: { ...data, updatedAt: new Date() } },
                { upsert: true }
            );

            return NextResponse.json({ success: true, message: 'Settings updated successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[SuperAdmin Mutate] Error:', error);
        return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
    }
}

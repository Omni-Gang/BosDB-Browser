import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser } from '@/lib/users-store';
import { verifyPassword, hashPassword, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password
        if (user.password) {
            const isValid = await verifyPassword(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
            }
        } else {
            // Legacy user - check default password
            if (currentPassword !== 'admin') {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
            }
        }

        // Validate new password
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Check if new password is same as current
        if (currentPassword === newPassword) {
            return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
        }

        // Hash and update
        const hashedPassword = await hashPassword(newPassword);
        await updateUser(userId, { password: hashedPassword });

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}

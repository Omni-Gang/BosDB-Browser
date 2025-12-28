import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, findUserById, findUserByEmail, getUsersByOrg } from '@/lib/users-store';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth';
import { getOrCreateOrgForUser, findOrganizationById, findOrganizationByDomain, extractDomain } from '@/lib/organization';

export async function GET() {
    // Public endpoint to list simple user info (for login page dropdown)
    const users = getUsers();
    const publicUsers = users.map(u => ({ id: u.id, name: u.name, role: u.role }));
    return NextResponse.json({ users: publicUsers });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, password, ...userData } = body;
        // For login, use email field if provided (new way) or userId (backward compat)
        const loginEmail = body.email || userId;

        if (action === 'login') {
            // Use email for login
            const user = findUserByEmail(loginEmail);
            console.log('[Auth API] Login attempt for email:', loginEmail);
            console.log('[Auth API] User found:', user ? 'YES' : 'NO');

            if (!user) {
                console.log('[Auth API] User not found, returning 401');
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            console.log('[Auth API] User has password field:', !!user.password);
            console.log('[Auth API] Password provided:', !!password);

            // Verify password
            if (user.password) {
                // Try bcrypt verification
                try {
                    const isValid = await verifyPassword(password || '', user.password);
                    console.log('[Auth API] Password verification result:', isValid);
                    if (!isValid) {
                        // Also check plain text match for legacy
                        if (user.password !== password) {
                            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                        }
                    }
                } catch (err) {
                    console.error('[Auth API] bcrypt error:', err);
                    // Fallback to plain text check
                    if (user.password !== password) {
                        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                    }
                }
            } else {
                // Legacy users without password
                return NextResponse.json({ error: 'Please set a password for your account' }, { status: 401 });
            }

            if (user.status === 'pending') {
                return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
            }

            if (user.status === 'rejected') {
                return NextResponse.json({ error: 'Your account has been rejected.' }, { status: 403 });
            }

            console.log('[Auth API] Login successful for:', user.email);
            return NextResponse.json({ success: true, user });
        }

        if (action === 'register') {
            const users = getUsers();

            // Validate required fields
            if (!userData.email) {
                return NextResponse.json({ error: 'Email is required' }, { status: 400 });
            }

            // Check email uniqueness (must be globally unique)
            if (users.some(u => u.email === userData.email)) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
            }

            // Validate password
            if (!password) {
                return NextResponse.json({ error: 'Password is required' }, { status: 400 });
            }

            const validation = validatePassword(password);
            if (!validation.valid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Account type (default to enterprise for backward compatibility)
            const accountType = userData.accountType || 'enterprise';

            // Get or create organization based on account type
            // For common domains like gmail.com, force individual accounts to prevent collisions
            const domain = extractDomain(userData.email);
            const isCommonDomain = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain);

            let finalAccountType = accountType;
            if (isCommonDomain && accountType === 'enterprise') {
                console.log(`[Auth API] Forcing individual account for common domain: ${domain}`);
                finalAccountType = 'individual';
            }

            const org = getOrCreateOrgForUser(
                userData.email,
                userData.name,
                finalAccountType,
                userData.id
            );

            console.log(`[Auth API] User ${userData.id} joining org: ${org.id} (${org.type})`);

            // Check User ID uniqueness WITHIN the organization only
            // Different organizations can have the same User ID
            const orgUsers = getUsersByOrg(org.id);
            if (orgUsers.some(u => u.id === userData.id)) {
                return NextResponse.json({ error: 'User ID already exists in your organization. Please choose a different one.' }, { status: 409 });
            }

            // Determine user role - check organization-specific users (already have orgUsers)
            const isFirstOrgUser = orgUsers.length === 0;

            console.log(`[Auth API] Organization ${org.id} has ${orgUsers.length} existing users`);
            console.log(`[Auth API] Is first user? ${isFirstOrgUser}`);

            // Individual users are just regular users (no admin needed for solo work)
            // Enterprise users: first user becomes admin, others are regular users
            // Individual users are always admins of their own workspace
            let role: 'admin' | 'user' = 'user';
            if (accountType === 'individual' || (accountType === 'enterprise' && isFirstOrgUser)) {
                role = 'admin';
            }

            // If it's an individual account or the first user of the org, auto-approve
            const status = (accountType === 'individual' || isFirstOrgUser) ? 'approved' : 'pending';

            const newUser = {
                ...userData,
                password: hashedPassword,
                accountType: accountType,
                organizationId: org.id,
                role: role,
                status: status,
                createdAt: new Date()
            };

            createUser(newUser);

            let message: string;
            if (accountType === 'individual') {
                message = `Personal workspace "${org.name}" created.`;
            } else {
                message = isFirstOrgUser
                    ? `Organization "${org.name}" created. You are the admin.`
                    : `Registration submitted. Pending admin approval for "${org.name}".`;
            }

            return NextResponse.json({
                success: true,
                user: newUser,
                organization: org,
                message
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Auth API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

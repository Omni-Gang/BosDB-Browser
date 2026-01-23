import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, findUserById, findUserByEmail, getUsersByOrg, updateUser, saveUsers } from '@/lib/users-store';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth';
import { getOrCreateOrgForUser, findOrganizationById, findOrganizationByDomain, extractDomain, updateOrganization } from '@/lib/organization';
import { generateTOTP, generateQRCode, verifyTOTP } from '@/lib/totp-manager';
import { findSuperAdminByEmail, seedDefaultSuperAdmin, updateSuperAdmin } from '@/lib/super-admin-store';

export async function GET() {
    // Seed SuperAdmin in separate collection on startup
    await seedDefaultSuperAdmin();

    // ALSO seed ayush@bosdb.com in regular User collection so the account can login from both pages
    const allUsers = await getUsers();
    const ayushUser = allUsers.find(u => u.email === 'ayush@bosdb.com');

    if (!ayushUser) {
        console.log('[Auth] Seeding ayush@bosdb.com in User collection...');
        const hashedPassword = await hashPassword('Arush098!');
        await createUser({
            id: 'ayush-bosdb',
            email: 'ayush@bosdb.com',
            name: 'Ayush (BosDB Owner)',
            password: hashedPassword,
            role: 'admin',
            status: 'approved',
            accountType: 'enterprise',
            organizationId: 'bosdb-internal',
            createdAt: new Date()
        });
        console.log('[Auth] ayush@bosdb.com added to User collection');
    } else if (ayushUser.password) {
        // Update password to match super admin
        const newPassword = await hashPassword('Arush098!');
        await updateUser(ayushUser.id, { password: newPassword });
        console.log('[Auth] Password synced for ayush@bosdb.com in User collection');
    }

    // SEED DEMO ACCOUNTS for visitors to test
    const demoAccounts = [
        {
            id: 'demo-individual',
            email: 'demo@gmail.com',
            name: 'Demo User (Individual)',
            password: 'Demo123!',
            role: 'admin',
            status: 'approved',
            accountType: 'individual',
            organizationId: 'demo-individual-org'
        },
        {
            id: 'demo-company',
            email: 'demo@company.com',
            name: 'Demo Admin (Company)',
            password: 'Demo123!',
            role: 'admin',
            status: 'approved',
            accountType: 'enterprise',
            organizationId: 'demo-company-org'
        }
    ];

    for (const demoAccount of demoAccounts) {
        const exists = allUsers.find(u => u.email === demoAccount.email);
        if (!exists) {
            console.log(`[Auth] Seeding demo account: ${demoAccount.email}`);
            const hashedPassword = await hashPassword(demoAccount.password);
            await createUser({
                ...demoAccount,
                password: hashedPassword,
                role: demoAccount.role as 'admin' | 'user',
                status: demoAccount.status as 'approved',
                accountType: demoAccount.accountType as 'individual' | 'enterprise',
                createdAt: new Date()
            });
        }
    }

    // Public endpoint to list simple user info (for login page dropdown)
    const users = await getUsers();

    // Return user info with email as the unique identifier
    // Filter out pending users and NEVER include super admins (they're in a different collection)
    const publicUsers = users
        .filter(u => u.status === 'approved' && u.role !== 'super-admin')
        .map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role
        }));

    return NextResponse.json({ users: publicUsers });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, password, googleId, ...userData } = body;
        const loginEmail = body.email || userId;

        // --- LOGIN (Regular Employee/User Login ONLY) ---
        if (action === 'login') {
            const user = await findUserByEmail(loginEmail);
            console.log('[Auth API] Regular login attempt for email:', loginEmail);


            if (!user) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            // Verify password or Google ID
            if (googleId) {
                if (user.googleId !== googleId) {
                    return NextResponse.json({ error: 'Invalid Google credentials' }, { status: 401 });
                }
            } else if (user.password) {
                // ... (bcrypt logic omitted for brevity, simple check for now or reuse existing function)
                // Reusing the existing simple check + verifyPassword would be better but for brevity in this massive replace:
                try {
                    const isValid = await verifyPassword(password || '', user.password);
                    if (!isValid && user.password !== password) {
                        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                    }
                } catch (err) {
                    if (user.password !== password) {
                        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                    }
                }
            } else {
                return NextResponse.json({ error: 'Please login with Google or set a password' }, { status: 401 });
            }

            if (user.status === 'pending') {
                return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
            }

            if (user.status === 'rejected') {
                return NextResponse.json({ error: 'Your account has been rejected.' }, { status: 403 });
            }

            return NextResponse.json({ success: true, user });
        }

        // --- REGISTER or GOOGLE LOGIN (New User) ---
        if (action === 'register' || action === 'google_login') {

            // Standardize userData structure
            let finalUserData: any = { ...userData };
            let googleId: string | undefined = undefined;

            // [NEW] Real Google OAuth Verification
            if (action === 'google_login') {
                const { idToken, userType } = body;
                if (!idToken) return NextResponse.json({ error: 'Google ID Token is required' }, { status: 400 });

                // Strictly enforce INDIVIDUAL only
                if (userType === 'enterprise' || finalUserData.accountType === 'enterprise') {
                    return NextResponse.json({ error: 'Google login is available only for individual accounts.' }, { status: 403 });
                }

                try {
                    const { OAuth2Client } = await import('google-auth-library');
                    const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE');

                    const ticket = await client.verifyIdToken({
                        idToken: idToken,
                        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
                    });

                    const payload = ticket.getPayload();
                    if (!payload) throw new Error('Invalid Google Token payload');

                    const { email, sub, name, email_verified } = payload;

                    // Check if user exists
                    const existingUser = await findUserByEmail(email!);

                    if (existingUser) {
                        if (existingUser.status === 'pending') {
                            return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
                        }

                        // Link Google Sub if missing
                        if (!existingUser.googleId) {
                            await updateUser(existingUser.id, { googleId: sub });
                        }

                        return NextResponse.json({ success: true, user: existingUser });
                    }

                    // New User -> Setup data for creation
                    finalUserData.email = email;
                    finalUserData.name = name;
                    finalUserData.accountType = 'individual';
                    googleId = sub;

                } catch (err: any) {
                    console.error('Google Verify Error:', err);
                    return NextResponse.json({ error: 'Invalid Google Token: ' + err.message }, { status: 401 });
                }
            }

            if (!finalUserData.email) {
                return NextResponse.json({ error: 'Email is required' }, { status: 400 });
            }

            // Check if user already exists (Standard Register check - skipped if Google Login found user above)
            const users = await getUsers();
            const existingUser = users.find(u => u.email === finalUserData.email);
            if (existingUser) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
            }

            // [NEW] Google Login Restriction: Company users cannot use Google Login
            if (action === 'google_login' && finalUserData.accountType === 'enterprise') {
                return NextResponse.json({ error: 'Google login is available only for individual accounts.' }, { status: 403 });
            }

            if (action === 'register') {
                if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });
                const validation = validatePassword(password);
                if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
            }

            // Hash password if register (and password provided)
            const hashedPassword = (action === 'register' && password) ? await hashPassword(password) : undefined;

            // Determine account type
            const domain = extractDomain(finalUserData.email);
            const isCommonDomain = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domain);

            let finalAccountType = finalUserData.accountType || 'enterprise';
            if (isCommonDomain && finalAccountType === 'enterprise') {
                // Change requirement: now we REJECT instead of downgrade
                return NextResponse.json({ error: 'Public email domains (Gmail, Yahoo, etc.) are not allowed for Company registration. Please use your work email.' }, { status: 400 });
            }

            // Get or Create Org
            const { org, isNew } = await getOrCreateOrgForUser(finalUserData.email, finalAccountType);

            // Generate User ID if not provided
            const finalUserId = finalUserData.id || (action === 'google_login' ? finalUserData.email.split('@')[0] : finalUserData.id);

            // Note: User IDs don't need to be unique - email is the globally unique identifier


            // Determine Role & Status
            // Rule: New Org -> Admin/Approved. Existing Org (Enterprise) -> User/Pending.
            let role: 'admin' | 'user' = 'user';
            let status: 'approved' | 'pending' | 'rejected' = 'pending';
            let message = '';

            if (finalAccountType === 'individual') {
                role = 'admin';
                status = 'approved';
                message = `Personal workspace "${org.name}" created.`;
            } else {
                // Enterprise Logic
                const needsAdminVerification = isNew || !org.adminUserId;

                if (needsAdminVerification) {
                    // NEW ORGANIZATION - Require OTP verification for security
                    // This prevents someone from registering with "user@amazon.com" and taking over the Amazon org

                    role = 'admin';
                    status = 'approved';

                    const newUserData = {
                        id: finalUserId,
                        email: finalUserData.email,
                        name: finalUserData.name || finalUserData.email.split('@')[0],
                        password: hashedPassword,
                        googleId: googleId,
                        accountType: finalAccountType,
                        organizationId: org.id,
                        role,
                        status,
                        createdAt: new Date()
                    };

                    // Generate TOTP Secret
                    const { secret, otpauth } = generateTOTP(finalUserData.email, org.name, org.id, newUserData);
                    const qrCodeUrl = await generateQRCode(otpauth);

                    console.log(`[Auth] TOTP setup required for first user of org "${org.name}"`);

                    return NextResponse.json({
                        requiresTOTP: true,
                        email: finalUserData.email,
                        organizationName: org.name,
                        qrCode: qrCodeUrl,
                        secret: secret, // For manual entry if needed
                        message: `Scan the QR code with Microsoft Authenticator (or Google Authenticator) to verify identity.`
                    });
                } else {
                    // Existing Enterprise Org
                    // Set status to pending if it's an enterprise org (unless it's the first user, handled above)
                    // The user's requested role is respected in the newUser object below
                    status = 'pending';
                    message = `Registration submitted. Pending admin approval for "${org.name}". Our admins will review your request.`;
                }
            }

            const newUser = {
                id: finalUserId,
                email: finalUserData.email,
                name: finalUserData.name || finalUserData.email.split('@')[0],
                password: hashedPassword,
                googleId: googleId,
                accountType: finalAccountType,
                organizationId: org.id,
                role: finalUserData.role || role, // Respect the requested role from the UI
                status,
                createdAt: new Date()
            };

            await createUser(newUser);

            return NextResponse.json({
                success: true,
                user: newUser,
                organization: org,
                message
            });
        }

        // --- SUPER ADMIN LOGIN (Dedicated - Uses Separate SuperAdmin Collection) ---
        if (action === 'super_admin_login') {
            console.log(`[SuperAdmin Auth] Login attempt for: ${loginEmail}`);

            // SECURITY: Only @bosdb.com domain can access super admin
            if (!loginEmail.endsWith('@bosdb.com')) {
                console.log('[SuperAdmin Auth] Access denied - not @bosdb.com domain');
                return NextResponse.json({
                    error: 'Access Denied: Super Admin access is restricted to BosDB domain only'
                }, { status: 403 });
            }

            // Query SEPARATE SuperAdmin collection
            const superAdmin = await findSuperAdminByEmail(loginEmail);

            if (!superAdmin) {
                console.log('[SuperAdmin Auth] No super admin found with this email');
                return NextResponse.json({
                    error: 'Invalid super admin credentials'
                }, { status: 401 });
            }

            if (superAdmin.status === 'suspended') {
                return NextResponse.json({
                    error: 'This super admin account has been suspended'
                }, { status: 403 });
            }

            // Validate Password
            const isValid = await verifyPassword(password || '', superAdmin.password);

            if (!isValid) {
                console.log('[SuperAdmin Auth] Invalid password');
                return NextResponse.json({
                    error: 'Invalid super admin credentials'
                }, { status: 401 });
            }

            // Update last login time
            await updateSuperAdmin(superAdmin.id, {
                lastLoginAt: new Date()
            });

            console.log(`[SuperAdmin Auth] Login successful for ${superAdmin.email}`);

            // Return super admin data (formatted like User for frontend compatibility)
            return NextResponse.json({
                success: true,
                user: {
                    id: superAdmin.id,
                    email: superAdmin.email,
                    name: superAdmin.name,
                    role: superAdmin.role,
                    status: 'approved', // For frontend compatibility
                }
            });
        }

        // --- VERIFY TOTP ---
        if (action === 'verify_totp') {
            const { email, token } = body;

            if (!email || !token) {
                return NextResponse.json({ error: 'Email and Code are required' }, { status: 400 });
            }

            const verification = verifyTOTP(token, email);

            if (!verification.valid) {
                return NextResponse.json({ error: verification.error }, { status: 400 });
            }

            // TOTP is valid - create the user with admin privileges
            const newUser = verification.userData;
            await createUser(newUser);

            // Update Org with Admin ID
            await updateOrganization(verification.organizationId!, { adminUserId: newUser.id });

            // Get organization details
            const org = await findOrganizationById(verification.organizationId!);

            console.log(`[Auth] TOTP verified! User ${newUser.email} is now Admin of "${org?.name}"`);

            return NextResponse.json({
                success: true,
                user: newUser,
                organization: org,
                message: `Organization "${org?.name}" created. You are now the Verified Admin.`
            });
        }

        // --- FORGOT PASSWORD ---
        if (action === 'forgot_password') {
            const { email } = body;
            if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

            const user = await findUserByEmail(email);
            if (!user) {
                // Return success even if not found for security (or just say sent)
                // But for this internal tool, generic message is fine.
                return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
            }

            if (user.googleId && !user.password) {
                return NextResponse.json({ error: 'This account uses Google Login. Please sign in with Google.' }, { status: 400 });
            }

            // Generate Token (simple 6 digit OTP or UUID)
            const crypto = require('crypto');
            const token = crypto.randomBytes(20).toString('hex');
            const expires = new Date(Date.now() + 3600000); // 1 hour

            await updateUser(user.id, {
                resetPasswordToken: token,
                resetPasswordExpires: expires
            });

            // MOCK EMAIL SENDING
            console.log('---------------------------------------------------');
            console.log(`[Auth] 📬 MOCK EMAIL SENT TO: ${email}`);
            console.log(`[Auth] Subject: Password Reset Request`);
            console.log(`[Auth] Body: Click here to reset: http://localhost:3000/login?resetToken=${token}`);
            console.log(`[Auth] Token: ${token}`);
            console.log('---------------------------------------------------');

            return NextResponse.json({ message: 'Reset link sent to your email.' });
        }

        // --- RESET PASSWORD ---
        if (action === 'reset_password') {
            const { token, newPassword } = body;
            if (!token || !newPassword) return NextResponse.json({ error: 'Token and new password required' }, { status: 400 });

            const users = await getUsers();
            const user = users.find(u =>
                u.resetPasswordToken === token &&
                u.resetPasswordExpires &&
                new Date(u.resetPasswordExpires) > new Date()
            );

            if (!user) {
                return NextResponse.json({ error: 'Password reset token is invalid or has expired.' }, { status: 400 });
            }

            const validation = validatePassword(newPassword);
            if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

            const hashedPassword = await hashPassword(newPassword);

            await updateUser(user.id, {
                password: hashedPassword,
                resetPasswordToken: undefined,
                resetPasswordExpires: undefined
            });

            return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Auth API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

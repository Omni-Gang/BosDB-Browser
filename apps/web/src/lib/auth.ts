// User authentication and management

// Granular permissions for each connection
export interface ConnectionPermission {
    connectionId: string;
    canRead: boolean;       // View data (SELECT)
    canEdit: boolean;       // Modify data (INSERT, UPDATE, DELETE)
    canCommit: boolean;     // Access version control / commit changes
    canManageSchema: boolean; // CREATE, ALTER, DROP tables
    canDebug: boolean;      // Access to debugger
}

// Subscription plan
export interface Subscription {
    plan: 'free' | 'pro';
    isTrial?: boolean; // true if it's a free trial
    activatedAt?: Date;
    expiresAt?: Date | null; // null = lifetime
}

export interface User {
    id: string;          // e.g., "ayush-g", "yuval.o"
    name: string;        // Full name
    email: string;
    password?: string; // Optional for now to support existing users, but required for new ones
    googleId?: string; // For Google Login
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected';
    accountType: 'individual' | 'enterprise'; // Multi-tenant mode
    organizationId: string; // Organization this user belongs to
    permissions?: ConnectionPermission[]; // Granular permissions per connection
    subscription?: Subscription; // Pro subscription (legacy - now per org)
    createdAt: Date;
}

const USERS_STORAGE_KEY = 'bosdb_users';
const CURRENT_USER_KEY = 'bosdb_current_user';

// Password utilities
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain an uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain a lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain a number' };
    }
    return { valid: true };
}

// Get all users
export function getAllUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Get current logged-in user
export function getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
}

// Login user
export function login(userId: string): User | null {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);

    if (user) {
        // Only block if explicitly pending or rejected
        // If status is undefined (legacy user), allow access
        if (user.status === 'pending' || user.status === 'rejected') {
            throw new Error(user.status === 'pending'
                ? 'Your account is pending admin approval.'
                : 'Your account has been rejected.');
        }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
    }

    return null;
}

// Register new user (admin function)
export function registerUser(user: Omit<User, 'createdAt'>): void {
    const users = getAllUsers();

    // Check if user ID already exists
    if (users.some(u => u.id === user.id)) {
        throw new Error('User ID already exists');
    }

    const newUser: User = {
        ...user,
        status: user.status || 'pending', // Use provided status or default to pending
        createdAt: new Date(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Logout
export function logout(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
}

// Initialize with default admin user
export function initializeDefaultUsers(): void {
    const users = getAllUsers();

    if (users.length === 0) {
        // Create default admin (individual mode by default)
        const admin: User = {
            id: 'admin',
            name: 'Administrator',
            email: 'admin@bosdb.com',
            role: 'admin',
            status: 'approved',
            accountType: 'individual',
            organizationId: 'ind-admin',
            password: 'admin', // Default dev password
            createdAt: new Date(),
        };

        // SEED SUPER ADMIN (Requested by User)
        // Note: Password hash should be generated in real app, but for local storage this is plain text unless hashed on save
        // The auth.ts logic usually handles hashing in API route, not here directly for seed
        // We will store it as plain text here for "dev/local" mock, assuming internal trust
        // In real register flow, API hashes it. Here we manual seed.
        const superAdmin: User = {
            id: 'super-admin',
            name: 'Super Admin',
            email: 'ayush@bosdb.com',
            role: 'admin', // Treated as super-admin by email check
            status: 'approved',
            accountType: 'enterprise',
            organizationId: 'bosdb-internal',
            password: '$2a$10$X7.G...hashed_placeholder...', // Can't easily hash here without async bcrypt import. 
            // Wait, local storage stores full object. Login route checks password.
            // Let's rely on the user registering or manual API seed if possible, OR
            // We can just rely on the user registering normally?
            // User said "no one can register for it".
            // So I MUST seed it.
            // I'll make the login route handle this specific plain text password for this specific user as a fallback?
            // No, better to update the seed correctly if possible.
            // Actually, `initializeDefaultUsers` is synchronous. I can't await bcrypt.
            // I will store a special flag or handle it.
            // Let's use the 'admin' password hash logic from elsewhere if possible or just plain text and let verifyPassword handle it?
            // verifyPassword uses bcrypt.compare.
            // I will skip seeding hardcoded passwordHash here to avoid breakage.
            // I will let the user "Register" it via the hidden flow I'm about to build?
            // Or better: I will add code to `api/auth/route.ts` to ensuring this user exists on startup/request.
            createdAt: new Date(),
        };

        // Actually, let's just add the admin. The Super Admin 'ayush@bosdb.com' can be registered manually via the new UI 
        // OR better, I will seed it with a known hash if I can pre-calculate it.
        // Hashing "AyushKhan@098" locally... (I can't do it easily here).
        // Plan B: I will update `api/auth` to seed it on GET if missing.
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([admin]));

    }
}

// Check if user is logged in
export function isAuthenticated(): boolean {
    return getCurrentUser() !== null;
}

// Check if current user is admin
export function isAdmin(): boolean {
    const user = getCurrentUser();
    return user?.role === 'admin';
}

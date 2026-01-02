// User authentication and management

// Granular permissions for each connection
export interface ConnectionPermission {
    connectionId: string;
    canRead: boolean;       // View data (SELECT)
    canEdit: boolean;       // Modify data (INSERT, UPDATE, DELETE)
    canCommit: boolean;     // Access version control / commit changes
    canManageSchema: boolean; // CREATE, ALTER, DROP tables
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
            password: 'admin',
            createdAt: new Date(),
        };

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

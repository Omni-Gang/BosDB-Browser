
import connectDB from './db';
import User, { IUser } from '@/models/User';

// Export IUser as User for compatibility
export type { IUser as User };

// Helper to ensure DB is connected
async function ensureDB() {
    await connectDB();
}

// Get all users from an organization
export async function getUsersByOrg(orgId: string): Promise<IUser[]> {
    await ensureDB();
    return User.find({ organizationId: orgId }).lean();
}

// Get ALL users (across all organizations)
export async function getUsers(): Promise<IUser[]> {
    await ensureDB();
    const users = await User.find({}).lean();
    return users as IUser[];
}

// Find user by ID
export async function findUserById(id: string): Promise<IUser | null> {
    await ensureDB();
    const user = await User.findOne({ id }).lean();
    return user as IUser | null;
}

// Find user by ID within a specific organization
export async function findUserByIdInOrg(id: string, orgId: string): Promise<IUser | null> {
    await ensureDB();
    const user = await User.findOne({ id, organizationId: orgId }).lean();
    return user as IUser | null;
}

// Find user by email
export async function findUserByEmail(email: string): Promise<IUser | null> {
    await ensureDB();
    const user = await User.findOne({ email }).lean();
    return user as IUser | null;
}

// Find user by email within a specific organization
export async function findUserByEmailInOrg(email: string, orgId: string): Promise<IUser | null> {
    await ensureDB();
    const user = await User.findOne({ email, organizationId: orgId }).lean();
    return user as IUser | null;
}

// Create new user
export async function createUser(user: Partial<IUser>): Promise<IUser> {
    await ensureDB();
    if (!user.organizationId) {
        throw new Error('User must have an organizationId');
    }

    // Check if user exists (by email mostly, id might be duplicate across orgs if we used simple usernames, but schema says id is required/unique-ish)
    // Schema has 'id' as field.
    // Check for existing user
    // 1. Email must be globally unique
    const existingEmail = await User.findOne({ email: user.email });
    if (existingEmail) {
        throw new Error('Email already exists');
    }

    // 2. User ID must be unique ONLY within the organization
    const existingId = await User.findOne({
        id: user.id,
        organizationId: user.organizationId
    });

    if (existingId) {
        throw new Error(`User ID "${user.id}" already exists in this organization`);
    }


    const newUser = await User.create(user);
    return newUser.toObject();
}

// Update user
export async function updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    await ensureDB();
    const updated = await User.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true }
    ).lean();

    return updated as IUser | null;
}

// For migration compatibility
export async function saveUsers(_users: IUser[]) {
    // No-op or bulk write if needed
    console.warn('saveUsers called - no-op for MongoDB version');
}

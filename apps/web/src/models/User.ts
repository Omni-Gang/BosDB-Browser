
import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
    id: string;
    email: string;
    name: string;
    password?: string;
    googleId?: string;
    role: 'admin' | 'user' | 'super-admin';
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    accountType: 'individual' | 'enterprise';
    organizationId: string;
    permissions?: any[];
    subscription?: any;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    id: { type: String, required: true }, // Unique scoped to organizationId
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String },
    googleId: { type: String },
    role: { type: String, enum: ['admin', 'user', 'super-admin'], default: 'user' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    accountType: { type: String, enum: ['individual', 'enterprise'], default: 'enterprise' },
    organizationId: { type: String, required: true },
    permissions: [{ type: Schema.Types.Mixed }],
    subscription: { type: Schema.Types.Mixed },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

// Compound unique index: User ID must be unique ONLY within the same organization
UserSchema.index({ id: 1, organizationId: 1 }, { unique: true });

// Prevent Mongoose OverwriteModelError by deleting if exists (development fix)
if (mongoose.models.User) {
    delete mongoose.models.User;
}

const User: Model<IUser> = mongoose.model('User', UserSchema);

export default User;

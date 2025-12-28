
import mongoose, { Schema, Model } from 'mongoose';

export interface IOrganization {
    id: string;
    name: string;
    type: 'individual' | 'enterprise';
    domain?: string;
    adminUserId: string | null;
    subscription: {
        plan: 'free' | 'pro' | 'enterprise';
        planType?: 'trial' | 'monthly' | 'yearly';
        isTrial: boolean;
        activatedAt?: string;
        expiresAt?: string | null;
    };
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['individual', 'enterprise'], default: 'individual' },
    domain: { type: String },
    adminUserId: { type: String, default: null },
    subscription: {
        plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
        planType: { type: String, enum: ['trial', 'monthly', 'yearly'] },
        isTrial: { type: Boolean, default: false },
        activatedAt: Date,
        expiresAt: Date
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Prevent model overwrite in hot-reload, but force refresh in dev if needed to pick up schema changes
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.Organization;
}
const Organization: Model<IOrganization> = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

export default Organization;

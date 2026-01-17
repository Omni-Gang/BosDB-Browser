
// Organization management for multi-tenant BosDB
// Supports Individual (single user) and Enterprise (company) modes

import connectDB from './db';
import Organization, { IOrganization } from '@/models/Organization';

export type { IOrganization as Organization };
export type OrganizationType = 'individual' | 'enterprise';

export interface Subscription {
    plan: 'free' | 'pro' | 'enterprise';
    planType?: 'trial' | 'monthly' | 'yearly';
    isTrial: boolean;
    activatedAt?: string;
    expiresAt?: string | null;
}

export const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

// Helper to ensure DB is connected
async function ensureDB() {
    await connectDB();
}

export async function getOrganizationById(id: string): Promise<IOrganization | null> {
    await ensureDB();
    const org = await Organization.findOne({ id }).lean();
    return org as IOrganization | null;
}

// Alias for backward compatibility
export const findOrganizationById = getOrganizationById;

export async function findOrganizationByDomain(domain: string): Promise<IOrganization | null> {
    await ensureDB();
    // For enterprise organizations, the 'id' field is often the domain itself.
    // Also check the 'domain' field explicitly for robustness since we might have migrated data or different schemas
    const org = await Organization.findOne({
        $or: [
            { id: domain, type: 'enterprise' },
            { domain: domain.toLowerCase(), type: 'enterprise' } // Assuming 'domain' field exists in schema or is flexible
        ]
    }).lean();
    return org as IOrganization | null;
}

export async function saveOrganization(org: Partial<IOrganization>): Promise<void> {
    await ensureDB();
    // Using updateOne with upsert to handle both create and update efficiently
    if (!org.id) throw new Error("Organization ID is required for saving");

    await Organization.updateOne(
        { id: org.id },
        { $set: org },
        { upsert: true }
    );
}

export async function updateOrganization(orgId: string, updates: Partial<IOrganization>): Promise<void> {
    await ensureDB();
    await Organization.updateOne(
        { id: orgId },
        { $set: { ...updates, updatedAt: new Date() } }
    );
}

export function extractDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '';
    return parts[1].toLowerCase();
}

export async function getOrCreateOrgForUser(email: string, accountType: 'individual' | 'enterprise'): Promise<{ org: IOrganization, isNew: boolean }> {
    await ensureDB();
    const domain = extractDomain(email);

    let org: IOrganization | null = null;
    let isNew = false;

    if (accountType === 'individual') {
        // Individual: Personal Org (e.g., ind-username)
        const userId = email.split('@')[0];
        const orgId = `ind-${userId}`;

        org = await getOrganizationById(orgId);

        if (!org) {
            // Define new org object
            // Use 'any' cast if strict type checking complains about missing optional fields during creation, 
            // but ideally strictly match IOrganization
            const newOrg = {
                id: orgId,
                name: `${userId}'s Workspace`,
                type: 'individual' as const,
                domain: 'personal',
                adminUserId: userId,
                subscription: { plan: 'free' as const, isTrial: false },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Create via Mongoose model directly for better validation
            await Organization.create(newOrg);
            org = await getOrganizationById(orgId);
            isNew = true;
        }
    } else {
        // Enterprise: Domain-based Org
        const isCommon = COMMON_EMAIL_DOMAINS.includes(domain);

        if (isCommon) {
            throw new Error("Public email domains (Gmail, Yahoo, etc.) are not allowed for Company registration. Please use your work email.");
        }

        // Real Enterprise Domain
        org = await findOrganizationByDomain(domain);

        if (!org) {
            const newOrg = {
                id: domain,
                name: `@${domain}`, // Use email domain format: @bosdb.com, @flipkart.com
                type: 'enterprise' as const,
                domain: domain,
                adminUserId: null,
                subscription: { plan: 'free' as const, isTrial: true, planType: 'trial' as const },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await Organization.create(newOrg);
            org = await getOrganizationById(domain);
            isNew = true;
        }

    }

    if (!org) throw new Error("Failed to create org");

    return { org, isNew };
}

// Update organization subscription
export async function updateOrgSubscription(
    orgId: string,
    subscription: Partial<Subscription>
): Promise<IOrganization | null> {
    const org = await getOrganizationById(orgId);
    if (!org) return null;

    // Merge existing subscription with updates
    // Use 'any' to avoid strict Partial<> issues if needed, but clean TS is better
    const currentSub = (org as any).subscription || {};
    const updatedSubscription = { ...currentSub, ...subscription };

    await updateOrganization(orgId, { subscription: updatedSubscription } as any);

    return getOrganizationById(orgId);
}

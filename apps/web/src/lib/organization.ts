// Organization management for multi-tenant BosDB
// Supports Individual (single user) and Enterprise (company) modes

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.bosdb-data');
const ORGS_DIR = path.join(DATA_DIR, 'orgs');
const ORGS_INDEX = path.join(DATA_DIR, 'organizations.json');

// Organization types
export type OrganizationType = 'individual' | 'enterprise';

export interface Subscription {
    plan: 'free' | 'pro' | 'enterprise';
    planType?: 'trial' | 'monthly' | 'yearly';
    isTrial: boolean;
    activatedAt?: string;
    expiresAt?: string | null;
}

export interface Organization {
    id: string;              // For enterprise: domain (newgentsoft.com), for individual: "ind-{userId}"
    name: string;            // Display name (company name or user's name)
    type: OrganizationType;  // 'individual' or 'enterprise'
    domain?: string;         // For enterprise: email domain
    adminUserId: string;     // First user who created / admin
    subscription: Subscription;
    createdAt: string;
    updatedAt: string;
}

// Ensure directories exist
function ensureDataDirs(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORGS_DIR)) {
        fs.mkdirSync(ORGS_DIR, { recursive: true });
    }
}

// Get all organizations
export function getAllOrganizations(): Organization[] {
    ensureDataDirs();
    try {
        if (fs.existsSync(ORGS_INDEX)) {
            return JSON.parse(fs.readFileSync(ORGS_INDEX, 'utf-8'));
        }
    } catch (err) {
        console.error('[Org Store] Error reading organizations:', err);
    }
    return [];
}

// Save all organizations
function saveOrganizations(orgs: Organization[]): void {
    ensureDataDirs();
    fs.writeFileSync(ORGS_INDEX, JSON.stringify(orgs, null, 2));
}

// Find organization by ID
export function findOrganizationById(id: string): Organization | null {
    const orgs = getAllOrganizations();
    return orgs.find(o => o.id === id) || null;
}

// Find organization by domain (for enterprise)
export function findOrganizationByDomain(domain: string): Organization | null {
    const orgs = getAllOrganizations();
    return orgs.find(o => o.type === 'enterprise' && o.domain === domain.toLowerCase()) || null;
}

// Create organization
export function createOrganization(org: Omit<Organization, 'createdAt' | 'updatedAt'>): Organization {
    ensureDataDirs();
    const orgs = getAllOrganizations();

    // Check if org already exists
    if (orgs.find(o => o.id === org.id)) {
        throw new Error('Organization already exists');
    }

    const newOrg: Organization = {
        ...org,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orgs.push(newOrg);
    saveOrganizations(orgs);

    // Create org-specific directory
    const orgDir = path.join(ORGS_DIR, newOrg.id);
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
    }

    console.log(`[Org Store] Created organization: ${newOrg.id} (${newOrg.type})`);
    return newOrg;
}

// Update organization
export function updateOrganization(id: string, updates: Partial<Organization>): Organization | null {
    const orgs = getAllOrganizations();
    const index = orgs.findIndex(o => o.id === id);

    if (index === -1) return null;

    orgs[index] = {
        ...orgs[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    saveOrganizations(orgs);
    return orgs[index];
}

// Get organization data directory
export function getOrgDataDir(orgId: string): string {
    ensureDataDirs();
    const orgDir = path.join(ORGS_DIR, orgId);
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
    }
    return orgDir;
}

// Extract domain from email
export function extractDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) {
        throw new Error('Invalid email format');
    }
    return parts[1].toLowerCase();
}

// Generate organization ID for individual
export function generateIndividualOrgId(userId: string): string {
    return `ind-${userId}`;
}

// Check if user belongs to organization
export function userBelongsToOrg(userEmail: string, orgId: string): boolean {
    const org = findOrganizationById(orgId);
    if (!org) return false;

    if (org.type === 'individual') {
        // Individual orgs only have one user (checked via orgId match)
        return true;
    }

    // Enterprise: check domain match
    const userDomain = extractDomain(userEmail);
    return org.domain === userDomain;
}

// Get or create organization for a new user
export function getOrCreateOrgForUser(
    email: string,
    name: string,
    type: OrganizationType,
    userId: string
): Organization {
    if (type === 'individual') {
        const orgId = generateIndividualOrgId(userId);
        const existing = findOrganizationById(orgId);
        if (existing) return existing;

        return createOrganization({
            id: orgId,
            name: `${name}'s Workspace`,
            type: 'individual',
            adminUserId: userId,
            subscription: { plan: 'free', isTrial: false }
        });
    }

    // Enterprise
    const domain = extractDomain(email);
    const existing = findOrganizationByDomain(domain);
    if (existing) return existing;

    // Create new enterprise org
    const companyName = domain.split('.')[0]; // e.g., "newgentsoft" from "newgentsoft.com"
    return createOrganization({
        id: domain,
        name: companyName.charAt(0).toUpperCase() + companyName.slice(1), // Capitalize
        type: 'enterprise',
        domain: domain,
        adminUserId: userId,
        subscription: { plan: 'free', isTrial: false }
    });
}

// Update organization subscription
export function updateOrgSubscription(
    orgId: string,
    subscription: Partial<Subscription>
): Organization | null {
    const org = findOrganizationById(orgId);
    if (!org) return null;

    return updateOrganization(orgId, {
        subscription: { ...org.subscription, ...subscription }
    });
}

// System-wide subscription management
// Enterprise model: One subscription for the entire BosDB instance
// All users in this instance get Pro features when company is subscribed

import fs from 'fs';
import path from 'path';

const SUBSCRIPTION_FILE = path.join(process.cwd(), '.bosdb-subscription.json');

export interface SystemSubscription {
    plan: 'free' | 'pro';
    isTrial: boolean;
    companyName?: string;
    activatedAt?: string;
    expiresAt?: string | null; // null = lifetime
    activatedBy?: string; // user who activated
}

const DEFAULT_SUBSCRIPTION: SystemSubscription = {
    plan: 'free',
    isTrial: false
};

/**
 * Get the system-wide subscription status
 */
export function getSystemSubscription(): SystemSubscription {
    try {
        if (fs.existsSync(SUBSCRIPTION_FILE)) {
            const data = fs.readFileSync(SUBSCRIPTION_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[Subscription] Error reading subscription file:', err);
    }
    return DEFAULT_SUBSCRIPTION;
}

/**
 * Update the system-wide subscription
 */
export function updateSystemSubscription(subscription: Partial<SystemSubscription>): SystemSubscription {
    const current = getSystemSubscription();
    const updated = { ...current, ...subscription };

    try {
        fs.writeFileSync(SUBSCRIPTION_FILE, JSON.stringify(updated, null, 2));
        console.log('[Subscription] Updated system subscription:', updated);
    } catch (err) {
        console.error('[Subscription] Error saving subscription:', err);
    }

    return updated;
}

/**
 * Check if system has active Pro subscription
 */
export function isSystemPro(): boolean {
    const sub = getSystemSubscription();
    if (sub.plan !== 'pro') return false;

    // Check expiry
    if (sub.expiresAt) {
        return new Date(sub.expiresAt) > new Date();
    }

    return true; // No expiry = lifetime
}

/**
 * Check if system is on trial
 */
export function isSystemTrial(): boolean {
    const sub = getSystemSubscription();
    return sub.plan === 'pro' && sub.isTrial === true;
}

/**
 * Get subscription display text
 */
export function getSubscriptionLabel(): { text: string; color: 'green' | 'purple' | 'gray' } {
    const sub = getSystemSubscription();

    if (sub.plan !== 'pro') {
        return { text: 'Free', color: 'gray' };
    }

    // Check if expired
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
        return { text: 'Expired', color: 'gray' };
    }

    if (sub.isTrial) {
        return { text: 'Trial', color: 'green' };
    }

    return { text: 'Pro', color: 'purple' };
}

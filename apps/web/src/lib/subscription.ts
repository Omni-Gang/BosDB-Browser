// Subscription helper functions (client-side)
// For multi-tenant - subscriptions are per-organization

// Client-side cache for organization subscription status
let cachedOrgSubscription: {
    isPro: boolean;
    isTrial: boolean;
    planType?: 'trial' | 'monthly' | 'yearly';
    orgId: string | null;
    orgName: string | null;
} | null = null;

/**
 * Fetch and cache organization subscription status from server
 * Call this on app load
 */
export async function fetchOrgSubscription(orgId: string): Promise<{ isPro: boolean; isTrial: boolean; planType?: string }> {
    if (!orgId) {
        return { isPro: false, isTrial: false };
    }

    try {
        const res = await fetch(`/api/subscription?orgId=${encodeURIComponent(orgId)}`);
        if (res.ok) {
            const data = await res.json();
            cachedOrgSubscription = {
                isPro: data.isPro,
                isTrial: data.isTrial,
                planType: data.subscription?.planType,
                orgId: data.organization?.id || null,
                orgName: data.organization?.name || null
            };
            return { isPro: data.isPro, isTrial: data.isTrial, planType: data.subscription?.planType };
        }
    } catch (err) {
        console.error('Failed to fetch subscription:', err);
    }
    return { isPro: false, isTrial: false };
}

/**
 * Get cached subscription status (synchronous)
 */
export function getOrgSubscriptionStatus(): { isPro: boolean; isTrial: boolean; planType?: string; orgId: string | null; orgName: string | null } {
    return cachedOrgSubscription || { isPro: false, isTrial: false, planType: undefined, orgId: null, orgName: null };
}

/**
 * Check if current org has Pro (use cached value)
 */
export function isPro(): boolean {
    return cachedOrgSubscription?.isPro ?? false;
}

/**
 * Check if current org is on trial
 */
export function isTrial(): boolean {
    return cachedOrgSubscription?.isTrial ?? false;
}

/**
 * Feature names that require Pro subscription
 */
// Databases allowed on Free Plan
export const FREE_DATABASE_TYPES = [
    'postgres',
    'mysql',
    'mssql',
    'mongodb',
    'redis'
] as const;

/**
 * Check if a database type is allowed for the current subscription
 */
export function isDatabaseAllowed(type: string): boolean {
    // Pro/Trial users can access all databases
    if (isPro()) {
        return true;
    }

    // Free users restricted to specific types
    return (FREE_DATABASE_TYPES as readonly string[]).includes(type);
}

/**
 * Feature names that require Pro subscription
 */
export const PRO_FEATURES = [
    'version_control',
    'commit_history',
    'table_designer',
    'data_editing',
    'granular_permissions',
    'unlimited_connections',
    'json_export',
    'sql_export',
    'git_access',
    'pro_databases'
] as const;

export const FREE_FEATURES = [
    'basic_query',
    'csv_export',
    'schema_explorer',
    'query_history_limited', // 50 entries max
    'basic_git'             // Basic local commits only
] as const;

/**
 * Check if a feature is available (based on org subscription)
 */
export function canUseFeature(feature: string): boolean {
    // Free features are always available
    if ((FREE_FEATURES as readonly string[]).includes(feature)) {
        return true;
    }

    // Pro features require subscription
    if ((PRO_FEATURES as readonly string[]).includes(feature)) {
        return isPro();
    }

    // Unknown feature - default to requiring Pro
    return isPro();
}

/**
 * Get subscription status text for display
 */
export function getSubscriptionStatusText(): string {
    const status = getOrgSubscriptionStatus();
    if (!status.isPro) {
        return 'Free Plan';
    }
    if (status.isTrial) {
        return 'Trial (1 month free)';
    }
    return 'Pro';
}

/**
 * Pricing info
 */
export const PRICING = {
    free: {
        name: 'Free',
        price: 0,
        period: 'forever',
        features: [
            '2 Database Connections',
            '50 Query History Entries',
            'Schema Explorer',
            'CSV Export',
            'Basic Query Editor'
        ]
    },
    pro_trial: {
        name: 'Pro Trial',
        price: 0,
        period: '1 month',
        features: [
            'All Pro features FREE for 1 month',
            'No credit card required',
            'Cancel anytime'
        ]
    },
    pro_monthly: {
        name: 'Pro Monthly',
        price: 29,
        period: 'month',
        features: [
            'Unlimited Connections',
            'Unlimited Query History',
            'Version Control & Commits',
            'Table Designer',
            'Data Grid Editing',
            'Granular Permissions',
            'CSV, JSON, SQL Export',
            'Priority Support'
        ]
    },
    pro_yearly: {
        name: 'Pro Yearly',
        price: 249,
        period: 'year',
        savings: '29%',
        features: [
            'Everything in Pro Monthly',
            '2 Months FREE',
            'Priority Support',
            'Early Access to New Features'
        ]
    },
    enterprise_monthly: {
        name: 'Enterprise Monthly',
        price: 99,
        period: 'month',
        features: [
            'Everything in Pro',
            'SSO / SAML',
            'Audit Logs',
            'Dedicated Support',
            '99.9% SLA',
            'Advanced Security'
        ]
    },
    enterprise_yearly: {
        name: 'Enterprise Yearly',
        price: 999,
        period: 'year',
        savings: '16%',
        features: [
            'Everything in Enterprise Monthly',
            '2 Months FREE',
            'Dedicated Success Manager',
            'Custom Contracts',
            'Training Sessions'
        ]
    }
};

/**
 * Coupon configuration
 */
export const COUPONS: Record<string, { discount_percent: number, description: string, allowed_plans?: string[] }> = {
    'bosdb100': {
        discount_percent: 100,
        description: '100% OFF Monthly Plan',
        allowed_plans: ['pro_monthly']
    },
    'omnigang100': {
        discount_percent: 100,
        description: '100% OFF Yearly Plan',
        allowed_plans: ['pro_yearly']
    }
};

/**
 * Validate a coupon code for a specific plan
 */
export function isValidCoupon(code: string, planId?: string): boolean {
    const coupon = COUPONS[code];
    if (!coupon) return false;

    // If planId is provided, check if it's allowed for this coupon
    if (planId && coupon.allowed_plans) {
        return coupon.allowed_plans.includes(planId);
    }

    return true;
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(originalPrice: number, couponCode?: string, planId?: string): number {
    if (!couponCode || !COUPONS[couponCode]) {
        return originalPrice;
    }

    const coupon = COUPONS[couponCode];

    // Validate plan restriction
    if (planId && coupon.allowed_plans && !coupon.allowed_plans.includes(planId)) {
        return originalPrice;
    }

    const discount = coupon.discount_percent;
    return Math.max(0, originalPrice * (1 - discount / 100));
}

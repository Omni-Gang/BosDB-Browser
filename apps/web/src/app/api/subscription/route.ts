import { NextRequest, NextResponse } from 'next/server';
import { findOrganizationById, updateOrgSubscription, createOrganization } from '@/lib/organization';
import { findUserById } from '@/lib/users-store';
import { COUPONS } from '@/lib/subscription';

// GET /api/subscription - Get organization subscription status
export async function GET(request: NextRequest) {
    try {
        // Get organization from query params or user
        const orgId = request.nextUrl.searchParams.get('orgId');

        if (!orgId) {
            return NextResponse.json({
                subscription: { plan: 'free', isTrial: false },
                isPro: false,
                isTrial: false
            });
        }

        let org = findOrganizationById(orgId);

        // Auto-create default admin org if missing
        if (!org && orgId === 'ind-admin') {
            console.log('[Subscription API] Auto-creating missing default admin org');
            org = createOrganization({
                id: 'ind-admin',
                name: 'Administrator Workspace',
                type: 'individual',
                adminUserId: 'admin',
                subscription: { plan: 'free', isTrial: false }
            });
        }

        if (!org) {
            return NextResponse.json({
                subscription: { plan: 'free', isTrial: false },
                isPro: false,
                isTrial: false
            });
        }

        const isPro = org.subscription.plan === 'pro';
        const isExpired = org.subscription.expiresAt
            ? new Date(org.subscription.expiresAt) < new Date()
            : false;

        return NextResponse.json({
            subscription: org.subscription,
            isPro: isPro && !isExpired,
            isTrial: org.subscription.isTrial,
            organization: {
                id: org.id,
                name: org.name,
                type: org.type
            }
        });
    } catch (error: any) {
        console.error('[Subscription API] Error:', error);
        return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
    }
}

// POST /api/subscription - Upgrade organization subscription (demo payment)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { plan, orgId, cardNumber, expiryDate, cvv, userId, coupon } = body;

        console.log('[Stripe Simulation] 💳 Processing Payment Intent for org:', orgId);
        console.log('[Stripe Simulation] 🛒 Plan:', plan, 'Coupon:', coupon || 'None');

        // Simulate real network delay for payment authorization
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Validate required fields
        if (!orgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

        let org = findOrganizationById(orgId);

        // Auto-create default admin org if missing
        if (!org && orgId === 'ind-admin') {
            console.log('[Subscription API] Auto-creating missing default admin org during upgrade');
            org = createOrganization({
                id: 'ind-admin',
                name: 'Administrator Workspace',
                type: 'individual',
                adminUserId: 'admin',
                subscription: { plan: 'free', isTrial: false }
            });
        }

        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Validate plan
        if (!plan || !['pro_trial', 'pro_monthly', 'pro_yearly', 'enterprise_monthly', 'enterprise_yearly'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        // Check for specific coupon validity
        const couponData = coupon ? COUPONS[coupon as keyof typeof COUPONS] : null;
        const isFreeWithCoupon = couponData?.discount_percent === 100;

        // Validate coupon plan restriction
        if (couponData && couponData.allowed_plans && !couponData.allowed_plans.includes(plan)) {
            return NextResponse.json({
                error: `Coupon '${coupon}' is not valid for plan '${plan}'`
            }, { status: 400 });
        }

        // For paid plans, validate card (demo) - Skip if 100% off coupon applied
        if (plan !== 'pro_trial' && !isFreeWithCoupon) {
            if (!cardNumber || cardNumber.length !== 16) {
                return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
            }
            if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
                return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
            }
            if (!cvv || cvv.length !== 3) {
                return NextResponse.json({ error: 'Invalid CVV' }, { status: 400 });
            }
        }

        // Calculate expiry
        let expiresAt: string | null = null;
        const now = new Date();
        if (plan === 'pro_trial') {
            const expiry = new Date(now);
            expiry.setDate(expiry.getDate() + 30);
            expiresAt = expiry.toISOString();
        } else if (plan === 'pro_monthly' || plan === 'enterprise_monthly') {
            const expiry = new Date(now);
            expiry.setDate(expiry.getDate() + 30);
            expiresAt = expiry.toISOString();
        } else if (plan === 'pro_yearly' || plan === 'enterprise_yearly') {
            const expiry = new Date(now);
            expiry.setFullYear(expiry.getFullYear() + 1);
            expiresAt = expiry.toISOString();
        }

        // Update organization subscription
        const updated = updateOrgSubscription(orgId, {
            plan: plan.startsWith('enterprise') ? 'enterprise' : 'pro',
            planType: plan === 'pro_trial' ? 'trial' : (plan.includes('monthly') ? 'monthly' : 'yearly'),
            isTrial: plan === 'pro_trial',
            activatedAt: now.toISOString(),
            expiresAt: expiresAt
        });

        if (!updated) {
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        const message = plan === 'pro_trial'
            ? `🎉 Free trial activated for "${org.name}"! All users now have Pro features for 1 month!`
            : `🎉 "${org.name}" upgraded to Pro! All users now have Pro features!`;

        console.log('[Subscription API]', message);

        return NextResponse.json({
            success: true,
            message,
            subscription: updated.subscription,
            organization: {
                id: updated.id,
                name: updated.name,
                type: updated.type
            }
        });
    } catch (error: any) {
        console.error('[Subscription API] Error:', error);
        return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
    }
}

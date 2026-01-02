import { NextRequest, NextResponse } from 'next/server';
import { findOrganizationById, updateOrgSubscription, saveOrganization, Organization as IOrganization } from '@/lib/organization';
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

        let org = await findOrganizationById(orgId);

        // Auto-create default admin org if missing
        if (!org && orgId === 'ind-admin') {
            console.log('[Subscription API] Auto-creating missing default admin org');
            const adminOrg: any = {
                id: 'ind-admin',
                name: 'Administrator Workspace',
                type: 'individual',
                adminUserId: 'admin',
                subscription: { plan: 'free', isTrial: false }
            };
            await saveOrganization(adminOrg);
            org = adminOrg;
        }

        if (!org) {
            return NextResponse.json({
                subscription: { plan: 'free', isTrial: false },
                isPro: false,
                isTrial: false
            });
        }

        // Ensure subscription exists (handle legacy data)
        if (!org.subscription) {
            org.subscription = { plan: 'free', isTrial: false };
        }

        const isPro = org.subscription.plan === 'pro' || org.subscription.plan === 'enterprise';
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
        const { action, plan, orgId, cardNumber, expiryDate, cvv, userId, coupon, paymentIntentId } = body;

        // --- STRIPE: Create Payment Intent ---
        if (action === 'create_intent') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
            }

            const { stripe, getOrCreateCustomer } = await import('@/lib/stripe');
            const { calculateDiscountedPrice, PRICING } = await import('@/lib/subscription');

            // Calculate Price
            const pricingModel = (PRICING as any)[plan];
            if (!pricingModel) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

            const originalPrice = pricingModel.price;
            const finalPrice = calculateDiscountedPrice(originalPrice, coupon, plan);

            if (finalPrice === 0) {
                return NextResponse.json({ amount: 0 }); // Free, no intent needed
            }

            // Get Customer
            const user = await findUserById(userId);
            const org = await findOrganizationById(orgId);
            if (!user || !org) return NextResponse.json({ error: 'User/Org not found' }, { status: 404 });

            const customer = await getOrCreateCustomer(orgId, user.email, org.name);

            if (!customer) {
                return NextResponse.json({ error: 'Failed to create Stripe customer' }, { status: 500 });
            }

            // Create Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(finalPrice * 100), // cents
                currency: 'usd',
                customer: customer.id,
                automatic_payment_methods: { enabled: true },
                metadata: { orgId, plan, userId }
            });

            return NextResponse.json({
                clientSecret: paymentIntent.client_secret,
                id: paymentIntent.id
            });
        }

        // --- STRIPE: Confirm Payment & Upgrade ---
        if (action === 'confirm_payment') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
            }
            const { stripe } = await import('@/lib/stripe');

            // Verify Intent Status
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (intent.status !== 'succeeded') {
                return NextResponse.json({ error: `Payment not succeeded. Status: ${intent.status}` }, { status: 400 });
            }

            // Trust the metadata or the original params? Let's use metadata for security if possible, or just validate params match
            // For now, proceed with upgrade logic below...
            console.log('[Subscription API] Payment confirmed for:', intent.id);
        }

        // --- EXISTING SIMULATION / FINAL UPGRADE LOGIC ---

        console.log('[Subscription API] Processing Upgrade for org:', orgId);

        // Validate required fields
        if (!orgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

        let org = await findOrganizationById(orgId);

        // Auto-create default admin org if missing
        if (!org && orgId === 'ind-admin') {
            console.log('[Subscription API] Auto-creating missing default admin org during upgrade');
            const adminOrg: any = {
                id: 'ind-admin',
                name: 'Administrator Workspace',
                type: 'individual',
                adminUserId: 'admin',
                subscription: { plan: 'free', isTrial: false }
            };
            await saveOrganization(adminOrg);
            org = adminOrg;
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

        // For paid plans, validate card (demo) - Skip if 100% off coupon applied OR if using Stripe (action confirmed)
        if (plan !== 'pro_trial' && !isFreeWithCoupon && action !== 'confirm_payment') {
            if (!process.env.STRIPE_SECRET_KEY) {
                // Only enforce manual card checks if we are NOT using Stripe (Simulation Mode)
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
        const updated = await updateOrgSubscription(orgId, {
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

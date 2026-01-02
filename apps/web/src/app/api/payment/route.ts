import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUser } from '@/lib/users-store';

// POST /api/payment - Demo payment endpoint
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, plan, cardNumber, expiryDate, cvv } = body;

        console.log('[Payment API] Processing demo payment for:', userId, 'Plan:', plan);

        // Validate required fields
        if (!userId || !plan) {
            return NextResponse.json({ error: 'User ID and plan are required' }, { status: 400 });
        }

        // For paid plans, validate card info
        if (plan !== 'pro_trial') {
            if (!cardNumber || !expiryDate || !cvv) {
                return NextResponse.json({ error: 'Card details required for paid plans' }, { status: 400 });
            }

            // Validate card format (demo validation)
            if (cardNumber.length !== 16) {
                return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
            }

            if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
                return NextResponse.json({ error: 'Invalid expiry date format' }, { status: 400 });
            }

            if (cvv.length !== 3) {
                return NextResponse.json({ error: 'Invalid CVV' }, { status: 400 });
            }
        }

        // Find user
        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user already used free trial
        if (plan === 'pro_trial' && user.subscription?.plan === 'pro') {
            return NextResponse.json({ error: 'You have already used or have an active Pro subscription' }, { status: 400 });
        }

        // Calculate expiry date based on plan
        let expiresAt: Date | null = null;
        if (plan === 'pro_trial') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days free trial
        } else if (plan === 'pro_monthly') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (plan === 'pro_yearly') {
            expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Update user with Pro subscription
        const updatedUser = await updateUser(userId, {
            subscription: {
                plan: 'pro',
                isTrial: plan === 'pro_trial',
                activatedAt: new Date(),
                expiresAt: expiresAt
            }
        });

        const message = plan === 'pro_trial'
            ? 'Free trial activated! Enjoy 1 month of BosDB Pro!'
            : 'Payment successful! Welcome to BosDB Pro!';

        console.log('[Payment API] ✅', message, userId);

        return NextResponse.json({
            success: true,
            message,
            user: updatedUser
        });
    } catch (error: any) {
        console.error('[Payment API] Error:', error);
        return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
    }
}

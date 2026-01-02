'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Zap, ArrowLeft, CreditCard, Shield, Star, Loader2, Lock, Landmark } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { fetchOrgSubscription, PRICING, isValidCoupon, calculateDiscountedPrice, COUPONS } from '@/lib/subscription';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckout from '@/components/StripeCheckout';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

export default function PricingPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'individual' | 'enterprise'>('individual');
    const [showPayment, setShowPayment] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'pro_monthly' | 'pro_yearly' | 'pro_trial' | 'enterprise_monthly' | 'enterprise_yearly'>('pro_monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [user, setUser] = useState<any>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<{ isPro: boolean; isTrial: boolean; planType?: string }>({ isPro: false, isTrial: false });
    const [coupon, setCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');

    useEffect(() => {
        // Safe access to window/localStorage on client
        const currentUser = getCurrentUser();
        setUser(currentUser);

        // Fetch organization subscription
        if (currentUser?.organizationId) {
            fetchOrgSubscription(currentUser.organizationId).then(status => {
                setSubscriptionStatus(status);
            });
        }

        // Lock view mode based on account type
        if (currentUser?.accountType === 'individual') {
            setViewMode('individual');
        } else if (currentUser?.accountType === 'enterprise') {
            setViewMode('enterprise');
        }
    }, [router]);

    const systemIsPro = subscriptionStatus.isPro;
    const planType = subscriptionStatus.planType;
    const handleApplyCoupon = () => {
        if (isValidCoupon(coupon, selectedPlan)) {
            setAppliedCoupon(coupon);
            // Calculate discount based on the new logic in subscription.ts
            const originalPrice = (PRICING as any)[selectedPlan].price;
            const finalPrice = calculateDiscountedPrice(originalPrice, coupon, selectedPlan);
            const discountPercent = ((originalPrice - finalPrice) / originalPrice) * 100;
            setDiscount(discountPercent);
            setError('');
        } else {
            const couponData = (COUPONS as any)[coupon];
            if (couponData && couponData.allowed_plans && !couponData.allowed_plans.includes(selectedPlan)) {
                setError(`This coupon is only valid for the ${couponData.allowed_plans[0].replace('pro_', '')} plan`);
            } else {
                setError('Invalid coupon code');
            }
            setAppliedCoupon('');
            setDiscount(0);
        }
    };

    const handleUpgrade = (plan: 'pro_monthly' | 'pro_yearly' | 'pro_trial' | 'enterprise_monthly' | 'enterprise_yearly') => {
        if (!user) {
            router.push('/login');
            return;
        }
        setSelectedPlan(plan);
        if (plan === 'pro_trial') {
            // Free trial - no payment needed
            handleFreeTrial();
        } else {
            setShowPayment(true);
        }
    };

    useEffect(() => {
        if (showPayment && selectedPlan !== 'pro_trial' && user) {
            const createIntent = async () => {
                setLoading(true);
                try {
                    const res = await fetch('/api/subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'create_intent',
                            plan: selectedPlan,
                            orgId: user?.organizationId,
                            userId: user?.id,
                            coupon: appliedCoupon
                        })
                    });
                    const data = await res.json();

                    if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    } else {
                        setClientSecret('');
                        // If error (and not free plan result), log it
                        if (data.error && data.error !== 'Stripe not configured') {
                            console.error('Stripe init failed:', data.error);
                        }
                    }
                } catch (e) {
                    console.error('Failed to init payment', e);
                } finally {
                    setLoading(false);
                }
            };

            createIntent();
        }
    }, [showPayment, selectedPlan, appliedCoupon, user]);

    const handleFreeTrial = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: 'pro_trial',
                    orgId: user?.organizationId, // Organization subscription
                    userId: user?.id
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert('🎉 Free trial activated! All users now have Pro features for 1 month!');
                router.push('/dashboard');
            } else {
                alert(data.error || 'Failed to activate trial');
            }
        } catch (err: any) {
            alert(err.message || 'Error activating trial');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        setError('');
        const finalPrice = calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon);
        const isFreeWithCoupon = finalPrice === 0;

        // Basic validation - skip if 100% off coupon
        if (!isFreeWithCoupon) {
            if (cardNumber.replace(/\s/g, '').length !== 16) {
                setError('Card number must be 16 digits');
                return;
            }
            if (!expiry.match(/^\d{2}\/\d{2}$/)) {
                setError('Expiry must be MM/YY format');
                return;
            }
            if (cvv.length !== 3) {
                setError('CVV must be 3 digits');
                return;
            }
        }

        setLoading(true);
        setPaymentProcessing(true);

        // Simulate real payment gateway delay (Stripe vibe)
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: selectedPlan,
                    orgId: user?.organizationId, // Organization subscription
                    userId: user?.id,
                    cardNumber: isFreeWithCoupon ? '0000000000000000' : cardNumber.replace(/\s/g, ''),
                    expiryDate: isFreeWithCoupon ? '00/00' : expiry,
                    cvv: isFreeWithCoupon ? '000' : cvv,
                    coupon: appliedCoupon
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setIsPaid(true);
                // Refresh subscription status
                if (user?.organizationId) {
                    fetchOrgSubscription(user.organizationId);
                }
                // Redirect after a small delay to show success
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                setError(data.error || 'Payment failed');
                setPaymentProcessing(false);
            }
        } catch (err: any) {
            setError(err.message || 'Payment error');
            setPaymentProcessing(false);
        } finally {
            setLoading(false);
        }
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/dashboard" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-white">Pricing</h1>
                </div>
            </header>

            <div className="container mx-auto px-6 py-16">
                {/* Hero */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">BosDB Pro</span>
                    </h2>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Unlock powerful features for your database management workflow
                    </p>
                    {systemIsPro && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full">
                            <Star className="w-4 h-4" />
                            You have Pro access!
                        </div>
                    )}
                </div>

                {/* Toggle - Only show if not logged in */}
                {!user && (
                    <div className="flex justify-center mb-12">
                        <div className="bg-white/10 p-1 rounded-xl flex">
                            <button
                                onClick={() => setViewMode('individual')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'individual' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Individual
                            </button>
                            <button
                                onClick={() => setViewMode('enterprise')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'enterprise' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                Enterprise
                            </button>
                        </div>
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                    {/* Free Plan (Always visible or specific to Individual?) Let's keep it visible for Individual */}
                    {viewMode === 'individual' && (
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-2">Free</h3>
                            <div className="text-4xl font-bold text-white mb-1">$0</div>
                            <p className="text-gray-400 mb-6">Forever free</p>

                            <ul className="space-y-3 mb-8">
                                {PRICING.free.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-300">
                                        <Check className="w-4 h-4 text-green-400" />
                                        {f}
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 text-gray-500">
                                    <X className="w-4 h-4 text-red-400" />
                                    Version Control
                                </li>
                                <li className="flex items-center gap-2 text-gray-500">
                                    <X className="w-4 h-4 text-red-400" />
                                    Table Designer
                                </li>
                            </ul>

                            <button
                                disabled
                                className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                            >
                                Current Plan
                            </button>
                            <button
                                onClick={() => handleUpgrade('pro_trial')}
                                disabled={systemIsPro || loading}
                                className="w-full py-2 mt-2 text-sm text-purple-400 hover:text-purple-300 transition disabled:opacity-50"
                            >
                                {loading ? 'Activating...' : '🎁 Start 1 Month Free Trial'}
                            </button>
                        </div>
                    )}

                    {viewMode === 'enterprise' && (
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-2">Pro Team</h3>
                            <div className="text-4xl font-bold text-white mb-1">$49</div>
                            <p className="text-gray-400 mb-6">per user/month</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-green-400" /> Everything in Pro</li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-green-400" /> Team Collaboration</li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-green-400" /> Centralized Billing</li>
                            </ul>
                            <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition">Contact Sales</button>
                        </div>
                    )}

                    {/* Pro/Enterprise Monthly */}
                    <div className={`bg-gradient-to-b ${viewMode === 'individual' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/50' : 'from-indigo-500/20 to-blue-500/20 border-indigo-500/50'} backdrop-blur-lg rounded-2xl p-8 border-2 relative`}>
                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${viewMode === 'individual' ? 'bg-purple-500' : 'bg-indigo-500'} text-white text-xs font-bold rounded-full`}>
                            POPULAR
                        </div>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white">{viewMode === 'individual' ? 'Pro Monthly' : 'Enterprise Monthly'}</h3>
                            {/* Coupon only for Individual Pro for now, or Enterprise if we want */}
                            {viewMode === 'individual' && (
                                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-500/40 animate-pulse">
                                    Code: bosdb100 (100% OFF)
                                </div>
                            )}
                        </div>
                        <div className="text-4xl font-bold text-white mb-1">${viewMode === 'individual' ? '29' : '49'}</div>
                        <p className="text-gray-400 mb-6">per {viewMode === 'individual' ? 'month' : 'org/month'}</p>

                        <ul className="space-y-3 mb-8">
                            {(viewMode === 'individual' ? PRICING.pro_monthly.features : (PRICING as any).enterprise_monthly.features).map((f: string, i: number) => (
                                <li key={i} className="flex items-center gap-2 text-gray-200">
                                    <Check className={`w-4 h-4 ${viewMode === 'individual' ? 'text-purple-400' : 'text-indigo-400'}`} />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(viewMode === 'individual' ? 'pro_monthly' : 'enterprise_monthly')}
                            disabled={planType === 'monthly' || planType === 'yearly'} // Simplified check
                            className={`w-full py-3 bg-gradient-to-r ${viewMode === 'individual' ? 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'} text-white font-semibold rounded-lg transition disabled:opacity-50`}
                        >
                            {(planType === 'monthly' && viewMode === 'individual') ? 'Current Plan' : 'Upgrade Now'}
                        </button>
                    </div>

                    {/* Pro/Enterprise Yearly */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white">{viewMode === 'individual' ? 'Pro Yearly' : 'Enterprise Yearly'}</h3>
                            {viewMode === 'individual' && (
                                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-500/40 animate-pulse">
                                    Code: omnigang100 (100% OFF)
                                </div>
                            )}
                        </div>
                        <div className="text-4xl font-bold text-white mb-1">${viewMode === 'individual' ? '249' : '499'}</div>
                        <p className="text-gray-400 mb-1">per year</p>
                        <p className="text-green-400 text-sm mb-6">Save {viewMode === 'individual' ? '29%' : '16%'} (2 months free!)</p>

                        <ul className="space-y-3 mb-8">
                            {(viewMode === 'individual' ? PRICING.pro_yearly.features : (PRICING as any).enterprise_yearly.features).map((f: string, i: number) => (
                                <li key={i} className="flex items-center gap-2 text-gray-300">
                                    <Check className="w-4 h-4 text-green-400" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(viewMode === 'individual' ? 'pro_yearly' : 'enterprise_yearly')}
                            disabled={planType === 'yearly'}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition disabled:opacity-50"
                        >
                            {planType === 'yearly' && (viewMode === 'individual' || viewMode === 'enterprise') ? 'Current Plan' : 'Upgrade Now'}
                        </button>
                    </div>
                </div>

                {/* Feature Comparison */}
                <div className="max-w-6xl mx-auto">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">Feature Comparison</h3>
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-gray-400">Feature</th>
                                    <th className="px-6 py-4 text-center text-gray-400">Free</th>
                                    <th className="px-6 py-4 text-center text-purple-400">Pro</th>
                                    <th className="px-6 py-4 text-center text-indigo-400">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr><td className="px-6 py-3 text-gray-300">Database Connections</td><td className="px-6 py-3 text-center text-gray-400">2</td><td className="px-6 py-3 text-center text-white">Unlimited</td><td className="px-6 py-3 text-center text-white">Unlimited</td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Query History</td><td className="px-6 py-3 text-center text-gray-400">50</td><td className="px-6 py-3 text-center text-white">Unlimited</td><td className="px-6 py-3 text-center text-white">Unlimited</td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Version Control</td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Table Designer</td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Data Grid Editing</td><td className="px-6 py-3 text-center text-gray-400">Read-only</td><td className="px-6 py-3 text-center text-white">Full Edit</td><td className="px-6 py-3 text-center text-white">Full Edit</td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Granular Permissions</td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">SSO / SAML</td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Audit Logs</td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><X className="w-4 h-4 text-red-400 mx-auto" /></td><td className="px-6 py-3 text-center"><Check className="w-4 h-4 text-green-400 mx-auto" /></td></tr>
                                <tr><td className="px-6 py-3 text-gray-300">Support Level</td><td className="px-6 py-3 text-center text-gray-400">Community</td><td className="px-6 py-3 text-center text-white">Priority</td><td className="px-6 py-3 text-center text-indigo-400 font-bold">Dedicated</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showPayment && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl">
                        {isPaid ? (
                            <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
                                <p className="text-gray-400 mb-8">
                                    Welcome to BosDB Pro. Your organization has been upgraded.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Redirecting to dashboard...
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                {/* Stripe-style Header */}
                                <div className="p-8 pb-0 flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                                            <Zap className="w-5 h-5 text-white" fill="currentColor" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upgrade to Pro</p>
                                            <h1 className="text-2xl font-bold text-white">Checkout</h1>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPayment(false)}
                                        disabled={loading}
                                        className="text-gray-500 hover:text-white transition p-1"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid md:grid-cols-[2fr_3fr] gap-0">
                                    {/* Order Summary */}
                                    <div className="p-8 bg-black/20 border-r border-white/5">
                                        <div className="mb-8">
                                            <h1 className="text-sm font-bold text-gray-400 uppercase mb-4">You're paying</h1>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold text-white">
                                                    ${calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon)}
                                                </span>
                                                <span className="text-gray-400 text-sm">
                                                    USD / {selectedPlan.includes('monthly') ? 'month' : 'year'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {selectedPlan.includes('monthly') ? 'Cancel anytime. Features activate immediately.' : 'Billed annually. Best value.'}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">{selectedPlan.includes('enterprise') ? 'Enterprise' : 'Pro'} Subscription</span>
                                                <span className="text-white">${(PRICING as any)[selectedPlan].price.toFixed(2)}</span>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-sm text-green-400">
                                                    <span>Coupon ({appliedCoupon})</span>
                                                    <span>-${((PRICING as any)[selectedPlan].price * discount / 100).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="h-px bg-white/5 my-4" />
                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-white">Total due</span>
                                                <span className="text-white">${calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon)}.00</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Form */}
                                    <div className="p-8 bg-[#1c1c1c] h-full overflow-y-auto max-h-[600px]">
                                        {/* Coupon Section */}
                                        <div className="mb-8">
                                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Promotion Code</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={coupon}
                                                        onChange={(e) => setCoupon(e.target.value)}
                                                        placeholder="Enter code"
                                                        className="w-full px-4 py-2.5 bg-[#2a2a2a] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                    />
                                                    {appliedCoupon && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={!coupon || loading}
                                                    className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            {/* Suggest "free thing" coupon */}
                                            {!appliedCoupon && (
                                                <div className="mt-2 text-xs text-purple-400">
                                                    <p className="font-bold animate-pulse">🔥 Crazy Free Limited Time Offer!</p>
                                                    <button
                                                        onClick={() => setCoupon(selectedPlan.includes('yearly') ? 'omnigang100' : 'bosdb100')}
                                                        className="hover:text-purple-300 underline mt-1"
                                                    >
                                                        Use <strong>{selectedPlan.includes('yearly') ? 'omnigang100' : 'bosdb100'}</strong> for 100% OFF!
                                                    </button>
                                                </div>
                                            )}
                                            {error && error.includes('coupon') && (
                                                <p className="text-red-400 text-[10px] mt-1">{error}</p>
                                            )}
                                        </div>

                                        {/* STRIPE OR CARD SECTION */}
                                        {clientSecret && stripePromise ? (
                                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                                                <StripeCheckout
                                                    plan={selectedPlan}
                                                    amount={calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon)}
                                                    onSuccess={async (paymentId) => {
                                                        // Confirm with API
                                                        setPaymentProcessing(true);
                                                        try {
                                                            const res = await fetch('/api/subscription', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    action: 'confirm_payment',
                                                                    paymentIntentId: paymentId,
                                                                    plan: selectedPlan,
                                                                    orgId: user?.organizationId
                                                                })
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                setIsPaid(true);
                                                                setTimeout(() => { router.push('/dashboard'); }, 2000);
                                                            } else {
                                                                setError(data.error || 'Confirmation failed');
                                                            }
                                                        } catch (e) {
                                                            setError('Failed to confirm payment');
                                                        } finally {
                                                            setPaymentProcessing(false);
                                                        }
                                                    }}
                                                    onError={(err) => setError(err)}
                                                />
                                            </Elements>
                                        ) : (
                                            <>
                                                {/* Card Section */}
                                                <div className="mb-8">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase">Card Information</label>
                                                        <div className="flex gap-1">
                                                            <div className="w-6 h-4 bg-gray-800 rounded-sm" />
                                                            <div className="w-6 h-4 bg-gray-800 rounded-sm" />
                                                            <div className="w-6 h-4 bg-gray-800 rounded-sm" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-0 border border-white/10 rounded-xl overflow-hidden shadow-inner bg-[#2a2a2a]">
                                                        <div className="relative">
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                                <CreditCard className="w-4 h-4" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={cardNumber}
                                                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                                placeholder="1234 5678 9123 0000"
                                                                maxLength={19}
                                                                disabled={calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon) === 0 || loading}
                                                                className="w-full pl-11 pr-4 py-3 bg-transparent border-b border-white/5 text-sm text-white focus:bg-white/[0.02] outline-none transition disabled:opacity-50"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2">
                                                            <input
                                                                type="text"
                                                                value={expiry}
                                                                onChange={(e) => setExpiry(e.target.value)}
                                                                placeholder="MM / YY"
                                                                maxLength={5}
                                                                disabled={calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon) === 0 || loading}
                                                                className="w-full px-4 py-3 bg-transparent border-r border-white/5 text-sm text-white focus:bg-white/[0.02] outline-none transition disabled:opacity-50"
                                                            />
                                                            <div className="relative">
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                                                                    <Lock className="w-3 h-3" />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={cvv}
                                                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                                                    placeholder="CVC"
                                                                    maxLength={3}
                                                                    disabled={calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon) === 0 || loading}
                                                                    className="w-full px-4 py-3 bg-transparent text-sm text-white focus:bg-white/[0.02] outline-none transition disabled:opacity-50"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {error && !error.includes('coupon') && (
                                                        <p className="text-red-400 text-[10px] mt-2 flex items-center gap-1">
                                                            <X className="w-3 h-3" /> {error}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={handlePayment}
                                                    disabled={loading}
                                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            {calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon) === 0 ? (
                                                                <>Activate Pro Free <Star className="w-4 h-4 fill-white animate-pulse" /></>
                                                            ) : (
                                                                <>Pay ${calculateDiscountedPrice((PRICING as any)[selectedPlan].price, appliedCoupon)} <Zap className="w-4 h-4 group-hover:scale-110 transition" /></>
                                                            )}
                                                        </>
                                                    )}
                                                </button>

                                                <div className="mt-6 flex items-center justify-center gap-2 grayscale opacity-50">
                                                    <Landmark className="w-3 h-3 text-gray-400" />
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Powered by Stripe</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

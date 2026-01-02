
'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, Lock, Shield } from 'lucide-react';

interface StripeCheckoutProps {
    plan?: string;
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

export default function StripeCheckout({ amount, onSuccess, onError }: StripeCheckoutProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/dashboard', // Fallback, we handle success manually usually
            },
            redirect: 'if_required', // Avoid redirect if possible
        });

        if (error) {
            setMessage(error.message || 'Payment failed');
            onError(error.message || 'Payment failed');
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent.id);
        } else {
            setMessage('Unexpected state');
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#2a2a2a] p-4 rounded-xl border border-white/10">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                    }}
                />
            </div>

            {message && <div className="text-red-400 text-sm">{message}</div>}

            <button
                disabled={isLoading || !stripe || !elements}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Lock className="w-4 h-4" />
                        Pay ${amount}
                    </>
                )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>Secure Payment via Stripe</span>
            </div>
        </form>
    );
}

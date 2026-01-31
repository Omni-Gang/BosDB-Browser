
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is missing. Stripe integration will not work.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover' as any, // Use expected API version
    typescript: true,
});

// Helper to get or create a Customer for an Organization
export async function getOrCreateCustomer(orgId: string, email: string, name: string) {
    if (!process.env.STRIPE_SECRET_KEY) return null;

    try {
        // Simple search by query (metadata or email) - for production, cache this ID in your Organization model
        const existingUsers = await stripe.customers.search({
            query: `metadata['orgId']:'${orgId}'`,
            limit: 1
        });

        if (existingUsers.data.length > 0) {
            return existingUsers.data[0];
        }

        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                orgId
            }
        });

        return customer;
    } catch (err) {
        console.error('Error in getOrCreateCustomer:', err);
        throw err;
    }
}

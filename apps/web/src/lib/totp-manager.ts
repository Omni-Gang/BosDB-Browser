
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Temporary store for TOTP secrets during registration flow
// In a real production app with multiple instances, use Redis
// Key: email -> { secret, organizationId, userData, timestamp }
const pendingTOTPRegistrations = new Map<string, {
    secret: string;
    organizationId: string;
    userData: any;
    timestamp: number;
}>();

export function generateTOTP(email: string, orgName: string, orgId: string, userData: any) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, `BosDB (${orgName})`, secret);

    // Store pending registration
    pendingTOTPRegistrations.set(email, {
        secret,
        organizationId: orgId,
        userData,
        timestamp: Date.now()
    });

    return { secret, otpauth };
}

export async function generateQRCode(otpauth: string): Promise<string> {
    return await QRCode.toDataURL(otpauth);
}

export function verifyTOTP(token: string, email: string) {
    const record = pendingTOTPRegistrations.get(email);

    if (!record) {
        return { valid: false, error: 'Registration session expired or invalid.' };
    }

    // Check expiration (e.g., 10 minutes for the registration session)
    if (Date.now() - record.timestamp > 10 * 60 * 1000) {
        pendingTOTPRegistrations.delete(email);
        return { valid: false, error: 'Registration session expired.' };
    }

    try {
        const isValid = authenticator.verify({ token, secret: record.secret });
        if (!isValid) {
            return { valid: false, error: 'Invalid code. Please try again.' };
        }

        // Verification successful
        // Clean up
        pendingTOTPRegistrations.delete(email);

        return {
            valid: true,
            userData: record.userData,
            organizationId: record.organizationId,
            secret: record.secret // Return secret if you want to store it for future 2FA
        };
    } catch (err) {
        return { valid: false, error: 'verification failed' };
    }
}

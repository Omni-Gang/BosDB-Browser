/**
 * OTP Manager for First User Verification
 * Prevents organization domain squatting by verifying email ownership
 */

interface OTPRecord {
    email: string;
    otp: string;
    organizationId: string;
    userData: any;
    createdAt: Date;
    expiresAt: Date;
    attempts: number;
}

// In-memory storage (for production, use Redis or database)
const otpStore = new Map<string, OTPRecord>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
    const now = new Date();
    for (const [email, record] of otpStore.entries()) {
        if (record.expiresAt < now) {
            otpStore.delete(email);
        }
    }
}, 5 * 60 * 1000);

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP for first user verification
 */
export function createOTP(email: string, organizationId: string, userData: any): string {
    const otp = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    const record: OTPRecord = {
        email,
        otp,
        organizationId,
        userData,
        createdAt: now,
        expiresAt,
        attempts: 0,
    };

    otpStore.set(email, record);

    console.log(`[OTP] Generated for ${email}: ${otp} (expires in 10 minutes)`);

    return otp;
}

/**
 * Verify OTP
 */
export function verifyOTP(email: string, otp: string): {
    valid: boolean;
    userData?: any;
    organizationId?: string;
    error?: string;
} {
    const record = otpStore.get(email);

    if (!record) {
        return { valid: false, error: 'No OTP found. Please request a new one.' };
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
        otpStore.delete(email);
        return { valid: false, error: 'OTP expired. Please request a new one.' };
    }

    // Check attempts (max 5)
    if (record.attempts >= 5) {
        otpStore.delete(email);
        return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP
    if (record.otp !== otp) {
        record.attempts++;
        return { valid: false, error: `Invalid OTP. ${5 - record.attempts} attempts remaining.` };
    }

    // Valid OTP - clean up and return user data
    const { userData, organizationId } = record;
    otpStore.delete(email);

    return {
        valid: true,
        userData,
        organizationId
    };
}

/**
 * Get OTP for display (testing only - remove in production)
 */
export function getOTPForDisplay(email: string): string | null {
    const record = otpStore.get(email);
    return record ? record.otp : null;
}

/**
 * Resend OTP (regenerate with same data)
 */
export function resendOTP(email: string): string | null {
    const record = otpStore.get(email);

    if (!record) {
        return null;
    }

    // Generate new OTP with same user data
    return createOTP(email, record.organizationId, record.userData);
}

/**
 * Cancel OTP verification
 */
export function cancelOTP(email: string): void {
    otpStore.delete(email);
}

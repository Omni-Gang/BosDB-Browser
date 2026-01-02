# OTP Verification for First User - Documentation

## Overview
Added OTP (One-Time Password) verification for the **first user** of new enterprise organizations to prevent **domain squatting attacks**.

## Security Problem Solved
**Without OTP**: Someone could register as `fake.user@amazon.com` and claim the entire Amazon organization before real Amazon employees join.

**With OTP**: The first person to register with an enterprise email domain must verify email ownership through OTP before becoming admin.

## How It Works

### 1. Registration Flow for First User (New Enterprise Org)

When a user registers with a company email (e.g., `john@company.com`) and creates a **new organization**:

1. **Backend generates OTP**: 6-digit code stored in memory
2. **OTP displayed on screen**: For testing (later can send via email)
3. **User enters OTP**: Frontend verification screen
4. **Account activated**: User becomes Admin after successful verification

### 2. Registration Flow for Subsequent Users (Existing Org)

When additional users join an existing organization:
- **No OTP required** (org already claimed)
- Account goes to **pending** status
- Requires **admin approval**

### 3. Individual Account Registration

Personal accounts (gmail, yahoo, etc.):
- **No OTP required**
- **Instant approval** as admin

## Files Modified

### Backend
1. **`src/lib/otp-manager.ts`** - NEW
   - OTP generation (6-digit random)
   - In-memory storage with expiration
   - Verification with attempt limiting (max 5)
   - Auto-cleanup of expired OTPs

2. **`src/app/api/auth/route.ts`** - UPDATED
   - Added `verify_otp` action
   - Modified registration flow to check if org is new
   - Returns `requiresOTP: true` for first enterprise user
   - Displays OTP in response (testing mode)

### Frontend
3. **`src/app/login/page.tsx`** - UPDATED
   - Added OTP verification UI state
   - New screen: "🔐 Verify Your Email"
   - Displays OTP prominently for testing
   - Auto-login after successful verification
   - Redirects to dashboard after 2 seconds

## OTP Features

### Security
- ✅ **Expiration**: 10 minutes validity
- ✅ **Attempt Limiting**: Max 5 attempts before OTP is invalidated
- ✅ **One-time use**: OTP deleted after successful verification
- ✅ **Email-bound**: OTP tied to specific email address

### Testing Mode
- 🔑 **OTP displayed on screen** in blue box
- Shows email and expiration info
- Remove `otp` field from API response in production

### User Experience
```
1. User fills registration form
2. Clicks "Create User"
3. Sees OTP verification screen with:
   - Organization name they're claiming
   - OTP code displayed (testing)
   - Input field for OTP entry
4. Enters OTP
5. Clicks "Verify & Become Admin"
6. Auto-logged in and redirected to dashboard
```

## API Endpoints

### POST `/api/auth` - Register
**Request:**
```json
{
  "action": "register",
  "id": "john",
  "name": "John Doe",
  "email": "john@newcompany.com",
  "password": "SecurePass123",
  "accountType": "enterprise"
}
```

**Response (if OTP required):**
```json
{
  "requiresOTP": true,
  "email": "john@newcompany.com",
  "organizationName": "newcompany.com",
  "otp": "123456",
  "message": "Verification required..."
}
```

### POST `/api/auth` - Verify OTP
**Request:**
```json
{
  "action": "verify_otp",
  "email": "john@newcompany.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "organization": { ... },
  "message": "Organization created. You are the Admin."
}
```

## Server Logs
```
[OTP] Generated for john@newcompany.com: 123456 (expires in 10 minutes)
[Auth] OTP required for first user of org "newcompany.com"
[Auth] OTP verified! User john@newcompany.com is now Admin of "newcompany.com"
```

## Production Deployment

### Remove Testing Display
In production, remove the OTP from API response:
```typescript
// src/app/api/auth/route.ts
return NextResponse.json({
    requiresOTP: true,
    email: userData.email,
    organizationName: org.name,
    // otp: otp, // REMOVE THIS LINE
    message: `Verification code sent to ${userData.email}`
});
```

### Add Email Integration
Replace the OTP display with email sending:
```typescript
import { sendOTPEmail } from '@/lib/email-service';

const otp = createOTP(userData.email, org.id, newUserData);
await sendOTPEmail(userData.email, otp, org.name);
```

## Benefits

✅ **Prevents Domain Squatting**: Malicious users can't claim organizations  
✅ **Email Verification**: Proves email ownership  
✅ **Security Layer**: Additional protection for admin account creation  
✅ **User-friendly**: Simple 6-digit code, clear UI  
✅ **Testable**: OTP visible on screen during development  

## Future Enhancements

1. **Email Integration**: Send OTP via email (SendGrid, AWS SES, etc.)
2. **SMS Option**: Phone number verification as alternative
3. **Resend OTP**: Add resend button with cooldown timer
4. **Rate Limiting**: Prevent spam registration attempts
5. **Database Storage**: Move from in-memory to Redis for persistence
6. **2FA Option**: Allow users to enable 2FA after account creation

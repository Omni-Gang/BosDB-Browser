'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function RolesPage() {
    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-6">
                <Link href="/docs" className="no-underline text-muted-foreground hover:text-primary text-sm flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                </Link>
            </div>

            <article className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight 
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:text-foreground
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                prose-p:text-muted-foreground prose-p:leading-7
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-border
                prose-img:rounded-lg prose-img:border prose-img:border-border prose-img:shadow-md
                prose-table:border-collapse prose-table:w-full prose-th:text-left prose-th:p-2 prose-td:p-2 prose-tr:border-b prose-tr:border-border
            ">
                <h1>OTP Verification for First User - Documentation</h1>

                <h2>Overview</h2>
                <p>Added OTP (One-Time Password) verification for the <strong>first user</strong> of new enterprise organizations to prevent <strong>domain squatting attacks</strong>.</p>

                <h2>Security Problem Solved</h2>
                <p><strong>Without OTP</strong>: Someone could register as <code>fake.user@amazon.com</code> and claim the entire Amazon organization before real Amazon employees join.</p>
                <p><strong>With OTP</strong>: The first person to register with an enterprise email domain must verify email ownership through OTP before becoming admin.</p>

                <h2>How It Works</h2>

                <h3>1. Registration Flow for First User (New Enterprise Org)</h3>
                <p>When a user registers with a company email (e.g., <code>john@company.com</code>) and creates a <strong>new organization</strong>:</p>
                <ol>
                    <li><strong>Backend generates OTP</strong>: 6-digit code stored in memory</li>
                    <li><strong>OTP displayed on screen</strong>: For testing (later can send via email)</li>
                    <li><strong>User enters OTP</strong>: Frontend verification screen</li>
                    <li><strong>Account activated</strong>: User becomes Admin after successful verification</li>
                </ol>

                <h3>2. Registration Flow for Subsequent Users (Existing Org)</h3>
                <p>When additional users join an existing organization:</p>
                <ul>
                    <li><strong>No OTP required</strong> (org already claimed)</li>
                    <li>Account goes to <strong>pending</strong> status</li>
                    <li>Requires <strong>admin approval</strong></li>
                </ul>

                <h3>3. Individual Account Registration</h3>
                <p>Personal accounts (gmail, yahoo, etc.):</p>
                <ul>
                    <li><strong>No OTP required</strong></li>
                    <li><strong>Instant approval</strong> as admin</li>
                </ul>

                <h2>Files Modified</h2>

                <h3>Backend</h3>
                <ol>
                    <li><strong><code>src/lib/otp-manager.ts</code></strong> - NEW
                        <ul>
                            <li>OTP generation (6-digit random)</li>
                            <li>In-memory storage with expiration</li>
                            <li>Verification with attempt limiting (max 5)</li>
                            <li>Auto-cleanup of expired OTPs</li>
                        </ul>
                    </li>
                    <li><strong><code>src/app/api/auth/route.ts</code></strong> - UPDATED
                        <ul>
                            <li>Added <code>verify_otp</code> action</li>
                            <li>Modified registration flow to check if org is new</li>
                            <li>Returns <code>requiresOTP: true</code> for first enterprise user</li>
                            <li>Displays OTP in response (testing mode)</li>
                        </ul>
                    </li>
                </ol>

                <h3>Frontend</h3>
                <ol start={3}>
                    <li><strong><code>src/app/login/page.tsx</code></strong> - UPDATED
                        <ul>
                            <li>Added OTP verification UI state</li>
                            <li>New screen: &quot;🔐 Verify Your Email&quot;</li>
                            <li>Displays OTP prominently for testing</li>
                            <li>Auto-login after successful verification</li>
                            <li>Redirects to dashboard after 2 seconds</li>
                        </ul>
                    </li>
                </ol>

                <h2>OTP Features</h2>

                <h3>Security</h3>
                <ul>
                    <li>✅ <strong>Expiration</strong>: 10 minutes validity</li>
                    <li>✅ <strong>Attempt Limiting</strong>: Max 5 attempts before OTP is invalidated</li>
                    <li>✅ <strong>One-time use</strong>: OTP deleted after successful verification</li>
                    <li>✅ <strong>Email-bound</strong>: OTP tied to specific email address</li>
                </ul>

                <h3>Testing Mode</h3>
                <ul>
                    <li>🔑 <strong>OTP displayed on screen</strong> in blue box</li>
                    <li>Shows email and expiration info</li>
                    <li>Remove <code>otp</code> field from API response in production</li>
                </ul>

                <h3>User Experience</h3>
                <CodeBlock language="text" code={`1. User fills registration form
2. Clicks "Create User"
3. Sees OTP verification screen with:
   - Organization name they're claiming
   - OTP code displayed (testing)
   - Input field for OTP entry
4. Enters OTP
5. Clicks "Verify & Become Admin"
6. Auto-logged in and redirected to dashboard`} />

                <h2>API Endpoints</h2>

                <h3>POST <code>/api/auth</code> - Register</h3>
                <p><strong>Request:</strong></p>
                <CodeBlock language="json" code={`{
  "action": "register",
  "id": "john",
  "name": "John Doe",
  "email": "john@newcompany.com",
  "password": "SecurePass123",
  "accountType": "enterprise"
}`} />

                <p><strong>Response (if OTP required):</strong></p>
                <CodeBlock language="json" code={`{
  "requiresOTP": true,
  "email": "john@newcompany.com",
  "organizationName": "newcompany.com",
  "otp": "123456",
  "message": "Verification required..."
}`} />

                <h3>POST <code>/api/auth</code> - Verify OTP</h3>
                <p><strong>Request:</strong></p>
                <CodeBlock language="json" code={`{
  "action": "verify_otp",
  "email": "john@newcompany.com",
  "otp": "123456"
}`} />

                <p><strong>Response:</strong></p>
                <CodeBlock language="json" code={`{
  "success": true,
  "user": { ... },
  "organization": { ... },
  "message": "Organization created. You are the Admin."
}`} />

                <h2>Server Logs</h2>
                <CodeBlock language="text" code={`[OTP] Generated for john@newcompany.com: 123456 (expires in 10 minutes)
[Auth] OTP required for first user of org "newcompany.com"
[Auth] OTP verified! User john@newcompany.com is now Admin of "newcompany.com"`} />

                <h2>Production Deployment</h2>

                <h3>Remove Testing Display</h3>
                <p>In production, remove the OTP from API response:</p>
                <CodeBlock language="typescript" code={`// src/app/api/auth/route.ts
return NextResponse.json({
    requiresOTP: true,
    email: userData.email,
    organizationName: org.name,
    // otp: otp, // REMOVE THIS LINE
    message: \`Verification code sent to \${userData.email}\`
});`} />

                <h3>Add Email Integration</h3>
                <p>Replace the OTP display with email sending:</p>
                <CodeBlock language="typescript" code={`import { sendOTPEmail } from '@/lib/email-service';

const otp = createOTP(userData.email, org.id, newUserData);
await sendOTPEmail(userData.email, otp, org.name);`} />

                <h2>Benefits</h2>
                <ul>
                    <li>✅ <strong>Prevents Domain Squatting</strong>: Malicious users can&apos;t claim organizations</li>
                    <li>✅ <strong>Email Verification</strong>: Proves email ownership</li>
                    <li>✅ <strong>Security Layer</strong>: Additional protection for admin account creation</li>
                    <li>✅ <strong>User-friendly</strong>: Simple 6-digit code, clear UI</li>
                    <li>✅ <strong>Testable</strong>: OTP visible on screen during development</li>
                </ul>

                <h2>Future Enhancements</h2>
                <ol>
                    <li><strong>Email Integration</strong>: Send OTP via email (SendGrid, AWS SES, etc.)</li>
                    <li><strong>SMS Option</strong>: Phone number verification as alternative</li>
                    <li><strong>Resend OTP</strong>: Add resend button with cooldown timer</li>
                    <li><strong>Rate Limiting</strong>: Prevent spam registration attempts</li>
                    <li><strong>Database Storage</strong>: Move from in-memory to Redis for persistence</li>
                    <li><strong>2FA Option</strong>: Allow users to enable 2FA after account creation</li>
                </ol>
            </article>
        </div>
    );
}

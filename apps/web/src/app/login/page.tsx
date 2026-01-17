'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Mail, Lock, Building, User as UserIcon, AlertCircle, CheckCircle, Chrome } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State - Split Forms
  const [registerTab, setRegisterTab] = useState<'individual' | 'enterprise'>('individual');

  const [individualForm, setIndividualForm] = useState({
    name: '',
    email: '',
    password: '',
    id: '' // user id
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    password: '',
    id: '',
    role: 'user' as 'admin' | 'user' // Default requested role
  });

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  // TOTP State
  const [showTOTPVerify, setShowTOTPVerify] = useState(false);
  const [totpData, setTotpData] = useState<{ email: string; qrCode: string; secret: string; organizationName: string } | null>(null);
  const [totpInput, setTotpInput] = useState('');

  // UI State
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for Reset Token in URL
  useEffect(() => {
    const token = searchParams.get('resetToken');
    if (token) {
      setResetToken(token);
      setIsResetMode(true);
      setShowForgotPassword(true);
    }
  }, [searchParams]);

  // Common Blocked Domains
  const BLOCKED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'rediffmail.com'];

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const extractDomain = (email: string) => {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  };

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleLogin = async () => {
    clearMessages();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginEmail.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('bosdb_current_user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearMessages();
    setLoading(true);

    const isCompany = registerTab === 'enterprise';
    const formData = isCompany ? companyForm : individualForm;

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.id) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (isCompany) {
      const domain = extractDomain(formData.email);
      if (BLOCKED_DOMAINS.includes(domain)) {
        setError('Please use your company email (domain email) to register as company.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...formData,
          accountType: registerTab
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Check TOTP
      if (data.requiresTOTP) {
        setTotpData({
          email: data.email,
          qrCode: data.qrCode,
          secret: data.secret,
          organizationName: data.organizationName
        });
        setAuthMode('login'); // Hide register form
        setShowTOTPVerify(true);
        setSuccessMessage(data.message || 'Scan QR Code required');
        return;
      }

      setSuccessMessage(data.message || 'Registration successful! Please login.');
      setAuthMode('login'); // Switch to login view

      // Clear forms
      setIndividualForm({ name: '', email: '', password: '', id: '' });
      setCompanyForm({ name: '', email: '', password: '', id: '', role: 'user' });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    if (!forgotEmail) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forgot_password',
          email: forgotEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
      } else {
        setError(data.error || 'Request failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          token: resetToken,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Password reset successful! Please login.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setIsResetMode(false);
          setResetToken('');
        }, 2000);
      } else {
        setError(data.error || 'Reset failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google_login',
          idToken: credentialResponse.credential,
          userType: 'individual' // Strictly forced
        })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requiresRegistration) {
          // This case handles a new user who signed in via Google
          // We might want to auto-login them if the bankend created the user.
          // However, trusting the endpoint response:
          if (data.success && data.user) {
            localStorage.setItem('bosdb_current_user', JSON.stringify(data.user));
            router.push('/dashboard');
          } else {
            // Fallback if backend asks for more info, but current backend creates user automatically.
            // If we get here without user data, something is odd.
            setError('Login successful but no user data returned.');
          }
        } else {
          // Success login
          localStorage.setItem('bosdb_current_user', JSON.stringify(data.user));
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Google Login failed');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    // ... (Same as before, reusing logic)
    setError('');
    if (!totpInput || totpInput.length !== 6) { setError('Invalid code'); return; }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_totp',
          email: totpData?.email,
          token: totpInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMessage('Verification successful!');
      localStorage.setItem('bosdb_current_user', JSON.stringify(data.user));
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6 text-white font-sans">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">🗄️ BosDB</h1>
          <p className="text-gray-400">Database Version Control System</p>
        </div>

        {/* --- NOTIFICATIONS --- */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg flex items-start gap-3 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 text-green-200 rounded-lg flex items-start gap-3 text-sm animate-fadeIn">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* --- MAIN CARD --- */}
        <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl overflow-hidden">

          {showTOTPVerify ? (
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-4">🔐 2FA Verification</h2>
              <p className="text-gray-400 text-sm mb-6">Scan QR code for <span className="text-purple-400">{totpData?.organizationName}</span></p>

              {totpData && <div className="bg-white p-2 rounded-lg inline-block mb-6"><img src={totpData.qrCode} className="w-40 h-40" /></div>}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="000000"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-center text-2xl tracking-widest text-white focus:border-purple-500 outline-none"
                  maxLength={6}
                  value={totpInput}
                  onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button onClick={handleVerifyTOTP} className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition">Verify</button>
              <button onClick={() => setShowTOTPVerify(false)} className="w-full mt-3 text-gray-400 hover:text-white text-sm">Cancel</button>
            </div>
          ) : showForgotPassword ? (
            /* --- FORGOT PASSWORD MODAL CONTENT --- */
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2">
                {isResetMode ? 'Reset Password' : 'Forgot Password'}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {isResetMode ? 'Enter your new password below.' : 'Enter your email to receive a reset link.'}
              </p>

              {isResetMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
                    <input
                      type="password"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New secure password"
                    />
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Set New Password'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              )}

              <button onClick={() => { setShowForgotPassword(false); setIsResetMode(false); }} className="w-full mt-4 text-gray-400 hover:text-white text-sm">
                Back to Login
              </button>
            </div>
          ) : (
            /* --- LOGIN / REGISTER TABS --- */
            <div>
              {/* Tab Switcher */}
              <div className="flex border-b border-gray-700">
                <button
                  className={`flex-1 py-4 text-sm font-medium transition ${authMode === 'login' ? 'text-white border-b-2 border-purple-500 bg-gray-800' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  className={`flex-1 py-4 text-sm font-medium transition ${authMode === 'signup' ? 'text-white border-b-2 border-purple-500 bg-gray-800' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setAuthMode('signup')}
                >
                  Register
                </button>
              </div>

              <div className="p-8">
                {authMode === 'login' ? (
                  /* --- LOGIN FORM --- */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                        <input
                          type="email"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-3 text-white focus:border-purple-500 outline-none transition"
                          placeholder="admin@company.com"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                        <input
                          type="password"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-3 text-white focus:border-purple-500 outline-none transition"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                      </div>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-purple-900/20 disabled:opacity-50"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    {/* Demo Hints */}
                    <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                      <p className="text-xs text-gray-500 mb-2">Demo Credentials:</p>
                      <div className="text-xs text-gray-400 font-mono space-y-1">
                        <p>demo@gmail.com / Demo123!</p>
                        <p>demo@company.com / Demo123!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- REGISTER FORM --- */
                  <div className="space-y-5">
                    {/* Type Selector */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => setRegisterTab('individual')}
                        className={`p-3 rounded-lg border text-left transition ${registerTab === 'individual' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <UserIcon className="w-4 h-4" />
                          <span className="font-semibold text-sm">Individual</span>
                        </div>
                        <div className="text-[10px] opacity-70">For personal projects</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegisterTab('enterprise')}
                        className={`p-3 rounded-lg border text-left transition ${registerTab === 'enterprise' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4" />
                          <span className="font-semibold text-sm">Company</span>
                        </div>
                        <div className="text-[10px] opacity-70">For teams & organizations</div>
                      </button>
                    </div>

                    {/* Dynamic Form Fields based on Tab */}
                    {registerTab === 'individual' ? (
                      <div className="space-y-3 animate-fadeIn">
                        <input
                          type="text"
                          placeholder="User ID (e.g. john_doe)"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={individualForm.id}
                          onChange={e => setIndividualForm({ ...individualForm, id: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={individualForm.name}
                          onChange={e => setIndividualForm({ ...individualForm, name: e.target.value })}
                        />
                        <input
                          type="email"
                          placeholder="Email Address"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={individualForm.email}
                          onChange={e => setIndividualForm({ ...individualForm, email: e.target.value })}
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={individualForm.password}
                          onChange={e => setIndividualForm({ ...individualForm, password: e.target.value })}
                        />

                        <div className="my-4 border-t border-gray-700"></div>

                        {/* Google Login - ONLY FOR INDIVIDUAL */}
                        <div className="w-full flex justify-center">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            theme="filled_black"
                            shape="rect"
                            size="large"
                            width="350"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-xs text-yellow-200 mb-2">
                          ℹ️ Company registration requires a business email domain.
                        </div>
                        <input
                          type="text"
                          placeholder="User ID"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={companyForm.id}
                          onChange={e => setCompanyForm({ ...companyForm, id: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={companyForm.name}
                          onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                        />
                        <input
                          type="email"
                          placeholder="Work Email (e.g. name@company.com)"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={companyForm.email}
                          onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                          value={companyForm.password}
                          onChange={e => setCompanyForm({ ...companyForm, password: e.target.value })}
                        />
                        {/* Google Login Hidden for Company */}
                      </div>
                    )}

                    <button
                      onClick={handleRegister}
                      disabled={loading}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-green-900/20 disabled:opacity-50"
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}




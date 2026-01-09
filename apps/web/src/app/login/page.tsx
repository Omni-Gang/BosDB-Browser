'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { login, getAllUsers, initializeDefaultUsers, registerUser } from '@/lib/auth';

// Define User type locally to resolve lint error or import it if exported
// Assuming User type is compatible with what getAllUsers returns
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showTOTPVerify, setShowTOTPVerify] = useState(false);
  const [totpData, setTotpData] = useState<{ email: string; qrCode: string; secret: string; organizationName: string } | null>(null);
  const [totpInput, setTotpInput] = useState('');
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    accountType: 'enterprise' as 'individual' | 'enterprise'
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch users from server on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();

          // No need to deduplicate - email is globally unique
          setUsers(data.users || []);

          // If no users exist on server, create default admin via API
          if (data.users && data.users.length === 0) {
            await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'register',
                id: 'admin',
                name: 'Administrator',
                email: 'admin@bosdb.com',
                password: 'Admin@123',
                role: 'admin',
                // Status handled by API logic for first user
              })
            });
            // Refresh
            const retry = await fetch('/api/auth');
            const retryData = await retry.json();
            // No need to deduplicate - email is globally unique
            setUsers(retryData.users || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async () => {
    setError('');

    if (!userId.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: userId.trim(), // Using email for login
          password: password
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
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...newUser
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Check if TOTP verification is required
      if (data.requiresTOTP) {
        setTotpData({
          email: data.email,
          qrCode: data.qrCode,
          secret: data.secret,
          organizationName: data.organizationName
        });
        setShowRegister(false);
        setShowTOTPVerify(true);
        setSuccessMessage(data.message || 'Scan QR Code required');
        return;
      }

      // Show the message from API response (first user or pending approval)
      setSuccessMessage(data.message || 'Registration successful!');

      // Clear form
      setShowRegister(false);
      setNewUser({ id: '', name: '', email: '', password: '', role: 'user', accountType: 'enterprise' });

      // Refresh list
      const listRes = await fetch('/api/auth');
      const listData = await listRes.json();
      setUsers(listData.users || []);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerifyTOTP = async () => {
    setError('');
    setSuccessMessage('');

    if (!totpInput.trim() || totpInput.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

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

      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      // Success! User is now admin
      setSuccessMessage(data.message || 'Verification successful! You are now the Admin.');
      setShowTOTPVerify(false);
      setTotpData(null);
      setTotpInput('');
      setNewUser({ id: '', name: '', email: '', password: '', role: 'user', accountType: 'enterprise' });

      // Refresh user list
      const listRes = await fetch('/api/auth');
      const listData = await listRes.json();
      setUsers(listData.users || []);

      // Auto-login the user
      localStorage.setItem('bosdb_current_user', JSON.stringify(data.user));

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">

      {/* Floating TOTP Instruction - Top Right */}
      {showTOTPVerify && totpData && (
        <div className="fixed top-6 right-6 z-50 animate-slideInRight max-w-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-purple-500 text-center">
            <h3 className="text-gray-900 font-bold mb-2">Scan with Authenticator App</h3>
            <p className="text-gray-500 text-xs mb-4">Microsoft Authenticator, Google Authenticator, etc.</p>

            <div className="bg-white p-2 rounded-lg inline-block mb-2 border border-gray-200">
              <img src={totpData.qrCode} alt="TOTP QR Code" className="w-48 h-48" />
            </div>

            <p className="text-xs text-gray-400 font-mono mt-2 break-all">
              Secret: {totpData.secret}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🗄️ BosDB</h1>
          <p className="text-gray-400">Database Version Control System</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 text-green-400 rounded-lg text-sm animate-fadeIn">
            ✅ {successMessage}
          </div>
        )}

        {showTOTPVerify ? (
          // TOTP Verification Form
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">🔐 Two-Factor Authentication</h2>
            <p className="text-gray-400 text-sm mb-6">
              To secure the organization <span className="text-purple-400 font-semibold">{totpData?.organizationName}</span>, please scan the QR code and enter the 6-digit code.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Authenticator Code *
              </label>
              <input
                type="text"
                value={totpInput}
                onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyTOTP()}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleVerifyTOTP}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition mb-3"
            >
              Verify & Register
            </button>

            <button
              onClick={() => {
                setShowTOTPVerify(false);
                setTotpData(null);
                setTotpInput('');
                setShowRegister(true);
              }}
              className="w-full px-4 py-3 border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Back to Registration
            </button>
          </div>

        ) : !showRegister ? (
          // Login Form
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Employee Login</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}



            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="e.g., admin@company.com"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition mb-4"
            >
              Login
            </button>

            <button
              onClick={() => setShowRegister(true)}
              className="w-full px-4 py-3 border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Register New User
            </button>
          </div>


        ) : (
          // Register Form
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              Register New User
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Account Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                How will you use BosDB?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewUser({ ...newUser, accountType: 'individual' })}
                  className={`p-4 rounded-lg border-2 transition-all ${newUser.accountType === 'individual'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                >
                  <div className="text-lg mb-1">👤 Individual</div>
                  <div className="text-xs opacity-70">Personal use</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewUser({ ...newUser, accountType: 'enterprise' })}
                  className={`p-4 rounded-lg border-2 transition-all ${newUser.accountType === 'enterprise'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                >
                  <div className="text-lg mb-1">🏢 Company/Team</div>
                  <div className="text-xs opacity-70">For organizations</div>
                </button>
              </div>
              {newUser.accountType === 'enterprise' && (
                <p className="mt-2 text-xs text-gray-400">
                  💡 All users with the same email domain will be grouped together
                </p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User ID *
                </label>
                <input
                  type="text"
                  value={newUser.id}
                  onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
                  placeholder="e.g., testuser"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g., Test User"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g., ayush@company.com"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Must be 8+ characters with uppercase, lowercase, and number</p>
              </div>

              {/* Role Selection for Enterprise */}
              {newUser.accountType === 'enterprise' && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Requested Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: 'user' })}
                      className={`px-4 py-2 rounded-md border transition-all text-sm ${newUser.role === 'user'
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Member (User)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                      className={`px-4 py-2 rounded-md border transition-all text-sm ${newUser.role === 'admin'
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                      Organization Admin
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 italic">
                    {newUser.role === 'admin'
                      ? "⚠️ Admin requests for existing teams require approval from a current Admin."
                      : "✅ Membership is usually approved automatically by domain."}
                  </p>
                </div>
              )}

            </div>

            <button
              onClick={handleRegister}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition mb-3"
            >
              Create User
            </button>

            <button
              onClick={() => setShowRegister(false)}
              className="w-full px-4 py-3 border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Back to Login
            </button>
          </div>
        )}


      </div>
    </div>
  );
}

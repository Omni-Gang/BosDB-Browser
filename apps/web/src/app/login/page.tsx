'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getAllUsers, initializeDefaultUsers, registerUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize default user if needed
    const users = getAllUsers();
    if (users.length === 0) {
      registerUser({
        id: 'admin',
        name: 'Administrator',
        email: 'admin@bosdb.com',
        role: 'admin',
        status: 'approved'
      });
    }
  }, []);

  const handleLogin = () => {
    setError('');

    if (!userId.trim()) {
      setError('Please enter your user ID');
      return;
    }

    const user = login(userId.trim());

    if (user) {
      router.push('/dashboard');
    } else {
      setError('User not found. Contact admin to create your account.');
    }
  };

  const handleRegister = () => {
    setError('');

    try {
      registerUser({
        ...newUser,
        status: 'pending'
      });
      alert(`✅ User ${newUser.id} created successfully! (Pending Admin Approval)`);
      setShowRegister(false);
      setNewUser({ id: '', name: '', email: '', role: 'user' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const users = getAllUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🗄️ BosDB</h1>
          <p className="text-gray-400">Database Version Control System</p>
        </div>

        {!showRegister ? (
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
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="e.g., ayush-g, yuval.o"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition mb-4"
            >
              Login
            </button>

            <button
              onClick={() => setShowRegister(true)}
              className="w-full px-4 py-3 border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              Register New User (Admin)
            </button>

            {/* Existing Users */}
            {users.length > 0 && (
              <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Existing Users:</p>
                <div className="space-y-1">
                  {users.map(user => (
                    <div key={user.id} className="text-xs text-gray-500">
                      • {user.id} ({user.role})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Register Form
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Register New User</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User ID *
                </label>
                <input
                  type="text"
                  value={newUser.id}
                  onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
                  placeholder="e.g., ayush-g"
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
                  placeholder="e.g., Ayush Gupta"
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
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
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

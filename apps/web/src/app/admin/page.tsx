'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Database, Plus, Shield, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    status?: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    sharedWith?: string[];
    ownerId?: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [assigningUser, setAssigningUser] = useState<User | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        setCurrentUser(user);
        fetchData();
    }, [router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const user = getCurrentUser(); // Get again for headers
            const headers = {
                'x-user-id': user?.id || '',
                'x-user-email': user?.email || '',
                'x-user-role': user?.role || ''
            };

            const [usersRes, connRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/connections', { headers })
            ]);

            const usersData = await usersRes.json();
            const connData = await connRes.json();

            if (usersData.users) setUsers(usersData.users);
            if (connData.connections) setConnections(connData.connections);

        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        try {
            const user = getCurrentUser();
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id || '',
                    'x-user-role': user?.role || ''
                },
                body: JSON.stringify({ userId, status: newStatus })
            });
            fetchData();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Admin Panel
                        </h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">User Management</h2>
                        <p className="text-muted-foreground">Manage users and their access to database connections</p>
                    </div>
                    <button
                        onClick={() => setShowCreateUser(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : (
                    <div className="space-y-8">
                        {/* Admins Section */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-600" />
                                Administrators
                            </h3>
                            <UserTable
                                users={users.filter(u => u.role === 'admin')}
                                onManageAccess={setAssigningUser}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        </section>

                        {/* Regular Users Section */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                Regular Users
                            </h3>
                            <UserTable
                                users={users.filter(u => u.role !== 'admin')}
                                onManageAccess={setAssigningUser}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        </section>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateUser && (
                <CreateUserModal
                    onClose={() => setShowCreateUser(false)}
                    onSuccess={() => {
                        setShowCreateUser(false);
                        fetchData();
                    }}
                />
            )}

            {assigningUser && (
                <AssignConnectionModal
                    user={assigningUser}
                    connections={connections}
                    onClose={() => setAssigningUser(null)}
                    onUpdate={fetchData}
                />
            )}
        </div>
    );
}

// UserTable component with status support
function UserTable({ users, onManageAccess, onStatusUpdate }: {
    users: User[],
    onManageAccess: (user: User) => void,
    onStatusUpdate?: (userId: string, status: string) => void
}) {
    if (users.length === 0) {
        return (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                No users found in this group.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-muted text-muted-foreground text-sm">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Created</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 font-medium">{user.name}</td>
                            <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                    user.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                    {user.status || 'approved'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                {user.status === 'pending' && onStatusUpdate && (
                                    <>
                                        <button
                                            onClick={() => onStatusUpdate(user.id, 'approved')}
                                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                                            title="Approve"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onStatusUpdate(user.id, 'rejected')}
                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                            title="Reject"
                                        >
                                            <AlertCircle className="w-4 h-4" /> {/* Using AlertCircle as pseudo-X or Reject icon */}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => onManageAccess(user)}
                                    className="text-primary hover:text-primary/80 text-sm font-medium"
                                >
                                    Manage Access
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = getCurrentUser();
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id || '',
                    'x-user-role': user?.role || ''
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
                <h2 className="text-xl font-bold mb-6">Add New User</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AssignConnectionModal({
    user,
    connections,
    onClose,
    onUpdate
}: {
    user: User,
    connections: Connection[],
    onClose: () => void,
    onUpdate: () => void
}) {
    // In this simple implementation, sharedWith is available on the connection object
    // We check if user.id is in connection.sharedWith OR if user.id is connection.ownerId

    // However, the connections prop passed here contains fresh data from fetchData()

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 max-w-xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-bold">Manage Access</h2>
                    <p className="text-muted-foreground">Assign connections for {user.name}</p>
                </div>

                <div className="space-y-2 mb-8">
                    {connections.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No connections available</p>
                    ) : (
                        connections.map(conn => (
                            <ConnectionRow
                                key={conn.id}
                                connection={conn}
                                userId={user.id}
                                onUpdate={onUpdate}
                            />
                        ))
                    )}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConnectionRow({
    connection,
    userId,
    onUpdate
}: {
    connection: Connection,
    userId: string,
    onUpdate: () => void
}) {
    const isOwner = connection.ownerId === userId;
    const isShared = connection.sharedWith?.includes(userId) ?? false;
    const hasAccess = isOwner || isShared;
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [permissions, setPermissions] = useState({
        canRead: hasAccess,
        canEdit: false,
        canCommit: false,
        canManageSchema: false
    });

    const fetchPermissions = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/assign?userId=${userId}&connectionId=${connection.id}`);
            const data = await res.json();
            if (data.permission) {
                setPermissions(data.permission);
            }
        } catch (err) {
            console.error('Failed to fetch permissions:', err);
        }
    }, [userId, connection.id]);

    // Fetch current permissions when expanded
    useEffect(() => {
        if (expanded && hasAccess) {
            fetchPermissions();
        }
    }, [expanded, hasAccess, fetchPermissions]);

    const updatePermission = async (perm: string, value: boolean) => {
        setLoading(true);
        try {
            const currentUser = getCurrentUser();
            const newPerms = { ...permissions, [perm]: value };

            // If enabling edit/commit/schema, also enable read
            if (value && perm !== 'canRead') {
                newPerms.canRead = true;
            }

            setPermissions(newPerms);

            await fetch('/api/admin/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser?.id || '',
                    'x-user-role': currentUser?.role || ''
                },
                body: JSON.stringify({
                    userId,
                    connectionId: connection.id,
                    action: 'update',
                    permissions: newPerms
                })
            });
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const revokeAccess = async () => {
        if (!confirm('Remove all access for this user to this connection?')) return;

        setLoading(true);
        try {
            const currentUser = getCurrentUser();
            await fetch('/api/admin/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser?.id || '',
                    'x-user-role': currentUser?.role || ''
                },
                body: JSON.stringify({
                    userId,
                    connectionId: connection.id,
                    action: 'revoke'
                })
            });
            setExpanded(false);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const assignAccess = async () => {
        setLoading(true);
        try {
            const currentUser = getCurrentUser();
            await fetch('/api/admin/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser?.id || '',
                    'x-user-role': currentUser?.role || ''
                },
                body: JSON.stringify({
                    userId,
                    connectionId: connection.id,
                    action: 'assign'
                })
            });
            setPermissions({ canRead: true, canEdit: false, canCommit: false, canManageSchema: false });
            setExpanded(true);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`border border-border rounded-lg bg-background transition ${hasAccess ? 'border-green-200 dark:border-green-900' : ''}`}>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded items-center justify-center flex">
                        <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-medium">{connection.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{connection.type} • {connection.host}</p>
                    </div>
                </div>

                {isOwner ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Owner</span>
                ) : hasAccess ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200"
                    >
                        <Check className="w-3 h-3" />
                        {expanded ? 'Hide Permissions' : 'Edit Permissions'}
                    </button>
                ) : (
                    <button
                        onClick={assignAccess}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                        {loading ? '...' : 'Grant Access'}
                    </button>
                )}
            </div>

            {/* Permission Checkboxes */}
            {expanded && hasAccess && !isOwner && (
                <div className="px-4 pb-4 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.canRead}
                                onChange={(e) => updatePermission('canRead', e.target.checked)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-border"
                            />
                            <span>📖 Read Data</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.canEdit}
                                onChange={(e) => updatePermission('canEdit', e.target.checked)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-border"
                            />
                            <span>✏️ Edit Data</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.canCommit}
                                onChange={(e) => updatePermission('canCommit', e.target.checked)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-border"
                            />
                            <span>📝 Commit Changes</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.canManageSchema}
                                onChange={(e) => updatePermission('canManageSchema', e.target.checked)}
                                disabled={loading}
                                className="w-4 h-4 rounded border-border"
                            />
                            <span>🏗️ Manage Schema</span>
                        </label>
                    </div>
                    <button
                        onClick={revokeAccess}
                        disabled={loading}
                        className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4" />
                        Revoke All Access
                    </button>
                </div>
            )}
        </div>
    );
}

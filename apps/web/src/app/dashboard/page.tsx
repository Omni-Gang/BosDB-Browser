'use client';

import { useState, useEffect } from 'react';
import { Database, Plus, Play, History, Save, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/auth';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    status: string;
    readOnly: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewConnection, setShowNewConnection] = useState(false);
    const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);

    useEffect(() => {
        // Check if user is logged in
        const user = getCurrentUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setCurrentUser(user);
    }, [router]);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/connections');
            const data = await res.json();
            setConnections(data.connections || []);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <Database className="w-8 h-8 text-primary" />
                            <span className="text-2xl font-bold">BosDB</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            {currentUser && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                                    <User className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{currentUser.name}</span>
                                    <span className="text-xs text-muted-foreground">({currentUser.id})</span>
                                </div>
                            )}
                            <Link href="/docs">
                                <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                                    Documentation
                                </button>
                            </Link>
                            <Link href="/settings">
                                <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                                    Settings
                                </button>
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    router.push('/login');
                                }}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Database Connections</h1>
                    <p className="text-muted-foreground">
                        Manage your database connections and execute queries
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <QuickActionCard
                        icon={<Plus className="w-6 h-6" />}
                        title="New Connection"
                        description="Connect to a database"
                        onClick={() => setShowNewConnection(true)}
                    />
                    <QuickActionCard
                        icon={<Play className="w-6 h-6" />}
                        title="Run Query"
                        description="Execute SQL queries"
                        disabled={connections.length === 0}
                        href={connections.length > 0 ? `/query?connection=${connections[0].id}` : undefined}
                    />
                    <QuickActionCard
                        icon={<History className="w-6 h-6" />}
                        title="Query History"
                        description="View past queries"
                        href="/history"
                    />
                    <QuickActionCard
                        icon={<Save className="w-6 h-6" />}
                        title="Saved Queries"
                        description="Access saved queries"
                        href="/saved-queries"
                    />
                </div>

                {/* Connections List */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Your Connections</h2>

                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Get started by creating your first database connection
                            </p>
                            <button
                                onClick={() => setShowNewConnection(true)}
                                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                            >
                                <Plus className="w-4 h-4 inline mr-2" />
                                New Connection
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {connections.map((conn) => (
                                <ConnectionCard key={conn.id} connection={conn} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* New Connection Modal */}
            {showNewConnection && (
                <NewConnectionModal
                    onClose={() => setShowNewConnection(false)}
                    onSuccess={() => {
                        setShowNewConnection(false);
                        fetchConnections();
                    }}
                />
            )}
        </div>
    );
}

function QuickActionCard({
    icon,
    title,
    description,
    onClick,
    disabled,
    href,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick?: () => void;
    disabled?: boolean;
    href?: string;
}) {
    const content = (
        <>
            <div className="text-primary mb-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </>
    );

    const className = `p-6 bg-card border border-border rounded-lg text-left transition-all hover:border-primary hover:shadow-lg group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    if (href && !disabled) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
        >
            {content}
        </button>
    );
}

function ConnectionCard({ connection }: { connection: Connection }) {
    return (
        <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{connection.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{connection.type}</p>
                    </div>
                </div>
                <span
                    className={`px-2 py-1 text-xs rounded-full ${connection.status === 'connected'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-500'
                        }`}
                >
                    {connection.status}
                </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span>
                    <span className="font-mono">{connection.host}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Database:</span>
                    <span className="font-mono">{connection.database}</span>
                </div>
                {connection.readOnly && (
                    <div className="text-xs text-amber-500">Read-only mode</div>
                )}
            </div>

            <Link
                href={`/query?connection=${connection.id}`}
                className="block w-full px-4 py-2 bg-primary text-primary-foreground text-center rounded-lg hover:bg-primary/90 transition"
            >
                Open Query Editor
            </Link>
        </div>
    );
}

function NewConnectionModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'postgresql',
        host: '',
        port: '5432',
        database: '',
        username: '',
        password: '',
        ssl: false,
        readOnly: false,
    });
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTesting(true);
        setError('');

        try {
            const res = await fetch('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    port: parseInt(formData.port),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create connection');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">New Database Connection</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Connection Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="My PostgreSQL DB"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Database Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => {
                                const newType = e.target.value;
                                const defaultPorts: { [key: string]: string } = {
                                    postgresql: '5432',
                                    mysql: '3306',
                                    mariadb: '3306',
                                    mongodb: '27017',
                                    redis: '6379',
                                };
                                setFormData({
                                    ...formData,
                                    type: newType,
                                    port: defaultPorts[newType] || formData.port
                                });
                            }}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                            <option value="mariadb">MariaDB</option>
                            <option value="mongodb">MongoDB</option>
                            <option value="redis">Redis</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Host</label>
                            <input
                                type="text"
                                required
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="localhost"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Port</label>
                            <input
                                type="number"
                                required
                                value={formData.port}
                                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Database Name</label>
                        <input
                            type="text"
                            required
                            value={formData.database}
                            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="postgres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex gap-6">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.ssl}
                                onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Use SSL</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.readOnly}
                                onChange={(e) => setFormData({ ...formData, readOnly: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Read-only mode</span>
                        </label>
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-accent transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={testing}
                            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                        >
                            {testing ? 'Testing Connection...' : 'Create Connection'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Play, Database } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdAt: string;
    updatedAt: string;
}

export default function SavedQueriesPage() {
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchQueries();
    }, []);

    const getHeaders = () => {
        const currentUser = getCurrentUser();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (currentUser?.email) headers['x-user-email'] = currentUser.email;
        if (currentUser?.organizationId) headers['x-org-id'] = currentUser.organizationId;
        return headers;
    };

    const fetchQueries = async () => {
        try {
            const res = await fetch('/api/saved-queries', { headers: getHeaders() });
            const data = await res.json();
            setQueries(data.queries || []);
        } catch (error) {
            console.error('Failed to fetch saved queries:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteQuery = async (id: string) => {
        if (!confirm('Delete this saved query?')) return;

        try {
            await fetch(`/api/saved-queries?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            setQueries(queries.filter(q => q.id !== id));
        } catch (error) {
            console.error('Failed to delete query:', error);
        }
    };

    const runQuery = (query: SavedQuery) => {
        if (query.connectionId) {
            router.push(`/query?connection=${query.connectionId}&q=${encodeURIComponent(query.query)}`);
        } else {
            // If no specific connection, go to dashboard to select
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <Database className="w-8 h-8 text-primary" />
                            <span className="text-2xl font-bold">BosDB</span>
                        </Link>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Query
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Save className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl font-bold">Saved Queries</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Save and organize your frequently used queries
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : queries.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                        <Save className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No saved queries</h3>
                        <p className="text-muted-foreground mb-4">
                            Save queries for quick access later
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                        >
                            <Plus className="w-4 h-4 inline mr-2" />
                            Create First Query
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {queries.map((query) => (
                            <div
                                key={query.id}
                                className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-all group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">{query.name}</h3>
                                        {query.description && (
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {query.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <pre className="text-xs bg-background p-3 rounded border border-border overflow-x-auto mb-4 max-h-32">
                                    {query.query}
                                </pre>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => runQuery(query)}
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2"
                                    >
                                        <Play className="w-4 h-4" />
                                        Run
                                    </button>
                                    <button
                                        onClick={() => deleteQuery(query.id)}
                                        className="px-4 py-2 border border-border rounded-lg hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground">
                                    Updated: {new Date(query.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Query Modal */}
            {showModal && (
                <SaveQueryModal
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        fetchQueries();
                    }}
                />
            )}
        </div>
    );
}

function SaveQueryModal({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        query: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const user = getCurrentUser();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (user?.email) headers['x-user-email'] = user.email;
            if (user?.organizationId) headers['x-org-id'] = user.organizationId;

            const res = await fetch('/api/saved-queries', {
                method: 'POST',
                headers,
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save query');
            }

            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">Save Query</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Query Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="My Useful Query"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="What does this query do?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">SQL Query *</label>
                        <textarea
                            required
                            value={formData.query}
                            onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            rows={10}
                            placeholder="SELECT * FROM users WHERE active = true;"
                        />
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
                            disabled={saving}
                            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Query'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

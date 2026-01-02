'use client';

import { useState, useEffect } from 'react';
import { History, Clock, RefreshCw, Trash2, Database } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

interface QueryHistoryEntry {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    executedAt: string;
    executionTime: number;
    rowCount: number;
    success: boolean;
    error?: string;
}

export default function QueryHistoryPage() {
    const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const user = getCurrentUser();
            const headers: HeadersInit = {};
            if (user?.email) {
                headers['x-user-email'] = user.email;
            }
            const res = await fetch('/api/history', { headers });
            const data = await res.json();
            setHistory(data.history || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Clear all query history?')) return;

        try {
            const user = getCurrentUser();
            const headers: HeadersInit = {};
            if (user?.email) {
                headers['x-user-email'] = user.email;
            }
            await fetch('/api/history', { method: 'DELETE', headers });
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const rerunQuery = (entry: QueryHistoryEntry) => {
        router.push(`/query?connection=${entry.connectionId}&q=${encodeURIComponent(entry.query)}`);
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
                        <div className="flex items-center gap-4">
                            <button
                                onClick={fetchHistory}
                                className="px-4 py-2 text-sm hover:bg-accent rounded-lg transition flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                            <button
                                onClick={clearHistory}
                                className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <History className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl font-bold">Query History</h1>
                    </div>
                    <p className="text-muted-foreground">
                        View and rerun your past queries
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                        <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No query history</h3>
                        <p className="text-muted-foreground mb-4">
                            Run some queries to see them here
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((entry) => (
                            <div
                                key={entry.id}
                                className={`p-6 bg-card border rounded-lg hover:border-primary transition-all ${!entry.success ? 'border-destructive/50' : 'border-border'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-semibold">{entry.connectionName}</span>
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full ${entry.success
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-destructive/10 text-destructive'
                                                    }`}
                                            >
                                                {entry.success ? 'Success' : 'Failed'}
                                            </span>
                                        </div>
                                        <pre className="text-sm bg-background p-3 rounded border border-border overflow-x-auto">
                                            {entry.query}
                                        </pre>
                                    </div>
                                    <button
                                        onClick={() => rerunQuery(entry)}
                                        className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Rerun
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(entry.executedAt).toLocaleString()}
                                    </div>
                                    {entry.success && (
                                        <>
                                            <span>•</span>
                                            <span>{entry.executionTime}ms</span>
                                            <span>•</span>
                                            <span>{entry.rowCount} rows</span>
                                        </>
                                    )}
                                    {entry.error && (
                                        <>
                                            <span>•</span>
                                            <span className="text-destructive">{entry.error}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

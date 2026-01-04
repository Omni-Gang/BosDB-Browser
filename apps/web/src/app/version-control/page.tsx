'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, promptForUserIfNeeded } from '@/lib/user-context';

function VersionControlContent() {
    const searchParams = useSearchParams();
    const connectionId = searchParams?.get('connection');

    const [commits, setCommits] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string>('main');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('commits');
    const [selectedCommit, setSelectedCommit] = useState<any>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [compareFrom, setCompareFrom] = useState<number>(0);
    const [compareTo, setCompareTo] = useState<number>(-1);
    const [diffResult, setDiffResult] = useState<any>(null);

    useEffect(() => {
        if (connectionId) {
            loadAllData();
        }
    }, [connectionId]);

    // Show message if no connection selected
    if (!connectionId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🔌</div>
                    <h2 className="text-2xl font-bold mb-4">No Database Connection Selected</h2>
                    <p className="text-gray-400 mb-6">
                        Please select a database connection from the dashboard to use version control features.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                        Go to Dashboard
                    </Link>
                    <div className="mt-8 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg text-left">
                        <p className="text-sm text-gray-300">
                            <strong>Tip:</strong> Access version control from the Query Editor by clicking the &quot;Version Control&quot; button,
                            or use: <code className="bg-gray-800 px-2 py-1 rounded">/version-control?connection=YOUR_ID</code>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const loadAllData = async () => {
        setLoading(true);
        try {
            const commitRes = await fetch(`/api/vcs/commit?connectionId=${connectionId}`);
            const commitData = await commitRes.json();
            setCommits(commitData.commits || []);

            const branchRes = await fetch(`/api/vcs/branches?connectionId=${connectionId}`);
            const branchData = await branchRes.json();
            setBranches(branchData.branches || [{ name: 'main', commitId: '', protected: true }]);
            setCurrentBranch(branchData.currentBranch || 'main');

            const pendingRes = await fetch(`/api/vcs/pending?connectionId=${connectionId}`);
            const pendingData = await pendingRes.json();
            setPending(pendingData.changes || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const createCommit = async (changesToCommit?: any[], customMessage?: string) => {
        // Use stored user or prompt once
        const user = promptForUserIfNeeded();

        const message = customMessage || prompt('Commit message:');
        if (!message) return;

        const author = {
            name: user.name,
            email: user.email,
            userId: (user as any).userId || (user as any).id // Include user ID for tracking
        };

        const res = await fetch('/api/vcs/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionId,
                message,
                author,
                changes: changesToCommit || pending,
                snapshot: { schema: { tables: {} }, data: { tables: {} }, timestamp: new Date() }
            })
        });

        if (res.ok) {
            alert(`✅ Commit created by ${user.name} on branch ${currentBranch}!`);
            await loadAllData();
        } else {
            const error = await res.json();
            alert(`❌ Failed to create commit: ${error.error || 'Unknown error'}`);
            console.error('Commit error:', error);
        }
    };

    const revertCommit = async (commitId: string, message: string) => {
        if (!confirm(`Are you sure you want to REVERT this specific commit?\n\n"${message}"\n\nThis will generate inverse SQL to undo just these changes.`)) {
            return;
        }

        const user = promptForUserIfNeeded();

        try {
            const res = await fetch('/api/vcs/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId,
                    commitId,
                    isRevert: true,
                    author: {
                        name: user.name,
                        email: user.email,
                        userId: (user as any).userId || (user as any).id
                    }
                })
            });

            if (res.ok) {
                alert(`✅ Successfully reverted commit ${commitId.substring(0, 8)}!`);
                await loadAllData();
            } else {
                const error = await res.json();
                alert(`❌ Revert failed: ${error.error}`);
            }
        } catch (error) {
            alert(`❌ Error during revert: ${error}`);
        }
    };

    const createBranch = async () => {
        const name = prompt('Branch name:');
        if (!name) return;

        const res = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'create' })
        });

        if (res.ok) {
            alert('✅ Branch created!');
            await loadAllData();
        }
    };

    const checkoutBranch = async (name: string) => {
        const res = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'checkout' })
        });

        if (res.ok) {
            alert(`✅ Switched to ${name}`);
            setCurrentBranch(name);
        }
    };

    const viewCommitDetails = (commit: any) => {
        setSelectedCommit(commit);
        setShowDiff(true);
    };

    const rollbackToCommit = async (targetRevision: number) => {
        if (!confirm(`Are you sure you want to rollback ${Math.abs(targetRevision)} revision(s)? This will directly rollback the database to that state.`)) {
            return;
        }

        // Get current user for tracking who performed the rollback
        const user = promptForUserIfNeeded();

        try {
            const res = await fetch('/api/vcs/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId,
                    targetRevision,
                    author: {
                        name: user.name,
                        email: user.email,
                        userId: (user as any).userId || (user as any).id
                    }
                })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`✅ Rolled back to revision ${targetRevision} by ${user.name}!\n\nReverted to: ${result.targetCommit?.message}`);
                await loadAllData();
            } else {
                const error = await res.json();
                alert(`❌ Rollback failed: ${error.error}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error}`);
        }
    };

    const compareRevisions = async () => {
        if (commits.length < 2) {
            alert('Need at least 2 commits to compare revisions. Execute some queries first!');
            return;
        }

        try {
            const res = await fetch(`/api/vcs/rollback/diff?connectionId=${connectionId}&fromRevision=${compareFrom}&toRevision=${compareTo}`);

            if (res.ok) {
                const result = await res.json();

                if (result.error) {
                    alert(`Cannot compare: ${result.error}`);
                    return;
                }

                setDiffResult(result);
                setActiveTab('compare');
            } else {
                const error = await res.json();
                alert(`Failed to compare revisions: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Compare error:', error);
            alert(`Error comparing revisions: ${String(error)}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">🌿 Version Control</h1>
                    <p className="text-gray-400">SVN-like version control: {connectionId}</p>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-400">Branch:</span>
                        <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-blue-400 font-mono">
                            {currentBranch}
                        </span>
                        {pending.length > 0 && (
                            <span className="px-3 py-1 bg-yellow-600/20 border border-yellow-500/50 rounded text-yellow-400">
                                {pending.length} pending changes
                            </span>
                        )}
                        <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 rounded text-purple-400">
                            {commits.length} revisions
                        </span>
                    </div>
                </div>

                {/* Revision Comparator */}
                <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <h3 className="font-semibold mb-3">📊 Compare Revisions (SVN-style)</h3>
                    <div className="flex gap-4 items-end flex-wrap">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">From Revision</label>
                            <select
                                value={compareFrom}
                                onChange={(e) => setCompareFrom(parseInt(e.target.value))}
                                className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            >
                                {commits.map((commit, idx) => (
                                    <option key={idx} value={-idx}>
                                        r{-idx} {idx === 0 ? '(current)' : `- ${commit.message?.substring(0, 30)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-2xl text-gray-500">↔</div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">To Revision</label>
                            <select
                                value={compareTo}
                                onChange={(e) => setCompareTo(parseInt(e.target.value))}
                                className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            >
                                {commits.map((commit, idx) => (
                                    <option key={idx} value={-idx}>
                                        r{-idx} {idx === 0 ? '(current)' : `- ${commit.message?.substring(0, 30)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={compareRevisions}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                        >
                            Compare
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-700 mb-6">
                    {['commits', 'compare', 'branches', 'pending', 'history'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab !== 'commits') setShowDiff(false);
                            }}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === tab
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* Compare Tab */}
                        {activeTab === 'compare' && (
                            <div>
                                {!diffResult ? (
                                    <div className="text-center py-20 bg-gray-800/30 border border-dashed border-gray-700 rounded-xl">
                                        <div className="text-6xl mb-4">📊</div>
                                        <h3 className="text-xl font-semibold mb-2">No Comparison Active</h3>
                                        <p className="text-gray-400 max-w-md mx-auto mb-6">
                                            Select two revisions from the dropdowns above and click &quot;Compare&quot; to see the differences between states.
                                        </p>
                                        <div className="flex justify-center gap-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className="w-3 h-3 rounded-full bg-red-500/50"></span>
                                                Removed Changes
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className="w-3 h-3 rounded-full bg-green-500/50"></span>
                                                Added Changes
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">
                                            Comparing r{diffResult.from.revision} ↔ r{diffResult.to.revision}
                                        </h2>

                                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                                <h3 className="font-semibold mb-2">From: r{diffResult.from.revision}</h3>
                                                <p className="text-sm text-gray-400">{diffResult.from.commit.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(diffResult.from.commit.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                                <h3 className="font-semibold mb-2">To: r{diffResult.to.revision}</h3>
                                                <p className="text-sm text-gray-400">{diffResult.to.commit.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(diffResult.to.commit.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-3">Changes</h3>

                                        <div className="space-y-3">
                                            {diffResult.from.changes.map((change: any, idx: number) => (
                                                <div key={idx} className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-red-400 font-semibold">− REMOVED</span>
                                                        <span className="text-sm text-gray-400">{change.operation} {change.target}</span>
                                                    </div>
                                                    {change.query && (
                                                        <pre className="bg-black/30 p-2 rounded text-sm text-red-300 overflow-x-auto">{change.query}</pre>
                                                    )}
                                                </div>
                                            ))}

                                            {diffResult.to.changes.map((change: any, idx: number) => (
                                                <div key={idx} className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-green-400 font-semibold">+ ADDED</span>
                                                        <span className="text-sm text-gray-400">{change.operation} {change.target}</span>
                                                    </div>
                                                    {change.query && (
                                                        <pre className="bg-black/30 p-2 rounded text-sm text-green-300 overflow-x-auto">{change.query}</pre>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6">
                                            <button
                                                onClick={() => rollbackToCommit(diffResult.to.revision)}
                                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition font-semibold"
                                            >
                                                ⏮️ Rollback to r{diffResult.to.revision}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Commits Tab - Commit Details View */}
                        {activeTab === 'commits' && showDiff && selectedCommit && (
                            <div>
                                <button
                                    onClick={() => { setShowDiff(false); setSelectedCommit(null); }}
                                    className="mb-4 text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    ← Back to Commit List
                                </button>

                                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="px-3 py-1.5 bg-purple-600/30 text-purple-400 rounded font-mono text-lg font-bold">
                                                    r{commits.findIndex(c => c.id === selectedCommit.id) ? -commits.findIndex(c => c.id === selectedCommit.id) : 0}
                                                </span>
                                                <h2 className="text-2xl font-bold">{selectedCommit.message}</h2>
                                            </div>
                                            <p className="text-gray-400">
                                                by <strong>{selectedCommit.author?.name}</strong> ({selectedCommit.author?.email})
                                                <br />
                                                {new Date(selectedCommit.timestamp).toLocaleDateString()} at {new Date(selectedCommit.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => revertCommit(selectedCommit.id, selectedCommit.message)}
                                                className="px-4 py-2 bg-red-600/30 hover:bg-red-600 border border-red-500/50 rounded-lg transition flex items-center gap-2"
                                            >
                                                ⏪ Revert This Commit
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-3">Commit ID</h3>
                                        <code className="bg-gray-900 px-4 py-2 rounded block font-mono text-sm">
                                            {selectedCommit.id}
                                        </code>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">Changes ({selectedCommit.changes?.length || 0})</h3>
                                        {(!selectedCommit.changes || selectedCommit.changes.length === 0) ? (
                                            <p className="text-gray-400 italic">No detailed changes recorded</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedCommit.changes.map((change: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className={`rounded-lg p-4 ${change.type === 'SCHEMA'
                                                            ? 'bg-purple-900/20 border border-purple-500/30'
                                                            : 'bg-green-900/20 border border-green-500/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`px-2 py-1 text-xs rounded font-semibold ${change.type === 'SCHEMA'
                                                                ? 'bg-purple-500/30 text-purple-400'
                                                                : 'bg-green-500/30 text-green-400'
                                                                }`}>
                                                                {change.type}
                                                            </span>
                                                            <span className="font-mono text-sm font-semibold">{change.operation}</span>
                                                            <span className="text-gray-400">{change.target}</span>
                                                        </div>

                                                        {change.description && (
                                                            <p className="text-sm text-gray-300 mb-2">{change.description}</p>
                                                        )}

                                                        {change.query && (
                                                            <div className="bg-black/30 rounded p-3 overflow-x-auto">
                                                                <pre className="text-sm text-green-400 whitespace-pre-wrap">{change.query}</pre>
                                                            </div>
                                                        )}

                                                        {change.rollbackSQL && (
                                                            <div className="mt-3">
                                                                <p className="text-xs text-gray-500 mb-1">Rollback SQL:</p>
                                                                <div className="bg-black/30 rounded p-3 overflow-x-auto">
                                                                    <pre className="text-sm text-orange-400 whitespace-pre-wrap">{change.rollbackSQL}</pre>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commits Tab - List View */}
                        {activeTab === 'commits' && !showDiff && (
                            <div>
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-2xl font-bold">Commit History (Revisions)</h2>
                                    <button
                                        onClick={() => createCommit()}
                                        disabled={pending.length === 0}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition"
                                    >
                                        Commit {pending.length > 0 && `(${pending.length})`}
                                    </button>
                                </div>

                                {commits.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="text-6xl mb-4">📝</div>
                                        <h3 className="text-xl font-semibold mb-2">No Commits Yet</h3>
                                        <p className="text-gray-400">
                                            Execute queries in the Query Editor to track changes
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {commits.map((commit, idx) => (
                                            <div
                                                key={commit.id}
                                                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded font-mono text-sm font-bold">
                                                                r{-idx}
                                                            </span>
                                                            <h3 className="font-semibold text-lg">{commit.message}</h3>
                                                            {idx === 0 && (
                                                                <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                                                                    CURRENT
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-400 mb-3">
                                                            by {commit.author?.name}
                                                            {(commit.author as any)?.userId && (
                                                                <span className="ml-1 text-purple-400">
                                                                    ({(commit.author as any).userId})
                                                                </span>
                                                            )}
                                                            {' • '}{new Date(commit.timestamp).toLocaleString()}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {commit.changes?.map((change: any, cidx: number) => (
                                                                <span
                                                                    key={cidx}
                                                                    className={`px-2 py-1 text-xs rounded ${change.type === 'SCHEMA'
                                                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                        }`}
                                                                >
                                                                    {change.operation} {change.target}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => viewCommitDetails(commit)}
                                                                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition"
                                                            >
                                                                📊 View Details
                                                            </button>
                                                            {idx > 0 && (
                                                                <button
                                                                    onClick={() => rollbackToCommit(-idx)}
                                                                    className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 rounded transition"
                                                                >
                                                                    ⏮️ Rollback to r{-idx}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => revertCommit(commit.id, commit.message)}
                                                                className="px-3 py-1 text-sm bg-red-600/30 hover:bg-red-600 border border-red-500/50 rounded transition"
                                                            >
                                                                ⏪ Revert
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Branches Tab */}
                        {activeTab === 'branches' && (
                            <div>
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-2xl font-bold">Branches</h2>
                                    <button
                                        onClick={createBranch}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                                    >
                                        + New Branch
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {branches.map((branch) => (
                                        <div
                                            key={branch.name}
                                            className={`p-4 rounded-lg border-2 transition ${branch.name === currentBranch
                                                ? 'bg-blue-500/10 border-blue-500'
                                                : 'bg-gray-800/50 border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold">{branch.name}</h3>
                                                    <p className="text-sm text-gray-400">
                                                        {branch.commitId || 'No commits'}
                                                        {branch.protected && ' • Protected'}
                                                    </p>
                                                </div>
                                                {branch.name !== currentBranch && (
                                                    <button
                                                        onClick={() => checkoutBranch(branch.name)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition text-sm"
                                                    >
                                                        Checkout
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Tab */}
                        {activeTab === 'pending' && (
                            <div>
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-2xl font-bold">Pending Changes</h2>
                                    <button
                                        onClick={() => createCommit()}
                                        disabled={pending.length === 0}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition"
                                    >
                                        Commit All
                                    </button>
                                </div>

                                {pending.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="text-6xl mb-4">✨</div>
                                        <h3 className="text-xl font-semibold mb-2">No Pending Changes</h3>
                                        <p className="text-gray-400 mb-4">
                                            All changes are committed. Execute queries to see uncommitted changes here.
                                        </p>
                                        <Link
                                            href={`/query?connection=${connectionId}`}
                                            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                                        >
                                            Go to Query Editor
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pending.map((change, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span
                                                                className={`px-2 py-1 text-xs rounded font-semibold ${change.type === 'SCHEMA'
                                                                    ? 'bg-purple-500/20 text-purple-400'
                                                                    : 'bg-green-500/20 text-green-400'
                                                                    }`}
                                                            >
                                                                {change.type}
                                                            </span>
                                                            <span className="font-mono text-sm text-yellow-400">{change.operation}</span>
                                                        </div>
                                                        <h3 className="font-semibold mb-1">{change.description}</h3>
                                                        <p className="text-sm text-gray-400 mb-2">Table: {change.target}</p>
                                                        {change.query && (
                                                            <div className="bg-black/30 p-2 rounded font-mono text-xs overflow-x-auto">
                                                                <pre className="text-green-400">{change.query}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => createCommit([change], `${change.operation} ${change.target}`)}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition shrink-0"
                                                        title="Commit this change only"
                                                    >
                                                        💾 Commit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">📜 Complete History</h2>

                                {commits.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="text-6xl mb-4">📜</div>
                                        <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
                                        <p className="text-gray-400">Start making changes to build your history</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>

                                        <div className="space-y-8">
                                            {commits.map((commit, idx) => (
                                                <div key={commit.id} className="relative pl-20">
                                                    {/* Timeline dot */}
                                                    <div className="absolute left-6 top-2 w-5 h-5 bg-blue-500 rounded-full border-4 border-gray-900"></div>

                                                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded font-mono text-sm">
                                                                        r{-idx}
                                                                    </span>
                                                                    <h3 className="font-semibold text-lg">{commit.message}</h3>
                                                                </div>
                                                                <p className="text-sm text-gray-400 mt-1">
                                                                    by {commit.author?.name}
                                                                    {commit.branchName && (
                                                                        <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs">
                                                                            on {commit.branchName}
                                                                        </span>
                                                                    )}
                                                                    {(commit.author as any)?.userId && (
                                                                        <span className="ml-1 text-purple-400">
                                                                            ({(commit.author as any).userId})
                                                                        </span>
                                                                    )}
                                                                    {' • '}{new Date(commit.timestamp).toLocaleDateString()} at {new Date(commit.timestamp).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                                <button
                                                                    onClick={() => revertCommit(commit.id, commit.message)}
                                                                    className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded border border-red-500/30 transition"
                                                                >
                                                                    ⏪ Revert
                                                                </button>
                                                                <code className="text-xs bg-gray-900 px-2 py-1 rounded">
                                                                    {commit.id?.substring(0, 8)}
                                                                </code>
                                                            </div>
                                                        </div>

                                                        <div className="text-sm text-gray-300 mb-2">
                                                            {commit.changes?.length || 0} changes
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedCommit(commit);
                                                                setShowDiff(true);
                                                                setActiveTab('commits');
                                                            }}
                                                            className="text-sm text-blue-400 hover:text-blue-300"
                                                        >
                                                            View full details →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="mt-12 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                            <h3 className="text-xl font-bold mb-4">🚀 Quick Actions</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <Link
                                    href={`/query?connection=${connectionId}`}
                                    className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition"
                                >
                                    <div className="text-2xl mb-2">📝</div>
                                    <h4 className="font-semibold">Query Editor</h4>
                                    <p className="text-sm text-gray-400">Execute queries and track changes</p>
                                </Link>
                                <button
                                    onClick={() => createCommit()}
                                    disabled={pending.length === 0}
                                    className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition text-left disabled:opacity-50"
                                >
                                    <div className="text-2xl mb-2">💾</div>
                                    <h4 className="font-semibold">Create Commit</h4>
                                    <p className="text-sm text-gray-400">{pending.length} pending changes</p>
                                </button>
                                <button
                                    onClick={createBranch}
                                    className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition text-left"
                                >
                                    <div className="text-2xl mb-2">🌿</div>
                                    <h4 className="font-semibold">New Branch</h4>
                                    <p className="text-sm text-gray-400">Experiment safely</p>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
export default function VersionControlPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Version Control...</div>}>
            <VersionControlContent />
        </Suspense>
    );
}

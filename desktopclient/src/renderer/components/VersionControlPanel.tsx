import React, { useState, useEffect } from 'react';
import { GitBranch, History, Check, X, ArrowLeft, Send, Database, Clock, User, ChevronRight, ChevronDown } from 'lucide-react';

interface VCSProps {
    connectionId?: string;
    connection?: any;
    connections?: Record<string, any>;
    onClose: () => void;
    user: any;
}

export const VersionControlPanel: React.FC<VCSProps> = ({ connectionId, connection, connections = {}, onClose, user }) => {
    const [selectedConnId, setSelectedConnId] = useState<string | null>(connectionId || null);
    const [showConnSelect, setShowConnSelect] = useState(!connectionId);

    const [view, setView] = useState<'pending' | 'history'>('pending');
    const [pendingChanges, setPendingChanges] = useState<any[]>([]);
    const [commitHistory, setCommitHistory] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([{ name: 'main' }]);
    const [commitMessage, setCommitMessage] = useState('');
    const [isCommitting, setIsCommitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // If initial connectionId changes (e.g. from parent), update state
    useEffect(() => {
        if (connectionId) {
            setSelectedConnId(connectionId);
            setShowConnSelect(false);
        }
    }, [connectionId]);

    useEffect(() => {
        if (selectedConnId) {
            loadVCSData(selectedConnId);
        }
    }, [selectedConnId]);

    const loadVCSData = async (connId: string) => {
        setIsLoading(true);
        try {
            // @ts-ignore
            const pending = await window.electron.vcs.getPending(connId);
            // @ts-ignore
            let history = await window.electron.vcs.getHistory(connId);
            // @ts-ignore
            const branchList = await window.electron.vcs.getBranches(connId);

            const activeConn_ = connections[connId] || connection;

            // Fetch cloud history if applicable
            if (activeConn_?.isCloud && user) {
                try {
                    const res = await fetch(`http://localhost:3000/api/vcs/commit?connectionId=${connId}`, {
                        headers: {
                            'x-user-email': user.email,
                            'x-org-id': user.organizationId,
                            'x-user-role': user.role
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.commits && Array.isArray(data.commits)) {
                            // Merge or prefer cloud history
                            history = data.commits;
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch cloud VCS:', err);
                }
            }

            setPendingChanges(pending || []);
            setCommitHistory(history || []);
            setBranches(branchList || []);
        } catch (e) {
            console.error('Failed to load VCS data:', e);
            setPendingChanges([]);
            setCommitHistory([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!selectedConnId || !commitMessage.trim() || isCommitting) return;
        setIsCommitting(true);
        try {
            // @ts-ignore
            const success = await window.electron.vcs.commit({
                connectionId: selectedConnId,
                message: commitMessage,
                author: { name: user?.name || 'Anonymous', email: user?.email || '' }
            });

            if (success) {
                setCommitMessage('');
                await loadVCSData(selectedConnId);
            }
        } catch (e) {
            console.error('Commit failed:', e);
        } finally {
            setIsCommitting(false);
        }
    };

    const activeConn = selectedConnId ? connections[selectedConnId] || (connection?.id === selectedConnId ? connection : null) : null;

    return (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-end p-4">
            <div className="w-[500px] h-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                            <GitBranch size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest text-left">Version Control</h3>

                            {/* Connection Selector Trigger */}
                            <div
                                onClick={() => setShowConnSelect(!showConnSelect)}
                                className="flex items-center gap-1 mt-0.5 cursor-pointer hover:bg-white/5 rounded px-1 -ml-1 py-0.5 transition-colors group"
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${activeConn ? 'bg-emerald-500' : 'bg-slate-500'} animate-pulse`} />
                                <span className={`text-[10px] font-bold uppercase tracking-widest truncate max-w-[200px] ${activeConn ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {activeConn ? activeConn.name : 'Select Database'}
                                </span>
                                <ChevronDown size={10} className="text-slate-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Connection Selector Overlay */}
                {showConnSelect && (
                    <div className="flex-1 overflow-y-auto p-2 bg-slate-900 absolute top-[72px] bottom-0 left-0 right-0 z-20 animate-in fade-in slide-in-from-top-4 duration-200">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select a Connection to View History</p>
                        <div className="space-y-1">
                            {Object.values(connections).map((conn: any) => (
                                <div
                                    key={conn.id}
                                    onClick={() => {
                                        setSelectedConnId(conn.id);
                                        setShowConnSelect(false);
                                    }}
                                    className={`flex items-center gap-3 p-3 mx-2 rounded-xl cursor-pointer transition-colors border ${selectedConnId === conn.id ? 'bg-violet-600/10 border-violet-500/30' : 'hover:bg-white/5 border-transparent'}`}
                                >
                                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                                        <Database size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold ${selectedConnId === conn.id ? 'text-violet-400' : 'text-slate-300'}`}>{conn.name}</p>
                                        <p className="text-[10px] text-slate-500">{conn.type} • {conn.host}</p>
                                    </div>
                                    {selectedConnId === conn.id && <Check size={14} className="text-violet-400" />}
                                </div>
                            ))}
                            {Object.keys(connections).length === 0 && (
                                <div className="p-8 text-center text-slate-500 text-xs">No connections found.</div>
                            )}
                        </div>
                    </div>
                )}

                {!selectedConnId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
                        <GitBranch size={48} className="text-slate-700 mb-4" />
                        <p className="text-sm font-bold text-slate-500 uppercase">No Database Selected</p>
                        <button onClick={() => setShowConnSelect(true)} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 uppercase">Select Database</button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex px-6 pt-2 bg-slate-800/10">
                            <button
                                onClick={() => setView('pending')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${view === 'pending' ? 'text-violet-400 border-violet-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                            >
                                Pending Changes ({pendingChanges.length})
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${view === 'history' ? 'text-violet-400 border-violet-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                            >
                                Commit History
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : view === 'pending' ? (
                                <div className="space-y-6">
                                    {pendingChanges.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600 mx-auto mb-4">
                                                <Check size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-400 mb-1">Database is in sync</p>
                                            <p className="text-xs text-slate-600">No schema or data changes detected.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                {pendingChanges.map((change, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-950/50 border border-white/5 rounded-xl flex items-start gap-4">
                                                        <div className={`p-2 rounded-lg ${change.type === 'SCHEMA' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            <Database size={14} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{change.operation} {change.type}</p>
                                                            <p className="text-xs text-white font-medium mb-2 truncate">{change.description}</p>
                                                            <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-500 border border-white/5 overflow-x-auto whitespace-pre">
                                                                {change.query}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Commit Form */}
                                            <div className="mt-8 pt-6 border-t border-white/5">
                                                <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Commit Statement</label>
                                                    <textarea
                                                        value={commitMessage}
                                                        onChange={e => setCommitMessage(e.target.value)}
                                                        placeholder="What did you change? e.g., Added users table for auth..."
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500 transition-colors min-h-[100px] resize-none"
                                                    />
                                                    <button
                                                        onClick={handleCommit}
                                                        disabled={!commitMessage.trim() || isCommitting}
                                                        className="mt-4 w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-violet-900/20"
                                                    >
                                                        {isCommitting ? (
                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <Send size={14} fill="currentColor" />
                                                        )}
                                                        {isCommitting ? 'STAGING CHANGES...' : 'COMMIT & PUSH TO CLOUD'}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {commitHistory.length === 0 ? (
                                        <div className="py-20 text-center opacity-40">
                                            <Clock size={40} className="mx-auto mb-4" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No history found</p>
                                        </div>
                                    ) : (
                                        commitHistory.map((commit, idx) => (
                                            <div key={idx} className="group relative pl-8 pb-8 last:pb-0">
                                                {/* Timeline Line */}
                                                <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10 group-last:bottom-auto group-last:h-4" />

                                                {/* Timeline Dot */}
                                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-violet-500 z-10" />

                                                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 hover:border-violet-500/30 transition-all cursor-pointer">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[9px] font-mono text-violet-400/60 uppercase">{commit.id.split('_')[1]}</span>
                                                        <span className="text-[9px] text-slate-600 font-bold uppercase">{new Date(commit.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-white mb-3 text-left">{commit.message}</p>

                                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 overflow-hidden">
                                                                <User size={10} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400">{commit.author.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                                            {commit.changes.length} changes <ChevronRight size={10} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-4 bg-slate-800/20 border-t border-white/5 text-[9px] text-center text-slate-600 font-bold uppercase tracking-widest">
                            BosDB VCS v1.0 • AES-256 Encrypted Sync
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

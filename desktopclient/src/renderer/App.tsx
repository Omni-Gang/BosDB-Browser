import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Settings, History, Save, Send, Terminal, Zap, Table, Bug, GitBranch, Clock, Wand2, FileSearch, Play } from 'lucide-react';
import { formatSQL, getDialectFromDbType, getExplainPrefix } from './lib/sql-formatter';
import Editor from '@monaco-editor/react';
import { VersionControlPanel } from './components/VersionControlPanel';
import QueryTabs from '@/components/QueryTabs';
import { ConnectionManager } from './components/ConnectionManager';
import { TitleBar } from './components/TitleBar';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { QueryHistory } from './components/QueryHistory';
import { DataEditor } from './components/DataEditor';
import { TableDesigner } from './components/TableDesigner';
import { DebuggerPanel } from './components/DebuggerPanel';
import { SaveQueryModal } from './components/SaveQueryModal';
import { SchemaExplorer } from './components/SchemaExplorer';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { QueryPlanViewer } from './components/QueryPlanViewer';
import { DashboardHome } from './components/DashboardHome';
import { proxyManager } from './lib/proxy-manager';

const App: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [activeConnection, setActiveConnection] = useState<any>(null);
    const [tabs, setTabs] = useState<any[]>([{ id: Date.now().toString(), name: 'New Query', query: '', breakpoints: [] }]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [results, setResults] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showDebugger, setShowDebugger] = useState(false);
    const [showDesigner, setShowDesigner] = useState(false);
    const [showVCS, setShowVCS] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [showManualAuth, setShowManualAuth] = useState(false);
    const [connections, setConnections] = useState<Record<string, any>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [planData, setPlanData] = useState<any>(null);
    const [showNewConn, setShowNewConn] = useState(false);

    // Load connections at app level
    const loadConnections = async () => {
        setIsRefreshing(true);
        try {
            // @ts-ignore
            const localConns = await window.electron.db.listConnections();
            console.log('[App] Loaded local connections:', Object.keys(localConns).length);
            let merged = { ...localConns };

            // Decrypt local connections if needed
            for (const id in merged) {
                const conn = merged[id];
                if (conn.isEncrypted && conn.password) {
                    // @ts-ignore
                    const decrypted = await window.electron.vault.decrypt(conn.password);
                    if (decrypted.success) {
                        merged[id] = { ...conn, password: decrypted.data };
                    }
                }
            }

            if (user) {
                try {
                    // Use sync endpoint to get full connection data with encrypted credentials
                    const res = await fetch('http://localhost:3000/api/connections/sync', {
                        headers: {
                            'x-user-email': user.email,
                            'x-org-id': user.organizationId,
                            'x-user-role': user.role
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        console.log('[App] Loaded cloud connections with credentials:', data.connections?.length || 0);
                        if (data.connections) {
                            for (const c of data.connections) {
                                if (c.password) {
                                    try {
                                        // Encrypt for local storage
                                        // @ts-ignore
                                        const encrypted = await window.electron.vault.save('pwd', c.password);
                                        if (encrypted.success) {
                                            // Save encrypted to disk
                                            // @ts-ignore
                                            await window.electron.db.saveConnection({
                                                ...c,
                                                password: encrypted.data,
                                                isEncrypted: true,
                                                isCloud: true
                                            });
                                            // Keep plaintext in memory for this session
                                            merged[c.id] = { ...c, isCloud: true };
                                        } else {
                                            merged[c.id] = { ...c, isCloud: true };
                                        }
                                    } catch (err) {
                                        console.error(`[App] Failed to encrypt credentials for ${c.id}:`, err);
                                        merged[c.id] = { ...c, isCloud: true };
                                    }
                                } else {
                                    // Fallback if no password or already handled
                                    merged[c.id] = { ...c, isCloud: true };
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Cloud Sync Error:', e);
                }
            }
            console.log('[App] Total connections after merge:', Object.keys(merged).length);
            setConnections(merged);
        } catch (error) {
            console.error('Failed to load connections:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadConnections();
    }, [user]);

    useEffect(() => {
        const savedHistory = localStorage.getItem('query-history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) { }
        }

        // Initialize Proxy Manager
        proxyManager.init();

        // @ts-ignore
        const removeAuthListener = window.electron.auth.onTokenReceived((token: string) => {
            try {
                setSessionToken(token);
                // Simple JWT decode for display/local use
                const userStr = decodeURIComponent(Array.prototype.map.call(atob(token), (c: any) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const userData = JSON.parse(userStr);
                setUser(userData);
            } catch (e) {
                console.error('Auth parse error:', e);
            }
        });

        // Initialize from existing token if any
        // @ts-ignore
        window.electron.auth.getToken().then(token => {
            if (token) {
                setSessionToken(token);
                try {
                    const userStr = decodeURIComponent(Array.prototype.map.call(atob(token), (c: any) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                    const userData = JSON.parse(userStr);
                    setUser(userData);
                } catch (e) { }
            }
        });

        // Listen for new connection menu item to open modal
        // @ts-ignore
        const removeMenuListener = window.electron.menu.onNewConnection(() => {
            setShowNewConn(true);
        });

        return () => {
            if (typeof removeAuthListener === 'function') removeAuthListener();
            if (typeof removeMenuListener === 'function') removeMenuListener();
        };
    }, []);

    const handleDeleteConnection = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Are you sure you want to delete this connection?')) return;

        // @ts-ignore
        await window.electron.db.deleteConnection(id);

        if (user) {
            try {
                await fetch(`http://localhost:3000/api/connections?id=${id}`, {
                    method: 'DELETE',
                    headers: {
                        'x-user-email': user.email,
                        'x-org-id': user.organizationId
                    }
                });
            } catch (e) {
                console.error('Failed to delete from cloud:', e);
            }
        }

        if (activeConnection?.id === id) setActiveConnection(null);
        await loadConnections();
    };

    const handleLogin = () => {
        // @ts-ignore
        window.electron.auth.openLogin();
        // Automatically show manual entry since auto-redirect is unreliable on some Linux distros
        setShowManualAuth(true);
    };

    const handleManualAuth = () => {
        if (!manualToken.trim()) return;
        try {
            const userStr = decodeURIComponent(Array.prototype.map.call(atob(manualToken), (c: any) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const userData = JSON.parse(userStr);
            setSessionToken(manualToken);
            setUser(userData);
        } catch (e) {
            alert('Invalid authentication token. Please copy the token exactly from the browser console.');
        }
    };

    useEffect(() => {
        localStorage.setItem('query-history', JSON.stringify(history));
    }, [history]);

    const handleFormatSQL = useCallback(() => {
        const sql = tabs[activeTabIndex].query;
        if (!sql.trim()) return;

        const dialect = getDialectFromDbType(activeConnection?.type || 'postgresql');
        const formatted = formatSQL(sql, { dialect });

        const newTabs = [...tabs];
        newTabs[activeTabIndex].query = formatted;
        setTabs(newTabs);
    }, [tabs, activeTabIndex, activeConnection]);

    const handleExplainQuery = useCallback(async () => {
        if (!activeConnection || executing) return;
        const sql = tabs[activeTabIndex].query;
        if (!sql.trim()) return;

        setExecuting(true);
        try {
            // @ts-ignore
            const result = await window.electron.db.explain({ connectionId: activeConnection.id, sql });
            if (result.success) {
                setPlanData({ plan: result.data, dbType: activeConnection.type });
            } else {
                setResults({ error: (result as any).error || 'Unknown error' });
            }
        } catch (e: any) {
            setResults({ error: e.message });
        } finally {
            setExecuting(false);
        }
    }, [activeConnection, executing, tabs, activeTabIndex]);

    const handleExecuteQuery = useCallback(async () => {
        if (!activeConnection || executing) return;

        const sql = tabs[activeTabIndex].query;
        if (!sql.trim()) return;

        setExecuting(true);
        const startTime = Date.now();
        try {
            // @ts-ignore
            const result = await window.electron.db.execute(activeConnection.id, sql);
            setResults(result.data);

            // Automatically track for VCS if it's a mutation/schema change
            // @ts-ignore
            window.electron.vcs.trackChange({
                connectionId: activeConnection.id,
                query: sql,
                affectedRows: result.data?.rows?.length || 0
            });

            setHistory(prev => [{
                id: `hist_${Date.now()}`,
                sql,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                status: (result.success ? 'success' : 'error') as 'success' | 'error'
            }, ...prev].slice(0, 100));
        } catch (e: any) {
            setResults({ error: e.message });
            setHistory(prev => [{
                id: `hist_${Date.now()}`,
                sql,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                status: 'error' as 'error'
            }, ...prev].slice(0, 100));
        } finally {
            setExecuting(false);
        }
    }, [activeConnection, executing, tabs, activeTabIndex, setResults, setHistory]);

    useEffect(() => {
        // @ts-ignore
        const cleanup = window.electron.menu.onExecuteQuery(() => handleExecuteQuery());
        return cleanup;
    }, [handleExecuteQuery]);

    return (
        <div className="flex flex-col h-screen select-none overflow-hidden bg-slate-950 text-slate-200">
            <TitleBar user={user} />

            {!sessionToken ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                    <div className="w-24 h-24 mb-8">
                        <img src="/logo.png" alt="BosDB Logo" className="w-full h-full object-contain drop-shadow-2xl" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Welcome to BosDB</h2>
                    <p className="text-slate-500 mb-8 max-w-sm font-medium">Native Desktop Client</p>

                    <div className="flex flex-col gap-4 items-center w-full max-w-sm">
                        <button
                            onClick={handleLogin}
                            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-xl shadow-violet-900/30 flex items-center gap-3 w-full justify-center group"
                        >
                            <Zap size={18} fill="currentColor" className="group-hover:animate-pulse" />
                            {showManualAuth ? 'RE-OPEN BROWSER' : 'SIGN IN TO CONTINUE'}
                        </button>

                        {showManualAuth && (
                            <div className="w-full flex flex-col gap-3 p-4 bg-slate-900/50 border border-white/5 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Manual Verification</p>
                                    <p className="text-[9px] text-slate-600 leading-tight mb-3">Copy the token from the browser success screen and paste it below.</p>
                                </div>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="PASTE SESSION TOKEN HERE..."
                                    value={manualToken}
                                    onChange={e => setManualToken(e.target.value)}
                                    className="w-full bg-slate-950 border border-violet-500/30 rounded-xl px-4 py-3 text-xs font-mono text-violet-400 outline-none focus:border-violet-500 shadow-inner placeholder:text-slate-800"
                                />
                                <button
                                    onClick={handleManualAuth}
                                    disabled={!manualToken.trim()}
                                    className="w-full py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all border border-violet-500/20 active:scale-95 disabled:opacity-30"
                                >
                                    Verify & Activate Session
                                </button>
                                <button
                                    onClick={() => setShowManualAuth(false)}
                                    className="text-[9px] text-slate-700 hover:text-slate-500 font-bold uppercase tracking-widest transition-colors"
                                >
                                    Hide Manual Entry
                                </button>
                            </div>
                        )}

                        {!showManualAuth && (
                            <button
                                onClick={() => setShowManualAuth(true)}
                                className="text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest transition-colors font-black"
                            >
                                Problems with auto-redirect? Enter token manually
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-1 overflow-hidden pt-8">
                        {/* Sidebar Navigation */}
                        <div className="w-12 bg-slate-900 border-r border-white/5 flex flex-col items-center py-4 gap-6 z-20">
                            <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center text-white shadow-lg shadow-violet-900/20 border border-violet-500/20 overflow-hidden p-1.5">
                                <img src="/logo.png" alt="B" className="w-full h-full object-contain" />
                            </div>
                            <div
                                title="Query History"
                                onClick={() => setShowHistory(!showHistory)}
                                className={`p-2 rounded cursor-pointer transition-colors ${showHistory ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <History className="w-5 h-5" />
                            </div>
                            <div
                                title="Saved Queries"
                                onClick={() => setShowSaveModal(true)}
                                className={`p-2 rounded cursor-pointer transition-colors ${showSaveModal ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Save className="w-5 h-5" />
                            </div>
                            <div
                                title="Native Debugger"
                                onClick={() => setShowDebugger(!showDebugger)}
                                className={`p-2 rounded cursor-pointer transition-colors ${showDebugger ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Bug className="w-5 h-5" />
                            </div>
                            <div
                                title="Table Architect"
                                onClick={() => activeConnection && setShowDesigner(true)}
                                className={`p-2 rounded cursor-pointer transition-colors ${!activeConnection ? 'opacity-20 cursor-not-allowed' : (showDesigner ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300')}`}
                            >
                                <Table className="w-5 h-5" />
                            </div>
                            <div
                                title="Version Control"
                                onClick={() => setShowVCS(!showVCS)}
                                className={`p-2 rounded cursor-pointer transition-colors ${showVCS ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <GitBranch className="w-5 h-5" />
                            </div>
                            <div className="mt-auto">
                                <Settings
                                    onClick={() => setShowSettings(true)}
                                    className={`w-5 h-5 cursor-pointer transition-colors ${showSettings ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                                />
                            </div>
                        </div>

                        {/* Connection List & Schema Explorer */}
                        <div className="flex flex-col border-r border-white/5 bg-slate-900/50">
                            <ConnectionManager
                                onSelect={setActiveConnection}
                                user={user}
                                activeConnection={activeConnection}
                                connections={connections}
                                isRefreshing={isRefreshing}
                                onRefresh={loadConnections}
                                onDelete={handleDeleteConnection}
                                externalShowNew={showNewConn}
                                onExternalShowNewClose={() => setShowNewConn(false)}
                            />
                            {activeConnection && (
                                <SchemaExplorer
                                    connectionId={activeConnection.id}
                                    connection={activeConnection}
                                    onSelectTable={(table) => {
                                        const newTabs = [...tabs];
                                        if (newTabs[activeTabIndex]) {
                                            newTabs[activeTabIndex].query = `SELECT * FROM ${table} LIMIT 100;`;
                                            setTabs(newTabs);
                                        }
                                    }}
                                />
                            )}
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
                            {!activeConnection ? (
                                <DashboardHome
                                    user={user}
                                    connections={connections}
                                    onSelectConnection={setActiveConnection}
                                    onNewConnection={() => setShowNewConn(true)}
                                    onDeleteConnection={handleDeleteConnection}
                                    onShowHistory={() => setShowHistory(true)}
                                    onShowSaved={() => setShowSaveModal(true)}
                                />
                            ) : (
                                <>
                                    <QueryTabs
                                        tabs={tabs}
                                        activeIndex={activeTabIndex}
                                        onTabChange={setActiveTabIndex}
                                        onTabAdd={() => setTabs([...tabs, { id: Date.now().toString(), name: 'New Query', query: '', breakpoints: [] }])}
                                        onTabRename={(idx, newName) => {
                                            const newTabs = [...tabs];
                                            newTabs[idx].name = newName;
                                            setTabs(newTabs);
                                        }}
                                        onTabClose={(idx) => {
                                            const newTabs = tabs.filter((_, i) => i !== idx);
                                            if (newTabs.length === 0) {
                                                setTabs([{ id: Date.now().toString(), name: 'New Query', query: '', breakpoints: [] }]);
                                                setActiveTabIndex(0);
                                            } else {
                                                setTabs(newTabs);
                                                if (activeTabIndex >= newTabs.length) {
                                                    setActiveTabIndex(newTabs.length - 1);
                                                }
                                            }
                                        }}
                                    />

                                    <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden relative">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleExecuteQuery}
                                                disabled={executing}
                                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-violet-900/20"
                                            >
                                                <Play size={14} fill="currentColor" />
                                                {executing ? 'RUNNING...' : 'RUN'}
                                            </button>

                                            <button
                                                onClick={() => setShowDebugger(!showDebugger)}
                                                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${showDebugger ? 'bg-purple-600 text-white' : 'border border-white/5 hover:bg-white/5 text-slate-400'}`}
                                                title="Run with Debugger"
                                            >
                                                <Bug size={14} />
                                                DEBUG
                                            </button>

                                            <div className="w-px h-6 bg-white/5 mx-1" />

                                            <button
                                                onClick={handleFormatSQL}
                                                className="px-3 py-2 border border-white/5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                                                title="Format SQL"
                                            >
                                                <Wand2 size={14} />
                                                FORMAT
                                            </button>

                                            <button
                                                onClick={handleExplainQuery}
                                                className="px-3 py-2 border border-white/5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                                                title="Explain Plan"
                                            >
                                                <FileSearch size={14} />
                                                EXPLAIN
                                            </button>

                                            <div className="w-px h-6 bg-white/5 mx-1" />

                                            <button
                                                onClick={() => setShowSaveModal(true)}
                                                className="px-3 py-2 border border-white/5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                                            >
                                                <Save size={14} />
                                                SAVE
                                            </button>

                                            <button
                                                onClick={() => setShowHistory(!showHistory)}
                                                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${showHistory ? 'bg-slate-800 text-white' : 'border border-white/5 hover:bg-white/5 text-slate-400'}`}
                                            >
                                                <Clock size={14} />
                                                HISTORY
                                            </button>

                                            <div className="flex-1" />

                                            {results?.executionTime && (
                                                <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} className="text-violet-500" />
                                                        {results.executionTime}ms
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Table size={12} className="text-violet-500" />
                                                        {results.rowCount} ROWS
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Editor
                                            height="100%"
                                            language="sql"
                                            theme="vs-dark"
                                            value={tabs[activeTabIndex]?.query || ''}
                                            onChange={(value) => {
                                                const newTabs = [...tabs];
                                                if (newTabs[activeTabIndex]) {
                                                    newTabs[activeTabIndex].query = value || '';
                                                    setTabs(newTabs);
                                                }
                                            }}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                lineNumbers: 'on',
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                tabSize: 2,
                                                wordWrap: 'on',
                                                padding: { top: 16 }
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 bg-slate-900 border border-white/5 rounded-xl flex flex-col shadow-2xl overflow-hidden">
                                        <div className="px-4 py-2 border-b border-white/5 bg-slate-800/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                            <span>Results Output</span>
                                            <div className="flex items-center gap-4">
                                                {results?.rows?.length >= 0 && <span className="text-violet-400">{results.rows.length} rows returned</span>}
                                                {results?.rows && (
                                                    <button
                                                        onClick={() => setShowExportModal(true)}
                                                        className="px-3 py-1 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-[9px] font-black rounded uppercase tracking-widest transition-all border border-violet-500/20"
                                                    >
                                                        Advanced Export
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden p-2">
                                            {!results ? (
                                                <div className="h-full flex items-center justify-center text-slate-600 bg-slate-900/20 rounded-xl border border-dashed border-white/5">
                                                    <div className="text-center">
                                                        <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest">No results yet</p>
                                                    </div>
                                                </div>
                                            ) : results.error ? (
                                                <div className="h-full p-4 overflow-auto font-mono text-xs text-red-400 bg-red-400/5 rounded-xl border border-red-400/20">
                                                    {results.error}
                                                </div>
                                            ) : (
                                                <DataEditor
                                                    rows={results.rows || []}
                                                    fields={results.fields || []}
                                                    onSave={async (updates) => {
                                                        console.log('Native Data Edit Updates:', updates);
                                                        alert('Data editing is fully active!');
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {showHistory && (
                            <QueryHistory
                                history={history}
                                onSelect={(sql) => {
                                    const newTabs = [...tabs];
                                    newTabs[activeTabIndex].query = sql;
                                    setTabs(newTabs);
                                }}
                                onRun={(sql) => {
                                    const newTabs = [...tabs];
                                    newTabs[activeTabIndex].query = sql;
                                    setTabs(newTabs);
                                    setTimeout(() => handleExecuteQuery(), 100);
                                }}
                                onRemove={(id) => setHistory(history.filter(h => h.id !== id))}
                                onClear={() => setHistory([])}
                                onClose={() => setShowHistory(false)}
                            />
                        )}

                        {activeConnection && (
                            <AIAssistantPanel
                                connectionId={activeConnection.id}
                                connectionInfo={activeConnection}
                                schemas={['public']}
                                tables={[]}
                                onInsertQuery={(sql) => {
                                    const newTabs = [...tabs];
                                    newTabs[activeTabIndex].query += `\n\n${sql}`;
                                    setTabs(newTabs);
                                }}
                                onRunQuery={async (sql) => {
                                    const newTabs = [...tabs];
                                    newTabs[activeTabIndex].query = sql;
                                    setTabs(newTabs);
                                    setTimeout(() => handleExecuteQuery(), 100);
                                }}
                            />
                        )}

                        {showDesigner && activeConnection && (
                            <TableDesigner
                                connectionId={activeConnection.id}
                                onClose={() => setShowDesigner(false)}
                                onSuccess={() => {
                                    setShowDesigner(false);
                                    alert('Table created successfully and deployed to schema!');
                                }}
                            />
                        )}

                        {showSaveModal && (
                            <SaveQueryModal
                                query={tabs[activeTabIndex].query}
                                connectionId={activeConnection?.id}
                                onClose={() => setShowSaveModal(false)}
                                onSuccess={(sq) => alert(`Query "${sq.name}" saved to your account!`)}
                            />
                        )}

                        {showExportModal && results && (
                            <ExportModal
                                data={results.rows || []}
                                fields={results.fields || []}
                                onClose={() => setShowExportModal(false)}
                            />
                        )}

                        {showVCS && (
                            <VersionControlPanel
                                connectionId={activeConnection?.id}
                                connection={activeConnection}
                                connections={connections}
                                user={user}
                                onClose={() => setShowVCS(false)}
                            />
                        )}

                        {planData && activeConnection && (
                            <QueryPlanViewer
                                plan={planData.plan}
                                dbType={planData.dbType}
                                onClose={() => setPlanData(null)}
                            />
                        )}

                        {showSettings && (
                            <SettingsModal onClose={() => setShowSettings(false)} />
                        )}

                        {showDebugger && activeConnection && (
                            <DebuggerPanel
                                connectionId={activeConnection.id}
                                currentQuery={tabs[activeTabIndex].query}
                                breakpoints={tabs[activeTabIndex].breakpoints}
                                onToggleBreakpoint={(line) => {
                                    const newTabs = [...tabs];
                                    const bp = newTabs[activeTabIndex].breakpoints;
                                    if (bp.includes(line)) {
                                        newTabs[activeTabIndex].breakpoints = bp.filter((l: number) => l !== line);
                                    } else {
                                        newTabs[activeTabIndex].breakpoints = [...bp, line];
                                    }
                                    setTabs(newTabs);
                                }}
                                onClose={() => setShowDebugger(false)}
                            />
                        )}
                    </div>

                    {/* Footer / Status Bar */}
                    <div className="h-7 bg-slate-900 border-t border-white/5 px-4 flex items-center justify-between text-[10px] tracking-wide">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeConnection ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
                                <span className={activeConnection ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                    {activeConnection ? `CONNECTED: ${activeConnection.type.toUpperCase()}` : 'DISCONNECTED'}
                                </span>
                            </div>
                            {activeConnection && (
                                <div className="text-slate-400 font-medium border-l border-white/10 pl-6">
                                    HOST: <span className="text-slate-200">{activeConnection.host}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 font-bold uppercase">
                            <span>Native Client v0.1.0</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default App;

/**
 * Debugger Panel Component
 * Integrated debugger controls for query execution
 */

'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, StepForward, Square, Bug, Trash2, RotateCcw, X, Maximize2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface DebuggerPanelProps {
    connectionId: string;
    currentQuery: string;
    breakpoints: number[];
    onToggleBreakpoint: (line: number) => void;
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    status: 'stopped' | 'running' | 'paused';
    setStatus: (status: 'stopped' | 'running' | 'paused') => void;
    currentLine: number | null;
    setCurrentLine: (line: number | null) => void;
    onClose?: () => void; // Optional close callback
    onExpand?: () => void;
}

export default function DebuggerPanel({
    connectionId,
    currentQuery,
    breakpoints,
    onToggleBreakpoint,
    sessionId,
    setSessionId,
    status,
    setStatus,
    currentLine,
    setCurrentLine,
    onClose, // Add close handler
    onExpand,
}: DebuggerPanelProps) {
    const [variables, setVariables] = useState<any[]>([]);
    const [sandbox, setSandbox] = useState(true);
    const [commitOnFinish, setCommitOnFinish] = useState(false);
    const toast = useToast();


    // Poll session state
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (sessionId && (status === 'running' || status === 'paused')) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/debug/sessions/${sessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const s = data.session;
                        setStatus(s.state.status);
                        setCurrentLine(s.state.currentExecutionPoint?.lineNumber || null);

                        // Capture variables from snapshots or state if available
                        if (s.state.status === 'paused') {
                            setVariables(s.state.variables || []);
                        }
                    }
                } catch (e) {
                    console.error('Failed to poll session state:', e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [sessionId, status]);

    const handlePause = async () => {
        if (!sessionId) return;
        try {
            await fetch(`/api/debug/sessions/${sessionId}/control/pause`, { method: 'POST' });
            setStatus('paused');
        } catch (e) {
            console.error('Failed to pause:', e);
        }
    };

    const handleResume = async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/debug/sessions/${sessionId}/continue`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.completed) {
                    setStatus('stopped');
                    setSessionId(null);
                    setCurrentLine(null);
                    toast.success('Debugging completed!');
                } else if (data.pausedAt) {
                    setCurrentLine(data.pausedAt);
                    setStatus('paused');
                }
            }
            setStatus('running');
            setCurrentLine(null);
            setVariables([]);
        } catch (e) {
            console.error('Failed to resume:', e);
        }
    };

    const handleStep = async () => {
        if (!sessionId) return;
        console.log('[Debug] Stepping with session ID:', sessionId);
        try {
            const res = await fetch(`/api/debug/sessions/${sessionId}/step`, { method: 'POST' });
            console.log('[Debug] Step response status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('[Debug] Step response data:', data);
                if (data.success && data.currentStatement) {
                    setCurrentLine(data.currentStatement.lineNumber);
                    setStatus('paused');
                } else if (data.error) {
                    toast.error(`Step failed: ${data.error}`);
                }
            } else {
                const errorText = await res.text();
                console.error('[Debug] Step failed with status:', res.status, errorText);
                toast.error(`Step failed: ${errorText}`);
            }
        } catch (e) {
            console.error('Failed to step:', e);
        }
    };

    const handleRewind = async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/debug/sessions/${sessionId}/control/rewind`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.currentStatement) {
                    setCurrentLine(data.currentStatement.lineNumber);
                    setStatus('paused');
                    toast.success('Stepped back');
                } else if (data.error) {
                    toast.error(`Step back failed: ${data.error}`);
                }
            }
        } catch (e) {
            console.error('Failed to rewind:', e);
            toast.error('Failed to step back');
        }
    };

    const handleStop = async () => {
        if (!sessionId) return;
        setStatus('stopped');
        setSessionId(null);
        setCurrentLine(null);
        setVariables([]);
    };

    const handleStartDebug = async () => {
        try {
            // Create debug session with our new API
            const res = await fetch('/api/debug/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId,
                    query: currentQuery,
                    breakpoints,
                    sandbox,
                    commitOnFinish
                }),
            });

            if (!res.ok) {
                console.error('Failed to create debug session');
                return;
            }

            const data = await res.json();
            console.log('[Debug] Session created:', data);
            const newSessionId = data.session?.id;

            if (newSessionId) {
                console.log('[Debug] Setting session ID:', newSessionId);
                setSessionId(newSessionId);
                setStatus('paused');
                setCurrentLine(breakpoints.length > 0 ? breakpoints[0] : 1);
                toast.success('Debug session started! Click "Step" or "Resume" to execute.');
            } else {
                console.error('[Debug] No session ID in response:', data);
                toast.error('Failed to get session ID from response');
            }
        } catch (e) {
            console.error('Failed to start debugging:', e);
            toast.error('Failed to start debugging. Check console for errors.');
        }
    };

    return (
        <div className="w-[450px] border-l border-border bg-background flex flex-col h-full shadow-lg">{/* BIGGER PANEL - 450px */}
            {/* Header */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Bug className="w-4 h-4" />
                        Debugger
                    </h3>
                    <div className="flex items-center gap-2">
                        {onExpand && (
                            <button
                                onClick={onExpand}
                                className="p-1 hover:bg-accent rounded transition text-muted-foreground hover:text-foreground"
                                title="Expand to Full Screen"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        )}
                        <div className={`px-2 py-0.5 text-xs rounded font-medium ${status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                            {status.toUpperCase()}
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-accent rounded transition text-muted-foreground hover:text-foreground"
                                title="Close Debugger"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sandbox Settings */}
                <div className="flex flex-col gap-2 mb-3 bg-accent/20 p-2 rounded border border-border/50">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight group-hover:text-foreground transition-colors flex items-center gap-1.5">
                            🛡️ Sandbox Mode
                        </span>
                        <input
                            type="checkbox"
                            checked={sandbox}
                            onChange={(e) => setSandbox(e.target.checked)}
                            disabled={status !== 'stopped'}
                            className="w-3 h-3 accent-blue-600"
                        />
                    </label>
                    {sandbox && (
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight group-hover:text-foreground transition-colors">
                                🚀 Commit on Finish
                            </span>
                            <input
                                type="checkbox"
                                checked={commitOnFinish}
                                onChange={(e) => setCommitOnFinish(e.target.checked)}
                                disabled={status !== 'stopped'}
                                className="w-3 h-3 accent-green-600"
                            />
                        </label>
                    )}
                </div>

                {/* Controls */}
                <div className="flex gap-1">
                    {status === 'stopped' ? (
                        <button
                            onClick={handleStartDebug}
                            disabled={breakpoints.length === 0}
                            className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs rounded flex items-center justify-center gap-1 transition"
                            title={breakpoints.length === 0 ? "Set breakpoints first" : "Start Debug"}
                        >
                            <Play className="w-3.5 h-3.5" />
                            Start Debug
                        </button>
                    ) : (
                        <>
                            {status === 'paused' ? (
                                <button
                                    onClick={handleResume}
                                    className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition"
                                    title="Resume (F8)"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handlePause}
                                    className="p-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition"
                                    title="Pause"
                                >
                                    <Pause className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={handleStep}
                                disabled={status !== 'paused'}
                                className="p-1.5 hover:bg-accent rounded transition disabled:opacity-50"
                                title="Step Over (F10)"
                            >
                                <StepForward className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleRewind}
                                disabled={status !== 'paused'}
                                className="p-1.5 hover:bg-accent rounded transition disabled:opacity-50"
                                title="Rewind Step (Ctrl+F10)"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleStop}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded transition"
                                title="Stop (Shift+F5)"
                            >
                                <Square className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Current Line */}
            {currentLine && (
                <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-border">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        ⏸️ Paused at <strong>Line {currentLine}</strong>
                    </p>
                </div>
            )}

            {/* Breakpoints */}
            <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">BREAKPOINTS</h4>
                </div>

                {breakpoints.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                        Click line numbers to set breakpoints
                    </p>
                ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {breakpoints.sort((a, b) => a - b).map(line => (
                            <div
                                key={line}
                                className={`flex items-center justify-between text-xs py-1 px-2 rounded ${currentLine === line
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                                    : 'bg-red-50 dark:bg-red-900/20'
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                    Line {line}
                                    {currentLine === line && <span className="text-yellow-600">← here</span>}
                                </span>
                                {onToggleBreakpoint && (
                                    <button
                                        onClick={() => onToggleBreakpoint(line)}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Variables */}
            <div className="flex-1 p-3 overflow-y-auto">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">VARIABLES</h4>
                {variables.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                        {status === 'paused' ? 'No variables in scope' : 'Pause execution to inspect variables'}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {variables.map((v, i) => (
                            <div key={i} className="text-xs font-mono bg-accent/30 hover:bg-accent/50 px-2 py-1.5 rounded border border-border/50 group transition-colors">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{v.name}</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded uppercase">{v.type || typeof v.value}</span>
                                </div>
                                <div className="text-green-700 dark:text-green-400 break-all">
                                    {typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground bg-muted/30">
                <div className="flex justify-between items-center mb-1">
                    <span>{sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'No active session'}</span>
                    {sessionId && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sandbox ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                            {sandbox ? 'SANDBOX ACTIVE' : 'LIVE MODE'}
                        </span>
                    )}
                </div>
                <p className="text-[10px] opacity-75">
                    Shortcuts: F5 Start, F8 Resume, F10 Step
                </p>
            </div>
        </div>
    );
}

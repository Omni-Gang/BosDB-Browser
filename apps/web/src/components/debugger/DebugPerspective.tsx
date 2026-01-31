import React, { useState, useEffect } from 'react';
import { Play, Pause, StepForward, RotateCcw, X, Square, Database, Bug, Clock } from 'lucide-react';

interface DebugPerspectiveProps {
    onClose: () => void;
    sessionId: string | null;
    connectionId: string;
    query: string;
}

const DebugPerspective: React.FC<DebugPerspectiveProps> = ({
    onClose,
    sessionId,
    connectionId, // used in header or for session context
    query
}) => {
    const [status, setStatus] = useState<'stopped' | 'running' | 'paused'>('paused');
    const [currentLine, setCurrentLine] = useState<number | null>(1);
    const [variables, setVariables] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isSandbox, setIsSandbox] = useState(true);

    // Poll session state
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (sessionId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/debug/sessions/${sessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const s = data.session;
                        setStatus(s.state.status);
                        setCurrentLine(s.state.currentExecutionPoint?.lineNumber || null);
                        setVariables(s.state.variables || []);
                        setHistory(s.snapshots || []);
                        setIsSandbox(s.sandbox);
                    }
                } catch (e) {
                    console.error('Failed to poll session state:', e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleAction = async (action: string) => {
        if (!sessionId) return;
        try {
            const endpoint = action === 'step' ? 'step' : `control/${action}`;
            const method = 'POST';
            const res = await fetch(`/api/debug/sessions/${sessionId}/${endpoint}`, { method });
            if (res.ok) {
                const data = await res.json();
                if (data.currentStatement) {
                    setCurrentLine(data.currentStatement.lineNumber);
                }
            }
        } catch (e) {
            console.error(`Action ${action} failed:`, e);
        }
    };

    const lines = query.split('\n');

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden font-sans">
            {/* Header / Top Bar */}
            <div className="h-14 border-b border-slate-700 flex items-center px-6 justify-between bg-slate-800/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Bug className="w-5 h-5 text-blue-400" />
                        <span className="font-bold text-lg tracking-tight">Full-Screen Debugger</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700" />
                    <div className="text-sm text-slate-400 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Session: {sessionId?.slice(0, 8)}...
                        </div>
                        <div className="text-[10px] opacity-60 font-mono">
                            Conn: {connectionId}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 text-xs rounded-full font-semibold uppercase tracking-wider ${status === 'running' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        status === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                        {status}
                    </div>
                    {sessionId && (
                        <div className={`px-3 py-1 text-[10px] rounded-full font-bold border ${isSandbox ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>
                            {isSandbox ? '🛡️ SANDBOX ACTIVE' : '⚠️ LIVE MODE'}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                        title="Close Full Screen"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main: Source Code */}
                <div className="flex-1 flex flex-col bg-[#0d1117]">
                    {/* Controls Bar */}
                    <div className="h-12 border-b border-slate-800 flex items-center px-4 space-x-2 bg-slate-900/50">
                        <button
                            onClick={() => handleAction('continue')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition active:scale-95 shadow-lg shadow-green-900/20"
                        >
                            <Play className="w-4 h-4 fill-current" /> Continue
                        </button>
                        <button
                            onClick={() => handleAction('step')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition active:scale-95"
                        >
                            <StepForward className="w-4 h-4" /> Step Over
                        </button>
                        <button
                            onClick={() => handleAction('rewind')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition active:scale-95 text-yellow-400"
                        >
                            <RotateCcw className="w-4 h-4" /> Step Back
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={async () => {
                                if (sessionId) {
                                    await fetch(`/api/debug/sessions/${sessionId}`, { method: 'DELETE' });
                                }
                                onClose();
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-md text-sm font-medium transition"
                        >
                            <Square className="w-4 h-4 fill-current" /> Terminate
                        </button>
                    </div>

                    {/* Editor / Source Viewer */}
                    <div className="flex-1 overflow-auto font-mono text-[14px] leading-6 scrollbar-thin scrollbar-thumb-slate-700">
                        <div className="flex min-w-full">
                            {/* Line Numbers */}
                            <div className="w-12 text-slate-600 text-right pr-4 pt-4 border-r border-slate-800 select-none bg-slate-900/20">
                                {lines.map((_, i) => (
                                    <div key={i} className={`h-6 ${currentLine === i + 1 ? 'text-yellow-400 font-bold' : ''}`}>
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            {/* Code Area */}
                            <div className="flex-1 pt-4 relative">
                                {lines.map((line, i) => (
                                    <div
                                        key={i}
                                        className={`h-6 px-4 whitespace-pre border-l-4 transition-colors ${currentLine === i + 1
                                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-100'
                                            : 'border-transparent hover:bg-slate-800/30 text-slate-300'
                                            }`}
                                    >
                                        {line || ' '}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Slider */}
                    <div className="h-20 border-t border-slate-800 p-6 bg-slate-900/80 backdrop-blur-sm flex items-center space-x-6">
                        <div className="flex items-center gap-2 text-slate-400 min-w-fit">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-widest">History</span>
                        </div>
                        <div className="flex-1 relative group py-2">
                            <input
                                type="range"
                                min="0"
                                max={Math.max(0, history.length - 1)}
                                value={historyIndex}
                                onChange={(e) => {
                                    const idx = parseInt(e.target.value);
                                    setHistoryIndex(idx);
                                    const snap = history[idx];
                                    if (snap && snap.executionPoint) {
                                        setCurrentLine(snap.executionPoint.lineNumber);
                                    }
                                }}
                                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                            />
                            <div className="absolute -bottom-4 left-0 w-full flex justify-between px-1">
                                <span className="text-[10px] text-slate-500">START</span>
                                <span className="text-[10px] text-slate-500">CURRENT STEP</span>
                            </div>
                        </div>
                        <div className="text-sm font-mono text-blue-400 bg-blue-400/10 px-3 py-1 rounded-md border border-blue-400/20">
                            {historyIndex + 1} / {history.length || 1}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Data Watch */}
                <div className="w-96 border-l border-slate-800 flex flex-col bg-slate-900/40 backdrop-blur-xl">
                    {/* Variables */}
                    <div className="flex-1 flex flex-col border-b border-slate-800/50">
                        <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Database className="w-3.5 h-3.5" /> Variables
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-2">
                            {variables.length === 0 ? (
                                <div className="text-slate-500 italic text-sm text-center py-10 border border-dashed border-slate-800 rounded-lg">
                                    No local variables in scope
                                </div>
                            ) : (
                                variables.map((v, i) => (
                                    <div key={i} className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-blue-400 font-mono tracking-tight">{v.name}</span>
                                            <span className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 rounded uppercase">{v.type || typeof v.value}</span>
                                        </div>
                                        <div className="text-sm font-mono text-slate-200 break-all">
                                            {typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Call Stack Placeholder */}
                    <div className="h-64 flex flex-col shadow-2xl">
                        <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bug className="w-3.5 h-3.5" /> Call Stack
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="flex flex-col gap-1">
                                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-2 text-sm">
                                    <div className="text-blue-200 font-bold">main_procedure</div>
                                    <div className="text-xs text-blue-400/80 font-mono">Line {currentLine}</div>
                                </div>
                                <div className="opacity-50 p-2 text-sm border-l-4 border-slate-700">
                                    <div className="text-slate-300">anonymous block</div>
                                    <div className="text-xs text-slate-500 font-mono">Line 1</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugPerspective;

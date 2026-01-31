
import React, { useState, useEffect } from 'react';
import { Play, Pause, StepForward, Square, Bug, RotateCcw, X, Maximize2, Shield, Activity } from 'lucide-react';

interface DebuggerPanelProps {
    connectionId: string;
    currentQuery: string;
    breakpoints: number[];
    onToggleBreakpoint: (line: number) => void;
    onClose: () => void;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
    connectionId,
    currentQuery,
    breakpoints,
    onToggleBreakpoint,
    onClose
}) => {
    const [status, setStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
    const [currentLine, setCurrentLine] = useState<number | null>(null);
    const [variables, setVariables] = useState<any[]>([]);
    const [sandbox, setSandbox] = useState(true);

    const handleStartDebug = () => {
        setStatus('paused');
        setCurrentLine(breakpoints.length > 0 ? breakpoints[0] : 1);
        // In a real app, we would talk to the main process debug engine
    };

    const handleStop = () => {
        setStatus('stopped');
        setCurrentLine(null);
        setVariables([]);
    };

    const handleStep = () => {
        // Mock stepping
        if (currentLine !== null) {
            setCurrentLine(currentLine + 1);
            setVariables([
                { name: 'row_count', value: Math.floor(Math.random() * 100), type: 'integer' },
                { name: 'last_id', value: 'uuid-' + Math.random().toString(36).substr(2, 9), type: 'uuid' }
            ]);
        }
    };

    return (
        <div className="w-80 bg-slate-900 border-l border-white/5 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-800/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-600/20 text-violet-400 rounded-lg">
                        <Bug size={14} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Debugger</h3>
                        <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Native Session</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Status & Options */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Status</span>
                    <div className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-widest ${status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                            status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-800 text-slate-500'
                        }`}>
                        {status}
                    </div>
                </div>

                <div className="p-3 bg-violet-600/5 rounded-xl border border-violet-500/10 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-200 transition-colors flex items-center gap-2">
                            <Shield size={12} className="text-violet-500" />
                            Sandbox Engine
                        </span>
                        <input
                            type="checkbox"
                            checked={sandbox}
                            onChange={(e) => setSandbox(e.target.checked)}
                            className="accent-violet-600"
                        />
                    </label>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-4 gap-2">
                    {status === 'stopped' ? (
                        <button
                            onClick={handleStartDebug}
                            className="col-span-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-widest shadow-lg shadow-violet-900/40 transition-all active:scale-95"
                        >
                            Start Debug Session
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStatus(status === 'paused' ? 'running' : 'paused')}
                                className={`p-2 rounded-lg flex items-center justify-center transition-all ${status === 'paused' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}
                            >
                                {status === 'paused' ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                            </button>
                            <button
                                onClick={handleStep}
                                className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg flex items-center justify-center"
                            >
                                <StepForward size={16} />
                            </button>
                            <button
                                className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg flex items-center justify-center"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={handleStop}
                                className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                            >
                                <Square size={16} fill="currentColor" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Trace / Variables */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-4">
                    <section>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity size={10} />
                            Active Variables
                        </h4>
                        {variables.length === 0 ? (
                            <div className="p-6 bg-slate-950/50 rounded-xl border border-dashed border-white/5 text-center">
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">No data in scope</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {variables.map((v, i) => (
                                    <div key={i} className="bg-slate-950 p-3 rounded-xl border border-white/5 group hover:border-violet-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">{v.name}</span>
                                            <span className="text-[8px] text-slate-600 bg-slate-800 px-1 rounded uppercase">{v.type}</span>
                                        </div>
                                        <p className="text-[11px] font-mono text-slate-300 break-all">{v.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Breakpoints</h4>
                        <div className="space-y-1">
                            {breakpoints.length === 0 ? (
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest pl-1">No breakpoints set</p>
                            ) : (
                                breakpoints.map(line => (
                                    <div key={line} className="flex items-center justify-between bg-slate-800/20 p-2 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                            <span className="text-[10px] font-bold text-slate-300">Line {line}</span>
                                        </div>
                                        <button onClick={() => onToggleBreakpoint(line)} className="text-slate-500 hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Footer info */}
            <div className="p-4 border-t border-white/5 bg-slate-800/30">
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    Execution Time: <span className="text-slate-400">0.02ms</span>
                </div>
            </div>
        </div>
    );
};

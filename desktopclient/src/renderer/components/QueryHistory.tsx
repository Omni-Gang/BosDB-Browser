
import React from 'react';
import { Clock, Play, Copy, Trash2, Calendar, X } from 'lucide-react';

export interface HistoryItem {
    id: string;
    sql: string;
    timestamp: Date;
    duration: number;
    status: 'success' | 'error';
}

interface QueryHistoryProps {
    history: HistoryItem[];
    onSelect: (sql: string) => void;
    onRun: (sql: string) => void;
    onClear: () => void;
    onRemove: (id: string) => void;
    onClose: () => void;
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({
    history,
    onSelect,
    onRun,
    onClear,
    onRemove,
    onClose
}) => {
    return (
        <div className="fixed left-72 top-8 bottom-7 w-80 bg-slate-900 border-r border-white/5 shadow-2xl z-40 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    Query History
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onClear}
                        className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase tracking-wider transition-colors mr-2"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {history.length === 0 ? (
                    <div className="p-12 text-center text-slate-600">
                        <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No history</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {history.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-white/5 group transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded-sm ${item.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {item.duration}ms
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onRun(item.sql)}
                                            className="p-1 hover:bg-violet-600/20 text-violet-400 rounded transition-colors"
                                            title="Run again"
                                        >
                                            <Play size={10} fill="currentColor" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(item.sql);
                                            }}
                                            className="p-1 hover:bg-white/10 text-slate-300 rounded transition-colors"
                                            title="Copy SQL"
                                        >
                                            <Copy size={10} />
                                        </button>
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="text-xs font-mono text-slate-300 line-clamp-3 cursor-pointer hover:text-violet-400 transition-colors leading-relaxed"
                                    onClick={() => onSelect(item.sql)}
                                >
                                    {item.sql}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

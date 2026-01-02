
import React from 'react';
import { Clock, Play, Copy, Trash2, Calendar } from 'lucide-react';

interface HistoryItem {
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
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({
    history,
    onSelect,
    onRun,
    onClear,
    onRemove
}) => {
    return (
        <div className="flex flex-col h-full bg-background border-l border-border w-80">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Query History
                </h3>
                <button
                    onClick={onClear}
                    className="text-xs text-muted-foreground hover:text-destructive transition"
                >
                    Clear All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {history.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No history yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {history.map((item) => (
                            <div key={item.id} className="p-3 hover:bg-accent/50 group transition">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                        <span className={`px-1 rounded ${item.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {item.duration}ms
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => onRun(item.sql)}
                                            className="p-1 hover:bg-primary/20 text-primary rounded"
                                            title="Run again"
                                        >
                                            <Play className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(item.sql);
                                            }}
                                            className="p-1 hover:bg-accent rounded"
                                            title="Copy SQL"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="p-1 hover:bg-destructive/20 text-destructive rounded"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="text-xs font-mono line-clamp-3 cursor-pointer hover:text-primary transition"
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

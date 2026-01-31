
import React, { useState, useEffect, useRef } from 'react';
import { Save, X, AlertCircle, Edit3, Trash2 } from 'lucide-react';

interface DataEditorProps {
    rows: any[];
    fields: { name: string; dataType: string }[];
    onSave: (updates: any[]) => Promise<void>;
    readOnly?: boolean;
}

interface PendingEdit {
    originalValue: any;
    newValue: any;
}

export const DataEditor: React.FC<DataEditorProps> = ({ rows, fields, onSave, readOnly = false }) => {
    const [edits, setEdits] = useState<Map<string, PendingEdit>>(new Map());
    const [editingCell, setEditingCell] = useState<{ row: number, col: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    const getCellKey = (rowIndex: number, colName: string) => `${rowIndex}:${colName}`;

    const handleCellDoubleClick = (rowIndex: number, colName: string, value: any) => {
        if (readOnly) return;
        setEditingCell({ row: rowIndex, col: colName });
        const pending = edits.get(getCellKey(rowIndex, colName));
        setEditValue(pending ? String(pending.newValue) : String(value ?? ''));
    };

    const commitEdit = () => {
        if (!editingCell) return;
        const { row, col } = editingCell;
        const originalValue = rows[row][col];
        const key = getCellKey(row, col);

        if (String(originalValue) === editValue) {
            const newEdits = new Map(edits);
            newEdits.delete(key);
            setEdits(newEdits);
        } else {
            const newEdits = new Map(edits);
            newEdits.set(key, { originalValue, newValue: editValue });
            setEdits(newEdits);
        }
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        else if (e.key === 'Escape') setEditingCell(null);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="px-4 py-2 bg-slate-800/30 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Edit3 size={12} className="text-violet-400" />
                        Data Grid
                    </span>
                    {edits.size > 0 && (
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                            {edits.size} PENDING EDITS
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {edits.size > 0 && (
                        <>
                            <button
                                onClick={() => setEdits(new Map())}
                                className="px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={() => onSave(Array.from(edits.entries()))}
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-violet-900/20"
                            >
                                <Save size={12} />
                                {isSaving ? 'SAVING...' : 'COMMIT CHANGES'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/10 shadow-sm">
                            <th className="px-3 py-3 w-10 text-center text-[9px] font-bold text-slate-600 uppercase border-r border-white/5">#</th>
                            {fields.map((field) => (
                                <th key={field.name} className="px-4 py-3 text-left border-r border-white/5 last:border-r-0">
                                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{field.name}</div>
                                    <div className="text-[9px] font-medium text-slate-600 lowercase font-mono">{field.dataType}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-white/[0.02] group transition-colors">
                                <td className="px-3 py-2 text-center text-[9px] font-bold text-slate-600 bg-slate-900/30 select-none border-r border-white/5">
                                    {rowIdx + 1}
                                </td>
                                {fields.map((field) => {
                                    const cellKey = getCellKey(rowIdx, field.name);
                                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === field.name;
                                    const pendingEdit = edits.get(cellKey);
                                    const value = pendingEdit ? pendingEdit.newValue : row[field.name];
                                    const isDirty = !!pendingEdit;

                                    return (
                                        <td
                                            key={field.name}
                                            className={`px-4 py-2 border-r border-white/5 last:border-r-0 relative min-w-[120px] ${isDirty ? 'bg-amber-500/5' : ''}`}
                                            onDoubleClick={() => handleCellDoubleClick(rowIdx, field.name, row[field.name])}
                                        >
                                            {isEditing ? (
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={handleKeyDown}
                                                    className="absolute inset-x-1 inset-y-1 bg-slate-950 border border-violet-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 z-20 shadow-xl"
                                                />
                                            ) : (
                                                <div className="text-xs font-mono text-slate-400 truncate max-w-[300px] py-1">
                                                    {value === null ? (
                                                        <span className="text-slate-700 italic text-[10px] tracking-wide">NULL</span>
                                                    ) : String(value)}
                                                </div>
                                            )}
                                            {isDirty && (
                                                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-amber-500" title="Uncommitted change" />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

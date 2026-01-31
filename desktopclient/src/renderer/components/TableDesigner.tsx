
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Eye, Table } from 'lucide-react';

interface ColumnDef {
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isNullable: boolean;
    defaultValue?: string;
}

interface TableDef {
    name: string;
    columns: ColumnDef[];
}

interface TableDesignerProps {
    connectionId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const COMMON_TYPES = [
    'SERIAL', 'INTEGER', 'BIGINT',
    'VARCHAR(255)', 'TEXT',
    'BOOLEAN',
    'TIMESTAMP', 'DATE',
    'JSONB', 'UUID'
];

export const TableDesigner: React.FC<TableDesignerProps> = ({ connectionId, onClose, onSuccess }) => {
    const [tableDef, setTableDef] = useState<TableDef>({
        name: '',
        columns: [
            { name: 'id', type: 'SERIAL', isPrimaryKey: true, isNullable: false }
        ]
    });
    const [previewSql, setPreviewSql] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tableDef.name && tableDef.columns.length > 0) {
            // Simplified for native client, normally would use lib/sql-helper
            const cols = tableDef.columns.map(c =>
                `  ${c.name} ${c.type}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}${!c.isNullable ? ' NOT NULL' : ''}${c.defaultValue ? ` DEFAULT ${c.defaultValue}` : ''}`
            ).join(',\n');
            setPreviewSql(`CREATE TABLE ${tableDef.name} (\n${cols}\n);`);
        } else {
            setPreviewSql('-- Define table name and at least one column to see SQL');
        }
    }, [tableDef]);

    const handleAddColumn = () => {
        setTableDef(prev => ({
            ...prev,
            columns: [...prev.columns, { name: '', type: 'VARCHAR(255)', isPrimaryKey: false, isNullable: true }]
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.db.execute(connectionId, previewSql);
            if (!result.success) throw new Error(result.error);
            onSuccess();
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden scale-in-center">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400">
                            <Table size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Table Architect</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Designing Schema for ${connectionId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Table Name</label>
                        <input
                            type="text"
                            value={tableDef.name}
                            onChange={e => setTableDef(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:border-violet-500 outline-none transition-all shadow-inner"
                            placeholder="e.g. customers"
                        />
                    </div>

                    {/* Columns List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Column Definitions</label>
                            <button
                                onClick={handleAddColumn}
                                className="text-[10px] font-bold flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider"
                            >
                                <Plus size={14} /> Add New Field
                            </button>
                        </div>

                        <div className="space-y-2">
                            {tableDef.columns.map((col, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-slate-800/20 p-4 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <input
                                        type="text"
                                        value={col.name}
                                        onChange={e => {
                                            const newCols = [...tableDef.columns];
                                            newCols[idx].name = e.target.value;
                                            setTableDef({ ...tableDef, columns: newCols });
                                        }}
                                        placeholder="Name"
                                        className="flex-1 px-3 py-2 bg-slate-950 border border-white/5 rounded-lg text-xs text-slate-200 outline-none focus:border-violet-500"
                                    />
                                    <select
                                        value={col.type}
                                        onChange={e => {
                                            const newCols = [...tableDef.columns];
                                            newCols[idx].type = e.target.value;
                                            setTableDef({ ...tableDef, columns: newCols });
                                        }}
                                        className="w-40 px-3 py-2 bg-slate-950 border border-white/5 rounded-lg text-xs text-slate-300 outline-none focus:border-violet-500"
                                    >
                                        {COMMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer group/chk">
                                            <input
                                                type="checkbox"
                                                checked={col.isPrimaryKey}
                                                onChange={e => {
                                                    const newCols = [...tableDef.columns];
                                                    newCols[idx].isPrimaryKey = e.target.checked;
                                                    if (e.target.checked) newCols[idx].isNullable = false;
                                                    setTableDef({ ...tableDef, columns: newCols });
                                                }}
                                                className="accent-violet-600"
                                            />
                                            PK
                                        </label>
                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={col.isNullable}
                                                disabled={col.isPrimaryKey}
                                                onChange={e => {
                                                    const newCols = [...tableDef.columns];
                                                    newCols[idx].isNullable = e.target.checked;
                                                    setTableDef({ ...tableDef, columns: newCols });
                                                }}
                                                className="accent-violet-600"
                                            />
                                            NULL
                                        </label>
                                    </div>
                                    <button
                                        onClick={() => setTableDef({ ...tableDef, columns: tableDef.columns.filter((_, i) => i !== idx) })}
                                        className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        disabled={tableDef.columns.length === 1}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 mb-3 text-slate-500">
                            <Eye size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Generated SQL Preview</span>
                        </div>
                        <pre className="text-xs font-mono text-indigo-300 leading-relaxed">{previewSql}</pre>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-slate-800/30">
                    <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !tableDef.name}
                        className="px-8 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-violet-900/40 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading ? 'ARCHITECTING...' : (
                            <>
                                <Save size={14} />
                                DEPLOY TABLE
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

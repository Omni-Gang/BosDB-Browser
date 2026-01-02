'use client';

import { useState, useEffect } from 'react';
import { generateCreateTableSQL, TableDef, ColumnDef } from '@/lib/sql-helper';
import { Plus, Trash2, Save, X, Eye } from 'lucide-react';

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

export default function TableDesigner({ connectionId, onClose, onSuccess }: TableDesignerProps) {
    const [tableDef, setTableDef] = useState<TableDef>({
        name: '',
        columns: [
            { name: 'id', type: 'SERIAL', isPrimaryKey: true, isNullable: false }
        ]
    });
    const [previewSql, setPreviewSql] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-update preview when def changes
    useEffect(() => {
        try {
            if (tableDef.name && tableDef.columns.length > 0) {
                const sql = generateCreateTableSQL(tableDef);
                setPreviewSql(sql);
            } else {
                setPreviewSql('-- Define table name and at least one column to see SQL');
            }
        } catch (e) {
            setPreviewSql('-- Invalid definition');
        }
    }, [tableDef]);

    const handleAddColumn = () => {
        setTableDef(prev => ({
            ...prev,
            columns: [
                ...prev.columns,
                { name: '', type: 'VARCHAR(255)', isPrimaryKey: false, isNullable: true }
            ]
        }));
    };

    const handleRemoveColumn = (index: number) => {
        setTableDef(prev => ({
            ...prev,
            columns: prev.columns.filter((_, i) => i !== index)
        }));
    };

    const updateColumn = (index: number, updates: Partial<ColumnDef>) => {
        setTableDef(prev => {
            const newCols = [...prev.columns];
            newCols[index] = { ...newCols[index], ...updates };
            return { ...prev, columns: newCols };
        });
    };

    const handleSave = async () => {
        setError('');
        setLoading(true);

        try {
            if (!tableDef.name) throw new Error('Table name is required');
            if (tableDef.columns.some(c => !c.name)) throw new Error('All columns must have a name');

            const res = await fetch('/api/schema/table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId,
                    action: 'create',
                    tableDef
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create table');

            alert('Table created successfully!');
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">Create New Table</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Table Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Table Name</label>
                        <input
                            type="text"
                            value={tableDef.name}
                            onChange={e => setTableDef(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="e.g. users"
                        />
                    </div>

                    {/* Columns */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-muted-foreground">Columns</label>
                            <button
                                onClick={handleAddColumn}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
                            >
                                <Plus className="w-4 h-4" /> Add Column
                            </button>
                        </div>

                        <div className="space-y-3">
                            {tableDef.columns.map((col, idx) => (
                                <div key={idx} className="flex gap-3 items-start bg-card p-3 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={col.name}
                                            onChange={e => updateColumn(idx, { name: e.target.value })}
                                            placeholder="Column Name"
                                            className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm"
                                        />
                                    </div>
                                    <div className="w-40">
                                        <select
                                            value={col.type}
                                            onChange={e => updateColumn(idx, { type: e.target.value })}
                                            className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm"
                                        >
                                            {COMMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-4 pt-2">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={col.isPrimaryKey}
                                                onChange={e => updateColumn(idx, { isPrimaryKey: e.target.checked, isNullable: false })}
                                            />
                                            PK
                                        </label>
                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={col.isNullable}
                                                disabled={col.isPrimaryKey}
                                                onChange={e => updateColumn(idx, { isNullable: e.target.checked })}
                                            />
                                            Nullable
                                        </label>
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            value={col.defaultValue || ''}
                                            onChange={e => updateColumn(idx, { defaultValue: e.target.value })}
                                            placeholder="Default"
                                            className="w-full px-3 py-1.5 bg-background border border-border rounded text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveColumn(idx)}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition"
                                        disabled={tableDef.columns.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SQL Preview */}
                    <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto border border-border">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            <span>Preview SQL</span>
                        </div>
                        <pre className="text-foreground">{previewSql}</pre>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !tableDef.name}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Create Table
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}

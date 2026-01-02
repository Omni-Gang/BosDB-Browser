'use client';

import React, { useState, useEffect, useRef } from 'react';
import { detectPrimaryKey } from '@/lib/sql-helper';
import { Save, X, AlertCircle } from 'lucide-react';

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

export function DataEditor({ rows, fields, onSave, readOnly = false }: DataEditorProps) {
    // Map of "rowIndex:colName" -> PendingEdit
    const [edits, setEdits] = useState<Map<string, PendingEdit>>(new Map());
    const [editingCell, setEditingCell] = useState<{ row: number, col: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [primaryKeyCols, setPrimaryKeyCols] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Detect PKs on mount or field change
    useEffect(() => {
        const pks = detectPrimaryKey(fields);
        setPrimaryKeyCols(pks);
    }, [fields]);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    // Derived state
    const canEdit = !readOnly && primaryKeyCols.length > 0;
    const hasPendingChanges = edits.size > 0;

    const getCellKey = (rowIndex: number, colName: string) => `${rowIndex}:${colName}`;

    const handleCellDoubleClick = (rowIndex: number, colName: string, value: any) => {
        if (!canEdit) return;
        setEditingCell({ row: rowIndex, col: colName });

        // Use pending value if exists, else original
        const pending = edits.get(getCellKey(rowIndex, colName));
        setEditValue(pending ? String(pending.newValue) : String(value ?? ''));
    };

    const commitEdit = () => {
        if (!editingCell) return;

        const { row, col } = editingCell;
        const originalValue = rows[row][col];
        const key = getCellKey(row, col);

        // If simple change matching original, remove edit
        // Weak comparison for now (string/number)
        if (String(originalValue) == editValue && originalValue !== null) {
            const newEdits = new Map(edits);
            newEdits.delete(key);
            setEdits(newEdits);
        } else {
            // Store edit
            const newEdits = new Map(edits);
            newEdits.set(key, {
                originalValue,
                newValue: editValue
            });
            setEdits(newEdits);
        }

        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitEdit();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Group edits by row
            const rowUpdates = new Map<number, any>();

            for (const [key, edit] of edits.entries()) {
                const [rowStr, col] = key.split(':');
                const rowIdx = parseInt(rowStr);

                if (!rowUpdates.has(rowIdx)) {
                    // Extract PK for this row
                    const pk: any = {};
                    let missingPk = false;
                    for (const pkCol of primaryKeyCols) {
                        const val = rows[rowIdx][pkCol];
                        if (val === undefined) missingPk = true;
                        pk[pkCol] = val;
                    }

                    if (missingPk) {
                        console.error('Cannot update row, missing PK value');
                        continue;
                    }

                    rowUpdates.set(rowIdx, {
                        primaryKey: pk,
                        changes: {}
                    });
                }

                rowUpdates.get(rowIdx).changes[col] = edit.newValue;
            }

            await onSave(Array.from(rowUpdates.values()));
            setEdits(new Map()); // Clear edits on success
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-sm text-muted-foreground">
                    {canEdit ? (
                        <span className="text-green-500 flex items-center gap-1">
                            Double-click cells to edit
                        </span>
                    ) : (
                        <span className="text-amber-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Read-only (No Primary Key detected)
                        </span>
                    )}
                </div>

                {hasPendingChanges && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setEdits(new Map())}
                            className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded transition"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded transition flex items-center gap-2"
                        >
                            <Save className="w-3 h-3" />
                            {isSaving ? 'Saving...' : `Save ${edits.size} Change(s)`}
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="border border-border rounded-lg overflow-hidden flex-1 relative">
                <div className="absolute inset-0 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-muted sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-2 w-10 bg-muted border-b border-border text-center text-xs text-muted-foreground">#</th>
                                {fields.map((field) => (
                                    <th
                                        key={field.name}
                                        className={`px-4 py-2 text-left text-sm font-semibold border-b border-border border-r last:border-r-0 ${primaryKeyCols.includes(field.name) ? 'text-primary' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-1">
                                            {field.name}
                                            {primaryKeyCols.includes(field.name) && <span title="Primary Key">🔑</span>}
                                        </div>
                                        <div className="text-xs font-normal text-muted-foreground">
                                            {field.dataType}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-border hover:bg-accent/30 group">
                                    <td className="px-2 py-1 text-center text-xs text-muted-foreground bg-muted/30 select-none">
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
                                                className={`max-w-xs truncate border-r border-border last:border-r-0 p-0 relative ${isDirty ? 'bg-amber-100 dark:bg-amber-900/30' : ''
                                                    }`}
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
                                                        className="w-full h-full px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                                                    />
                                                ) : (
                                                    <div className="px-4 py-3 text-sm font-mono min-h-[44px] flex items-center">
                                                        {value === null ? (
                                                            <span className="text-muted-foreground italic text-xs">NULL</span>
                                                        ) : String(value)}

                                                        {isDirty && (
                                                            <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 triangle-flag" />
                                                        )}
                                                    </div>
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
        </div>
    );
}

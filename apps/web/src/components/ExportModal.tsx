'use client';

import { useState } from 'react';
import { Download, X, FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import { exportToCSV, exportToJSON, exportToExcel } from '@/lib/export-utils';

interface ExportModalProps {
    data: any[];
    columns: string[];
    tableName?: string;
    onClose: () => void;
}

type ExportFormat = 'csv' | 'json' | 'excel';

export function ExportModal({ data, columns, tableName = 'export', onClose }: ExportModalProps) {
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [filename, setFilename] = useState(tableName);
    const [includeHeaders, setIncludeHeaders] = useState(true);
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(columns));

    const handleExport = () => {
        const cols = columns.filter(c => selectedColumns.has(c));
        const options = { filename, includeHeaders };

        switch (format) {
            case 'csv':
                exportToCSV(data, cols, options);
                break;
            case 'json':
                exportToJSON(data, cols, options);
                break;
            case 'excel':
                exportToExcel(data, cols, options);
                break;
        }
        onClose();
    };

    const toggleColumn = (col: string) => {
        const next = new Set(selectedColumns);
        if (next.has(col)) {
            next.delete(col);
        } else {
            next.add(col);
        }
        setSelectedColumns(next);
    };

    const selectAll = () => setSelectedColumns(new Set(columns));
    const selectNone = () => setSelectedColumns(new Set());

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Export Data
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Format</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition ${format === 'csv'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-accent'
                                    }`}
                            >
                                <FileText className="w-5 h-5" />
                                CSV
                            </button>
                            <button
                                onClick={() => setFormat('json')}
                                className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition ${format === 'json'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-accent'
                                    }`}
                            >
                                <FileJson className="w-5 h-5" />
                                JSON
                            </button>
                            <button
                                onClick={() => setFormat('excel')}
                                className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition ${format === 'excel'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-accent'
                                    }`}
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                Excel
                            </button>
                        </div>
                    </div>

                    {/* Filename */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Filename</label>
                        <input
                            type="text"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeHeaders}
                                onChange={(e) => setIncludeHeaders(e.target.checked)}
                                className="w-4 h-4 rounded border-border"
                            />
                            <span className="text-sm">Include headers</span>
                        </label>
                    </div>

                    {/* Column Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Columns ({selectedColumns.size}/{columns.length})</label>
                            <div className="flex gap-2 text-xs">
                                <button onClick={selectAll} className="text-primary hover:underline">All</button>
                                <span className="text-muted-foreground">|</span>
                                <button onClick={selectNone} className="text-primary hover:underline">None</button>
                            </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                            {columns.map(col => (
                                <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.has(col)}
                                        onChange={() => toggleColumn(col)}
                                        className="w-4 h-4 rounded border-border"
                                    />
                                    <span className="text-sm font-mono">{col}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="text-sm text-muted-foreground">
                        Exporting {data.length} rows, {selectedColumns.size} columns
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-accent rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selectedColumns.size === 0}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export {format.toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, generateInsertSQL } from '@/lib/export-utils';

interface ImportModalProps {
    tableName: string;
    connectionId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportModal({ tableName, connectionId, onClose, onSuccess }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{ data: any[]; columns: string[] } | null>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setPreview(null);

        try {
            const parsed = await parseCSV(selectedFile);
            setPreview({
                data: parsed.data.slice(0, 5), // Preview first 5 rows
                columns: parsed.columns,
            });
        } catch (err: any) {
            setError(`Failed to parse CSV: ${err.message}`);
        }
    };

    const handleImport = async () => {
        if (!file || !preview) return;

        setImporting(true);
        setError('');

        try {
            const parsed = await parseCSV(file);
            const insertSQL = generateInsertSQL(tableName, parsed.data, parsed.columns);

            // Execute the INSERT statements
            const statements = insertSQL.split(';\n').filter(s => s.trim());

            for (const stmt of statements) {
                const res = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        connectionId,
                        query: stmt,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Import failed');
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Import Data to {tableName}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* File Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        {file ? (
                            <div className="flex items-center justify-center gap-2">
                                <FileText className="w-8 h-8 text-primary" />
                                <span className="font-medium">{file.name}</span>
                                <span className="text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">
                                    Click to upload CSV file or drag and drop
                                </p>
                            </>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <span>Import successful!</span>
                        </div>
                    )}

                    {/* Preview */}
                    {preview && (
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Preview (first 5 rows, {preview.columns.length} columns)
                            </label>
                            <div className="overflow-x-auto border border-border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            {preview.columns.map(col => (
                                                <th key={col} className="px-3 py-2 text-left font-medium">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.data.map((row, i) => (
                                            <tr key={i} className="border-t border-border">
                                                {preview.columns.map(col => (
                                                    <td key={col} className="px-3 py-2 truncate max-w-xs">
                                                        {row[col]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-accent rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!preview || importing || success}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {importing ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Import Data
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}


import React, { useState } from 'react';
import { Download, X, FileSpreadsheet, FileJson, FileText, CheckCircle2, ListFilter } from 'lucide-react';

interface ExportModalProps {
    data: any[];
    fields: { name: string; dataType: string }[];
    onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ data, fields, onClose }) => {
    const [format, setFormat] = useState<'csv' | 'json' | 'excel'>('csv');
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(fields.map(f => f.name)));

    const handleExport = async () => {
        let content = '';
        const exportFields = fields.filter(f => selectedFields.has(f.name));

        if (format === 'json') {
            content = JSON.stringify(data.map(row => {
                const exportedRow: any = {};
                exportFields.forEach(f => exportedRow[f.name] = row[f.name]);
                return exportedRow;
            }), null, 2);
        } else {
            // CSV
            const headers = exportFields.map(f => f.name).join(',');
            const rows = data.map(row =>
                exportFields.map(f => `"${String(row[f.name] || '').replace(/"/g, '""')}"`).join(',')
            );
            content = [headers, ...rows].join('\n');
        }

        // @ts-ignore
        await window.electron.fs.saveFile(content, `export.${format}`, [{ name: format.toUpperCase(), extensions: [format] }]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[7000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col scale-in-center">

                <div className="p-6 border-b border-white/5 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold">
                            <Download size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Export Results</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Process {data.length} records</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Format Selection */}
                    <div className="grid grid-cols-3 gap-3">
                        {['csv', 'json', 'excel'].map((fmt: any) => (
                            <button
                                key={fmt}
                                onClick={() => setFormat(fmt)}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${format === fmt ? 'bg-violet-600/20 border-violet-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/10'}`}
                            >
                                {fmt === 'csv' && <FileText size={20} />}
                                {fmt === 'json' && <FileJson size={20} />}
                                {fmt === 'excel' && <FileSpreadsheet size={20} />}
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{fmt}</span>
                            </button>
                        ))}
                    </div>

                    {/* Field Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ListFilter size={12} />
                                Included Columns
                            </h4>
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedFields(new Set(fields.map(f => f.name)))} className="text-[9px] font-bold text-violet-400 hover:text-violet-300 uppercase">Select All</button>
                                <button onClick={() => setSelectedFields(new Set())} className="text-[9px] font-bold text-slate-600 hover:text-slate-400 uppercase">Clear</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-950 rounded-xl border border-white/5 shadow-inner custom-scrollbar">
                            {fields.map(f => (
                                <label key={f.name} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.has(f.name)}
                                        onChange={() => {
                                            const next = new Set(selectedFields);
                                            if (next.has(f.name)) next.delete(f.name);
                                            else next.add(f.name);
                                            setSelectedFields(next);
                                        }}
                                        className="w-4 h-4 rounded border-white/10 bg-slate-900 checked:bg-violet-600 checked:border-transparent transition-all"
                                    />
                                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200 truncate">{f.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 flex justify-end gap-4 bg-slate-800/30">
                    <button onClick={onClose} className="px-6 py-2 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest">Abort</button>
                    <button
                        onClick={handleExport}
                        disabled={selectedFields.size === 0}
                        className="px-10 py-3 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black rounded-xl flex items-center gap-2 shadow-lg shadow-violet-900/40 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} />
                        FINALIZE EXPORT
                    </button>
                </div>
            </div>
        </div>
    );
};

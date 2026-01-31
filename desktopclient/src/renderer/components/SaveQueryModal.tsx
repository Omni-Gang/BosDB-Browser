
import React, { useState } from 'react';
import { Save, X, Database, Download, FileCode } from 'lucide-react';

interface SaveQueryModalProps {
    query: string;
    connectionId: string;
    onClose: () => void;
    onSuccess: (savedQuery: any) => void;
}

export const SaveQueryModal: React.FC<SaveQueryModalProps> = ({ query, connectionId, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'cloud' | 'file'>('cloud');

    const handleSave = async () => {
        if (mode === 'file') {
            // @ts-ignore
            await window.electron.fs.saveFile(query, `${name || 'query'}.sql`, [{ name: 'SQL', extensions: ['sql'] }]);
            onClose();
            return;
        }

        setSaving(true);
        try {
            // Normally would call /api/saved-queries
            // Mock success for now
            setTimeout(() => {
                onSuccess({ id: Date.now(), name, query });
                onClose();
            }, 1000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[7000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in-center">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400">
                            <Save size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Save Query</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Store SQL Permanently</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Destination Selection */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setMode('cloud')}
                            className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${mode === 'cloud' ? 'bg-violet-600/20 border-violet-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/10'}`}
                        >
                            <Database size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Account Cloud</span>
                        </button>
                        <button
                            onClick={() => setMode('file')}
                            className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${mode === 'file' ? 'bg-violet-600/20 border-violet-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/10'}`}
                        >
                            <FileCode size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Local Asset</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:border-violet-500 outline-none transition-all shadow-inner text-sm"
                                placeholder="e.g. Fetch Customer Lifetime Value"
                                autoFocus
                            />
                        </div>

                        {mode === 'cloud' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-slate-100 focus:border-violet-500 outline-none transition-all shadow-inner text-xs h-24 resize-none"
                                    placeholder="Explain what this analysis does..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-slate-800/30">
                    <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name}
                        className="px-8 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-violet-900/40 transition-all active:scale-95"
                    >
                        {saving ? 'SAVING...' : (
                            <>
                                <Save size={14} />
                                {mode === 'cloud' ? 'PERSIST TO ACCOUNT' : 'EXPORT AS SQL'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { X, Settings, Moon, Sun, Monitor, Database, Download, Shield, HardDrive, Bell } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [theme, setTheme] = useState('system');
    const [exportPath, setExportPath] = useState('~/Documents/BosDB/Exports');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 800);
    };

    return (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Global Preferences</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-60">Native Node Config • v0.1.0</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-8">
                    {/* Sidebar Nav */}
                    <div className="col-span-4 space-y-2">
                        {[
                            { id: 'general', icon: <Monitor size={14} />, label: 'Appearance' },
                            { id: 'conns', icon: <Database size={14} />, label: 'Connections' },
                            { id: 'storage', icon: <HardDrive size={14} />, label: 'Storage' },
                            { id: 'security', icon: <Shield size={14} />, label: 'Security' },
                            { id: 'notifs', icon: <Bell size={14} />, label: 'Notifications' }
                        ].map(item => (
                            <button
                                key={item.id}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${item.id === 'general' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Settings Panel */}
                    <div className="col-span-8 space-y-8">
                        {/* Theme Section */}
                        <section>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Aesthetics & Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'light', icon: <Sun size={16} />, label: 'Light' },
                                    { id: 'dark', icon: <Moon size={16} />, label: 'Dark' },
                                    { id: 'system', icon: <Monitor size={16} />, label: 'System' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${theme === t.id ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-white/5 bg-slate-950/50 text-slate-500 hover:border-white/10'}`}
                                    >
                                        {t.icon}
                                        <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Export Paths */}
                        <section>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Export Directory</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-slate-400 flex items-center gap-3">
                                    <Download size={14} className="text-slate-600" />
                                    {exportPath}
                                </div>
                                <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[10px] uppercase transition-colors tracking-widest shadow-lg">
                                    Browse
                                </button>
                            </div>
                        </section>

                        {/* Connection Defaults */}
                        <section className="bg-slate-950/50 rounded-2xl p-6 border border-white/5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Native Performance Defaults</label>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Auto-connect on boot</p>
                                        <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tight">Always try to restore previous active database session</p>
                                    </div>
                                    <div className="w-10 h-6 bg-violet-600 rounded-full flex items-center px-1 shadow-inner cursor-pointer">
                                        <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-md" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Global SSL Enforcement</p>
                                        <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tight">Reject unauthorized connections for Railway/AWS instances</p>
                                    </div>
                                    <div className="w-10 h-6 bg-slate-800 rounded-full flex items-center px-1 shadow-inner cursor-pointer">
                                        <div className="w-4 h-4 bg-slate-600 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-800/20 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Local config is synced with browser vault</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-xl shadow-violet-900/30 flex items-center gap-2"
                        >
                            {isSaving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isSaving ? 'PERSISTING...' : 'SAVE & APPLY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

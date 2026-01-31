
import React, { useState, useEffect } from 'react';
import { User, LogOut, ChevronRight, X, Loader2, Shield, Users } from 'lucide-react';

export const UserWidget: React.FC<{ user?: any }> = ({ user: manualUser }) => {
    const [user, setUser] = useState<any>(manualUser);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        setUser(manualUser);
    }, [manualUser]);

    useEffect(() => {
        // Fallback: Listen for tokens directly if the prop drilling somehow misses an update
        // @ts-ignore
        const removeListener = window.electron.auth.onTokenReceived((token: string) => {
            try {
                const userStr = decodeURIComponent(Array.prototype.map.call(atob(token), (c: any) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const userData = JSON.parse(userStr);
                setUser(userData);
            } catch (e) { }
        });
        return () => removeListener();
    }, []);

    const handleLogin = () => {
        // @ts-ignore
        window.electron.auth.openLogin();
    };

    const handleLogout = () => {
        setUser(null);
        setExpanded(false);
        // Dispatch logout to parent if needed, for now just clear local
    };

    if (!user) {
        return (
            <button
                onClick={handleLogin}
                className="mx-2 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-md transition-all active:scale-95 shadow-lg shadow-violet-900/20"
            >
                SIGN IN
            </button>
        );
    }

    return (
        <div className="relative mx-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-md transition-colors"
            >
                <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {user.name?.charAt(0) || 'U'}
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider max-w-[80px] truncate">
                    {user.name}
                </span>
            </button>

            {expanded && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 shadow-2xl rounded-xl p-4 z-[10000] animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                        <div className="w-10 h-10 bg-violet-600/20 rounded-full flex items-center justify-center text-violet-400">
                            <User size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 text-[10px] font-bold">
                            <span className="flex items-center gap-2 text-slate-500 uppercase">
                                <Shield size={12} />
                                Role
                            </span>
                            <span className="text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded uppercase">
                                {user.role}
                            </span>
                        </div>

                        {(user.email?.includes('simpei') || user.isPro) && (
                            <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 text-[10px] font-bold">
                                <span className="flex items-center gap-2 text-slate-500 uppercase">
                                    <Shield size={12} className="text-amber-400" />
                                    Plan
                                </span>
                                <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                                    PRO USER
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-red-500/10 text-red-400 text-[10px] font-bold uppercase mt-2 transition-colors"
                        >
                            <LogOut size={12} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Database } from 'lucide-react';
import { UserWidget } from './UserWidget';

export const TitleBar: React.FC<{ user?: any }> = ({ user }) => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const updateMaximizedState = async () => {
            // @ts-ignore
            if (window.electron?.windowControls?.isMaximized) {
                // @ts-ignore
                const maximized = await window.electron.windowControls.isMaximized();
                setIsMaximized(maximized);
            }
        };

        updateMaximizedState();

        // Listen for resize events to update maximized icon
        window.addEventListener('resize', updateMaximizedState);
        return () => window.removeEventListener('resize', updateMaximizedState);
    }, []);

    const handleMinimize = () => {
        // @ts-ignore
        window.electron.windowControls.minimize();
    };

    const handleMaximize = () => {
        // @ts-ignore
        if (isMaximized) {
            // @ts-ignore
            window.electron.windowControls.unmaximize();
        } else {
            // @ts-ignore
            window.electron.windowControls.maximize();
        }
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        // @ts-ignore
        window.electron.windowControls.close();
    };

    return (
        <div className="flex items-center justify-between h-8 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 select-none z-[9999] fixed top-0 left-0 right-0 shadow-lg"
            style={{ WebkitAppRegion: 'drag' } as any}>
            <div className="flex items-center px-4 gap-2.5">
                <div className="flex items-center justify-center text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                    <Database size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-slate-100 tracking-[0.15em] uppercase">BosDB</span>
            </div>

            <div className="flex-1 flex items-center justify-end h-full no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <UserWidget user={user} />

                <div className="flex items-center h-full ml-2 border-l border-white/5">
                    <button
                        onClick={handleMinimize}
                        className="px-3 hover:bg-white/5 text-slate-400 hover:text-white transition-colors h-full flex items-center"
                    >
                        <Minus size={14} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="px-3 hover:bg-white/5 text-slate-400 hover:text-white transition-colors h-full flex items-center"
                    >
                        {isMaximized ? <Copy size={12} /> : <Square size={12} />}
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-3 hover:bg-red-500/80 text-slate-400 hover:text-white transition-colors h-full flex items-center"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

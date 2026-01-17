'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    action?: ReactNode;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, action?: ReactNode, duration?: number) => void;
    success: (message: string, action?: ReactNode, duration?: number) => void;
    error: (message: string, action?: ReactNode, duration?: number) => void;
    info: (message: string, action?: ReactNode, duration?: number) => void;
    warning: (message: string, action?: ReactNode, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', action?: ReactNode, duration: number = 4000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { id, message, type, action, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        if (duration !== Infinity) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const contextValue: ToastContextType = {
        showToast,
        success: (msg, action, duration) => showToast(msg, 'success', action, duration),
        error: (msg, action, duration) => showToast(msg, 'error', action, duration),
        info: (msg, action, duration) => showToast(msg, 'info', action, duration),
        warning: (msg, action, duration) => showToast(msg, 'warning', action, duration),
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const icons = {
        success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
        error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
        info: <Info className="w-5 h-5 flex-shrink-0" />,
        warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
    };

    const colors = {
        success: 'bg-green-500/90 text-white border-green-600',
        error: 'bg-red-500/90 text-white border-red-600',
        info: 'bg-blue-500/90 text-white border-blue-600',
        warning: 'bg-yellow-500/90 text-white border-yellow-600',
    };

    return (
        <div
            className={`${colors[toast.type]} pointer-events-auto backdrop-blur-md border rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 min-w-[300px] max-w-md animate-in slide-in-from-right-5 fade-in duration-300`}
        >
            <div className="mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
                <p className="text-sm font-medium leading-5">{toast.message}</p>
                {toast.action && (
                    <div className="mt-2">
                        {toast.action}
                    </div>
                )}
            </div>
            <button
                onClick={onClose}
                className="hover:bg-white/20 rounded p-1 transition -mr-1 -mt-1"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

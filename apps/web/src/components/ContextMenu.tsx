import React from 'react';

interface ContextMenuProps {
    open: boolean;
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export default function ContextMenu({ open, x, y, onClose, children }: ContextMenuProps) {
    // Close on click outside
    React.useEffect(() => {
        if (!open) return;
        const handleClick = () => onClose();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
                top: `${y}px`,
                left: `${x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
}

interface MenuItemProps {
    onClick: () => void;
    icon?: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export function MenuItem({ onClick, icon, children, disabled }: MenuItemProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                }`}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    );
}

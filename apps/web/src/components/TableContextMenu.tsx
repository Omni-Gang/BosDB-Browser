'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Table,
    Play,
    FileText,
    Edit,
    Trash2,
    Copy,
    Download,
    Upload,
    Star,
    StarOff
} from 'lucide-react';
import { generateSelectSQL, generateInsertSQL, generateUpdateSQL, generateDeleteSQL } from '@/lib/export-utils';

interface TableContextMenuProps {
    x: number;
    y: number;
    tableName: string;
    schemaName: string;
    columns?: string[];
    onClose: () => void;
    onSelectQuery: (sql: string) => void;
    onExport?: () => void;
    onImport?: () => void;
    onToggleFavorite?: () => void;
    isFavorite?: boolean;
}

export function TableContextMenu({
    x,
    y,
    tableName,
    schemaName,
    columns = [],
    onClose,
    onSelectQuery,
    onExport,
    onImport,
    onToggleFavorite,
    isFavorite = false,
}: TableContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const fullTableName = `${schemaName}.${tableName}`;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep menu in viewport
    const adjustedStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 250),
        top: Math.min(y, window.innerHeight - 400),
        zIndex: 100,
    };

    type MenuItem = {
        label: string;
        icon: React.ElementType;
        action: () => void;
    };

    type DividerItem = {
        divider: true;
    };

    type MenuOption = MenuItem | DividerItem;

    const menuItems: MenuOption[] = [
        {
            label: 'Query Data',
            icon: Play,
            action: () => {
                onSelectQuery(generateSelectSQL(fullTableName, undefined, 100));
                onClose();
            },
        },
        {
            label: 'Generate SELECT',
            icon: FileText,
            action: () => {
                onSelectQuery(generateSelectSQL(fullTableName, columns.length > 0 ? columns : undefined));
                onClose();
            },
        },
        {
            label: 'Generate INSERT',
            icon: FileText,
            action: () => {
                const template = columns.length > 0
                    ? `INSERT INTO ${fullTableName} (${columns.join(', ')})\nVALUES (${columns.map(() => '?').join(', ')});`
                    : `INSERT INTO ${fullTableName} (column1, column2)\nVALUES (value1, value2);`;
                onSelectQuery(template);
                onClose();
            },
        },
        {
            label: 'Generate UPDATE',
            icon: Edit,
            action: () => {
                onSelectQuery(generateUpdateSQL(fullTableName, columns.length > 0 ? columns : ['column']));
                onClose();
            },
        },
        {
            label: 'Generate DELETE',
            icon: Trash2,
            action: () => {
                onSelectQuery(generateDeleteSQL(fullTableName));
                onClose();
            },
        },
        { divider: true },
        {
            label: 'Copy Table Name',
            icon: Copy,
            action: () => {
                navigator.clipboard.writeText(fullTableName);
                onClose();
            },
        },
        ...(onExport ? [{
            label: 'Export Data...',
            icon: Download,
            action: () => {
                onExport();
                onClose();
            },
        }] as MenuItem[] : []),
        ...(onImport ? [{
            label: 'Import Data...',
            icon: Upload,
            action: () => {
                onImport();
                onClose();
            },
        }] as MenuItem[] : []),
        ...(onToggleFavorite ? [{
            divider: true,
        }, {
            label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
            icon: isFavorite ? StarOff : Star,
            action: () => {
                onToggleFavorite();
                onClose();
            },
        }] as MenuOption[] : []),
    ];

    return (
        <div
            ref={menuRef}
            style={adjustedStyle}
            className="bg-card border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
        >
            <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm truncate">{tableName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{schemaName}</span>
            </div>

            {menuItems.map((item, index) => {
                if ('divider' in item && item.divider) {
                    return <hr key={index} className="my-1 border-border" />;
                }

                const MenuItem = item as Exclude<typeof item, { divider: true }>;
                const Icon = MenuItem.icon;

                return (
                    <button
                        key={index}
                        onClick={MenuItem.action}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition text-left"
                    >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {MenuItem.label}
                    </button>
                );
            })}
        </div>
    );
}

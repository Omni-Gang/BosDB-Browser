'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
    Filter,
    X,
    Copy,
    Check
} from 'lucide-react';

interface ResultsToolbarProps {
    data: any[];
    columns: string[];
    onFilteredDataChange: (data: any[]) => void;
    onExport: () => void;
}

type SortDirection = 'asc' | 'desc' | null;

export function ResultsToolbar({ data, columns, onFilteredDataChange, onExport }: ResultsToolbarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [showFilters, setShowFilters] = useState(false);
    const [copied, setCopied] = useState(false);

    // Apply filters and sorting
    const filteredData = useMemo(() => {
        let result = [...data];

        // Global search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(row =>
                columns.some(col =>
                    String(row[col] ?? '').toLowerCase().includes(term)
                )
            );
        }

        // Column filters
        Object.entries(columnFilters).forEach(([col, filter]) => {
            if (filter) {
                const filterLower = filter.toLowerCase();
                result = result.filter(row =>
                    String(row[col] ?? '').toLowerCase().includes(filterLower)
                );
            }
        });

        // Sorting
        if (sortColumn && sortDirection) {
            result.sort((a, b) => {
                const aVal = a[sortColumn];
                const bVal = b[sortColumn];

                // Handle nulls
                if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
                if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? 1 : -1;

                // Compare
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                const cmp = aStr.localeCompare(bStr);
                return sortDirection === 'asc' ? cmp : -cmp;
            });
        }

        return result;
    }, [data, columns, searchTerm, sortColumn, sortDirection, columnFilters]);

    // Notify parent of filtered data changes
    useEffect(() => {
        onFilteredDataChange(filteredData);
    }, [filteredData]); // Intentionally omit onFilteredDataChange to avoid loop

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            // Cycle through: asc -> desc -> none
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection(null);
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setColumnFilters({});
        setSortColumn(null);
        setSortDirection(null);
    };

    const hasActiveFilters = searchTerm || Object.values(columnFilters).some(f => f) || sortColumn;

    const copyAsJSON = () => {
        navigator.clipboard.writeText(JSON.stringify(filteredData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border-b border-border bg-card/50 p-2 space-y-2">
            {/* Main toolbar */}
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search all columns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    )}
                </div>

                {/* Column Filters Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1 transition ${showFilters || Object.values(columnFilters).some(f => f)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-accent'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        value={sortColumn || ''}
                        onChange={(e) => {
                            const col = e.target.value;
                            if (col) {
                                setSortColumn(col);
                                setSortDirection('asc');
                            } else {
                                setSortColumn(null);
                                setSortDirection(null);
                            }
                        }}
                        className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg appearance-none pr-8 focus:outline-none focus:border-primary"
                    >
                        <option value="">Sort by...</option>
                        {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                    {sortColumn && (
                        <button
                            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                            {sortDirection === 'asc' ? (
                                <ArrowUp className="w-4 h-4" />
                            ) : (
                                <ArrowDown className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Clear all */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                        Clear
                    </button>
                )}

                <div className="flex-1" />

                {/* Results count */}
                <span className="text-sm text-muted-foreground">
                    {filteredData.length === data.length
                        ? `${data.length} rows`
                        : `${filteredData.length} of ${data.length} rows`
                    }
                </span>

                {/* Copy */}
                <button
                    onClick={copyAsJSON}
                    className="p-1.5 hover:bg-accent rounded transition"
                    title="Copy as JSON"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </button>

                {/* Export */}
                <button
                    onClick={onExport}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-1"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Column Filters */}
            {showFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {columns.slice(0, 8).map(col => (
                        <div key={col} className="relative">
                            <input
                                type="text"
                                placeholder={col}
                                value={columnFilters[col] || ''}
                                onChange={(e) => setColumnFilters(prev => ({
                                    ...prev,
                                    [col]: e.target.value,
                                }))}
                                className="w-32 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:border-primary"
                            />
                            {columnFilters[col] && (
                                <button
                                    onClick={() => setColumnFilters(prev => ({
                                        ...prev,
                                        [col]: '',
                                    }))}
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                >
                                    <X className="w-3 h-3 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    ))}
                    {columns.length > 8 && (
                        <span className="text-xs text-muted-foreground self-center">
                            +{columns.length - 8} more
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

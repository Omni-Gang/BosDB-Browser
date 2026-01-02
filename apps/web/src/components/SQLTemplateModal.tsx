'use client';

import { useState } from 'react';
import { FileCode, X, Search, Copy, Check, Plus } from 'lucide-react';

interface SQLTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    sql: string;
    variables?: string[];
}

const DEFAULT_TEMPLATES: SQLTemplate[] = [
    // Data Queries
    {
        id: 'select-all',
        name: 'Select All',
        description: 'Retrieve all rows from a table',
        category: 'Data Queries',
        sql: 'SELECT * FROM ${tableName} LIMIT ${limit};',
        variables: ['tableName', 'limit'],
    },
    {
        id: 'select-columns',
        name: 'Select Specific Columns',
        description: 'Retrieve specific columns',
        category: 'Data Queries',
        sql: 'SELECT ${columns}\nFROM ${tableName}\nWHERE ${condition}\nORDER BY ${orderBy}\nLIMIT ${limit};',
        variables: ['columns', 'tableName', 'condition', 'orderBy', 'limit'],
    },
    {
        id: 'count-rows',
        name: 'Count Rows',
        description: 'Count total rows in a table',
        category: 'Data Queries',
        sql: 'SELECT COUNT(*) as total FROM ${tableName};',
        variables: ['tableName'],
    },
    {
        id: 'group-by',
        name: 'Group By with Count',
        description: 'Group data and count occurrences',
        category: 'Data Queries',
        sql: 'SELECT ${column}, COUNT(*) as count\nFROM ${tableName}\nGROUP BY ${column}\nORDER BY count DESC;',
        variables: ['column', 'tableName'],
    },
    // Data Modification
    {
        id: 'insert',
        name: 'Insert Row',
        description: 'Insert a new row',
        category: 'Data Modification',
        sql: "INSERT INTO ${tableName} (${columns})\nVALUES (${values});",
        variables: ['tableName', 'columns', 'values'],
    },
    {
        id: 'update',
        name: 'Update Rows',
        description: 'Update existing rows',
        category: 'Data Modification',
        sql: 'UPDATE ${tableName}\nSET ${column} = ${value}\nWHERE ${condition};',
        variables: ['tableName', 'column', 'value', 'condition'],
    },
    {
        id: 'delete',
        name: 'Delete Rows',
        description: 'Delete rows matching condition',
        category: 'Data Modification',
        sql: 'DELETE FROM ${tableName}\nWHERE ${condition};',
        variables: ['tableName', 'condition'],
    },
    // Schema
    {
        id: 'create-table',
        name: 'Create Table',
        description: 'Create a new table',
        category: 'Schema',
        sql: `CREATE TABLE \${tableName} (
    id SERIAL PRIMARY KEY,
    \${column1} \${type1},
    \${column2} \${type2},
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
        variables: ['tableName', 'column1', 'type1', 'column2', 'type2'],
    },
    {
        id: 'add-column',
        name: 'Add Column',
        description: 'Add a new column to table',
        category: 'Schema',
        sql: 'ALTER TABLE ${tableName}\nADD COLUMN ${columnName} ${dataType};',
        variables: ['tableName', 'columnName', 'dataType'],
    },
    {
        id: 'create-index',
        name: 'Create Index',
        description: 'Create an index for faster queries',
        category: 'Schema',
        sql: 'CREATE INDEX idx_${tableName}_${column}\nON ${tableName} (${column});',
        variables: ['tableName', 'column'],
    },
    // Joins
    {
        id: 'inner-join',
        name: 'Inner Join',
        description: 'Join two tables',
        category: 'Joins',
        sql: `SELECT a.*, b.*
FROM \${table1} a
INNER JOIN \${table2} b ON a.\${key1} = b.\${key2};`,
        variables: ['table1', 'table2', 'key1', 'key2'],
    },
    {
        id: 'left-join',
        name: 'Left Join',
        description: 'Left outer join two tables',
        category: 'Joins',
        sql: `SELECT a.*, b.*
FROM \${table1} a
LEFT JOIN \${table2} b ON a.\${key1} = b.\${key2};`,
        variables: ['table1', 'table2', 'key1', 'key2'],
    },
    // Analysis
    {
        id: 'table-stats',
        name: 'Table Statistics',
        description: 'Get table size and row count (PostgreSQL)',
        category: 'Analysis',
        sql: `SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;`,
        variables: [],
    },
    {
        id: 'slow-queries',
        name: 'Find Slow Queries (PostgreSQL)',
        description: 'List slow running queries',
        category: 'Analysis',
        sql: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '1 minute'
AND state != 'idle';`,
        variables: [],
    },
];

interface SQLTemplateModalProps {
    onSelect: (sql: string) => void;
    onClose: () => void;
}

export function SQLTemplateModal({ onSelect, onClose }: SQLTemplateModalProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const categories = [...new Set(DEFAULT_TEMPLATES.map(t => t.category))];

    const filteredTemplates = DEFAULT_TEMPLATES.filter(template => {
        const matchesSearch = !search ||
            template.name.toLowerCase().includes(search.toLowerCase()) ||
            template.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || template.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCopy = (template: SQLTemplate) => {
        navigator.clipboard.writeText(template.sql);
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleUse = (template: SQLTemplate) => {
        onSelect(template.sql);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-primary" />
                        SQL Templates
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-border space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1 text-sm rounded-full transition ${!selectedCategory
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-accent'
                                }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 text-sm rounded-full transition ${selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted hover:bg-accent'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.id}
                            className="border border-border rounded-lg p-4 hover:border-primary/50 transition"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="font-medium">{template.name}</h4>
                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                </div>
                                <span className="text-xs bg-muted px-2 py-1 rounded">{template.category}</span>
                            </div>
                            <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto mb-3">
                                {template.sql}
                            </pre>
                            {template.variables && template.variables.length > 0 && (
                                <div className="text-xs text-muted-foreground mb-3">
                                    Variables: {template.variables.map(v => `\${${v}}`).join(', ')}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUse(template)}
                                    className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition flex items-center justify-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Use Template
                                </button>
                                <button
                                    onClick={() => handleCopy(template)}
                                    className="px-3 py-1.5 border border-border text-sm rounded hover:bg-accent transition flex items-center gap-1"
                                >
                                    {copiedId === template.id ? (
                                        <>
                                            <Check className="w-4 h-4 text-green-500" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

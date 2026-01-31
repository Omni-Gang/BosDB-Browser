
import React, { useState, useEffect } from 'react';
import { Database, ChevronRight, ChevronDown, Table, FileSearch, RefreshCw, Layers, Terminal, FileCode } from 'lucide-react';

interface SchemaExplorerProps {
    connectionId: string;
    connection?: any; // Full connection object for displaying info
    onSelectTable: (tableName: string) => void;
}

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({ connectionId, connection, onSelectTable }) => {
    const [schemas, setSchemas] = useState<any[]>([]);
    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']));
    const [schemaTables, setSchemaTables] = useState<Map<string, any[]>>(new Map());
    const [schemaProcedures, setSchemaProcedures] = useState<Map<string, any[]>>(new Map());
    const [loading, setLoading] = useState(false);
    const [loadingTables, setLoadingTables] = useState<Map<string, boolean>>(new Map());
    const [loadingProcedures, setLoadingProcedures] = useState<Map<string, boolean>>(new Map());

    useEffect(() => {
        if (connectionId) {
            fetchSchemas();
        }
    }, [connectionId]);

    const fetchSchemas = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.db.listSchemas(connectionId);
            if (result.success) {
                setSchemas(result.data);
                // Expand public by default, or the first schema if public doesn't exist
                const publicSchema = result.data.find((s: any) => s.name === 'public');
                const firstSchema = result.data[0];
                const schemaToExpand = publicSchema ? 'public' : (firstSchema ? firstSchema.name : null);

                if (schemaToExpand) {
                    setExpandedSchemas(new Set([schemaToExpand]));
                    fetchTables(schemaToExpand);
                    fetchProcedures(schemaToExpand);
                }
            }
        } catch (e) {
            console.error('Failed to fetch schemas:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTables = async (schemaName: string) => {
        setLoadingTables(prev => new Map(prev).set(schemaName, true));
        try {
            // @ts-ignore
            const result = await window.electron.db.listTables({ connectionId, schema: schemaName });
            if (result.success) {
                setSchemaTables(prev => {
                    const next = new Map(prev);
                    next.set(schemaName, result.data);
                    return next;
                });
            }
        } catch (e) {
            console.error(`Failed to fetch tables for ${schemaName}:`, e);
        } finally {
            setLoadingTables(prev => {
                const next = new Map(prev);
                next.delete(schemaName);
                return next;
            });
        }
    };

    const fetchProcedures = async (schemaName: string) => {
        setLoadingProcedures(prev => new Map(prev).set(schemaName, true));
        try {
            // @ts-ignore
            const result = await window.electron.db.listProcedures({ connectionId, schema: schemaName });
            if (result.success) {
                setSchemaProcedures(prev => {
                    const next = new Map(prev);
                    next.set(schemaName, result.data || []);
                    return next;
                });
            }
        } catch (e) {
            console.error(`Failed to fetch procedures for ${schemaName}:`, e);
            // Set empty array on error to prevent retry loops
            setSchemaProcedures(prev => {
                const next = new Map(prev);
                next.set(schemaName, []);
                return next;
            });
        } finally {
            setLoadingProcedures(prev => {
                const next = new Map(prev);
                next.delete(schemaName);
                return next;
            });
        }
    };

    const toggleSchema = (name: string) => {
        const next = new Set(expandedSchemas);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
            if (!schemaTables.has(name)) {
                fetchTables(name);
            }
            if (!schemaProcedures.has(name)) {
                fetchProcedures(name);
            }
        }
        setExpandedSchemas(next);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-white/5 w-64 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-violet-400" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Explorer</h2>
                </div>
                <button
                    onClick={fetchSchemas}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Refresh Schema"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Connection Info */}
            {connection && (
                <div className="mx-4 mb-2 mt-0 p-2 bg-slate-800/50 border border-white/5 rounded text-[10px]">
                    <div className="font-bold text-slate-300 truncate" title={connection.name}>
                        {connection.name}
                    </div>
                    <div className="text-slate-500 truncate font-mono mt-1 flex items-center gap-1" title={`${connection.host}:${connection.port}`}>
                        <Database size={10} />
                        {connection.host}:{connection.port}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {schemas.length === 0 && !loading && (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide opacity-50">No Schemas Found</p>
                        <button onClick={fetchSchemas} className="mt-2 text-[9px] text-violet-400 hover:underline">Retry</button>
                    </div>
                )}

                {schemas.map(schema => (
                    <div key={schema.name} className="mb-1">
                        <div
                            onClick={() => toggleSchema(schema.name)}
                            className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer group select-none"
                        >
                            {expandedSchemas.has(schema.name) ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            <Database size={14} className="text-violet-500/50 group-hover:text-violet-400 transition-colors" />
                            <span className="text-xs font-bold text-slate-300 tracking-tight">{schema.name}</span>
                            {schema.tableCount > 0 && <span className="text-[9px] text-slate-600 ml-auto font-mono">{schema.tableCount}</span>}
                        </div>

                        {expandedSchemas.has(schema.name) && (
                            <div className="ml-5 border-l border-white/5 pl-2 mt-1 space-y-0.5">
                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Tables</div>
                                {loadingTables.get(schema.name) ? (
                                    <div className="p-2 text-[10px] text-slate-500 italic">Loading tables...</div>
                                ) : (schemaTables.get(schema.name) || []).length === 0 ? (
                                    <div className="p-2 text-[10px] text-slate-600 italic">No tables found</div>
                                ) : (
                                    (schemaTables.get(schema.name) || []).map(table => (
                                        <div
                                            key={table.name}
                                            onClick={() => onSelectTable(table.name)}
                                            className="flex items-center justify-between p-1.5 hover:bg-violet-600/10 rounded group cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Table size={12} className="text-slate-500 group-hover:text-violet-400 shrink-0" />
                                                <span className="text-[11px] text-slate-400 group-hover:text-slate-100 truncate">{table.name}</span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                <button className="p-1 hover:bg-violet-500/20 rounded text-violet-400" title="Quick SELECT">
                                                    <Terminal size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 mt-2">Procedures & Functions</div>
                                {loadingProcedures.get(schema.name) ? (
                                    <div className="p-2 text-[10px] text-slate-500 italic">Loading procedures...</div>
                                ) : (schemaProcedures.get(schema.name) || []).length === 0 ? (
                                    <div className="p-2 text-[10px] text-slate-600 italic">No procedures</div>
                                ) : (
                                    (schemaProcedures.get(schema.name) || []).map(proc => (
                                        <div
                                            key={proc.name}
                                            className="flex items-center gap-2 p-1.5 hover:bg-blue-600/10 rounded group cursor-pointer transition-all"
                                            title={`${proc.type}: ${proc.name}`}
                                        >
                                            <FileCode size={12} className="text-blue-400 group-hover:text-blue-300 shrink-0" />
                                            <span className="text-[11px] text-slate-400 group-hover:text-slate-100 truncate">{proc.name}</span>
                                            <span className="text-[8px] text-slate-600 ml-auto font-mono">{proc.type?.substring(0, 1)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

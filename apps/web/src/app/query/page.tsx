'use client';

import { getCurrentUser } from '@/lib/auth';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Play, Save, Download, Clock, Table as TableIcon, Database, ChevronRight, ChevronDown, GitBranch, Plus as PlusIcon, FileCode, Wand2, FileSearch, FileStack, Upload, RefreshCw, Bug, X } from 'lucide-react';
import Link from 'next/link';
import { trackChange, parseQueryForChanges, getPendingChanges, generateRollbackSQL } from '@/lib/vcs-helper';
import { extractTableName, getCurrentStatement } from '@/lib/sql-helper';
import { formatSQL, getDialectFromDbType, getExplainPrefix } from '@/lib/sql-formatter';
import { splitSQL } from '@/lib/sql-splitter';
import { saveTabs, loadTabs, createDefaultTabs, generateTabId } from '@/lib/query-storage';
import QueryTabs, { QueryTab } from '@/components/QueryTabs';
import DebuggerPanel from '@/components/DebuggerPanel';
import TableDesigner from '@/components/schema/TableDesigner';
import { SaveQueryModal } from '@/components/SaveQueryModal';
import { ExportModal } from '@/components/ExportModal';
import { ImportModal } from '@/components/ImportModal';
import { SQLTemplateModal } from '@/components/SQLTemplateModal';
import { TableContextMenu } from '@/components/TableContextMenu';
import { QueryPlanViewer } from '@/components/QueryPlanViewer';
import { ResultsToolbar } from '@/components/ResultsToolbar';
import { DataEditor } from '@/components/DataEditor';
import { AIAssistantPanel } from '@/components/AIAssistantPanel';
import { QueryHistory } from '@/components/QueryHistory';

// Define QueryResult interface
interface QueryResult {
    success: boolean;
    rows: any[];
    fields: { name: string; dataType: string }[];
    columnNames: string[]; // Stable list of column names
    rowCount: number;
    executionTime: number;
    hasMore?: boolean;
    tableName?: string; // Table name for inline editing
    originalQuery?: string; // Original query for reference
}

interface TableInfo {
    name: string;
    type: string;
    rowCount?: number;
}

// Comprehensive query syntax validation for all database types
function validateQuerySyntax(query: string, dbType: string): string {
    const lowerQuery = query.toLowerCase();
    const warnings: string[] = [];

    if (dbType === 'postgresql') {
        // PostgreSQL-specific validations
        if (lowerQuery.includes('auto_increment')) {
            warnings.push('AUTO_INCREMENT → Use SERIAL or BIGSERIAL instead');
        }
        if (lowerQuery.match(/\bint\s+auto_increment/i)) {
            warnings.push('INT AUTO_INCREMENT → Use SERIAL PRIMARY KEY');
        }
        if (lowerQuery.includes('tinyint')) {
            warnings.push('TINYINT → Use SMALLINT or BOOLEAN instead');
        }
        if (lowerQuery.match(/\bvarchar\(\d+\)/)) {
            // This is fine, but suggest TEXT for large strings
            if (!lowerQuery.includes('text')) {
                const match = lowerQuery.match(/varchar\((\d+)\)/);
                if (match && parseInt(match[1]) > 1000) {
                    warnings.push('VARCHAR(>1000) → Consider using TEXT type');
                }
            }
        }
        if (lowerQuery.includes('datetime')) {
            warnings.push('DATETIME → PostgreSQL uses TIMESTAMP');
        }
        if (lowerQuery.includes('double')) {
            warnings.push('DOUBLE → Use DOUBLE PRECISION or NUMERIC');
        }
        if (lowerQuery.includes('mediumtext') || lowerQuery.includes('longtext')) {
            warnings.push('MEDIUMTEXT/LONGTEXT → Use TEXT in PostgreSQL');
        }
    }

    if (dbType === 'mysql' || dbType === 'mariadb') {
        // MySQL/MariaDB-specific validations
        if (lowerQuery.includes('serial')) {
            warnings.push('SERIAL → Use AUTO_INCREMENT instead');
        }
        if (lowerQuery.match(/\bboolean\b/)) {
            warnings.push('BOOLEAN → Use TINYINT(1) in MySQL');
        }
        if (lowerQuery.includes('bigserial')) {
            warnings.push('BIGSERIAL → Use BIGINT AUTO_INCREMENT');
        }
        if (lowerQuery.match(/\btimestamp\b/) && !lowerQuery.includes('default')) {
            warnings.push('TIMESTAMP should have DEFAULT CURRENT_TIMESTAMP');
        }
        if (lowerQuery.match(/\btext\b/) && !lowerQuery.includes('longtext') && !lowerQuery.includes('mediumtext')) {
            warnings.push('TEXT in MySQL is limited to 65KB. Consider MEDIUMTEXT or LONGTEXT');
        }
        if (lowerQuery.includes('double precision')) {
            warnings.push('DOUBLE PRECISION → Use DOUBLE in MySQL');
        }
        if (lowerQuery.includes('smallserial')) {
            warnings.push('SMALLSERIAL → Use SMALLINT AUTO_INCREMENT');
        }
    }

    if (dbType === 'mongodb') {
        // MongoDB-specific validations
        if (lowerQuery.includes('select') || lowerQuery.includes('insert') || lowerQuery.includes('create')) {
            warnings.push('MongoDB uses JSON format, not SQL! Example: {"find": "collection", "filter": {}}');
        }

        // Check if valid JSON
        try {
            const parsed = JSON.parse(query);

            // Validate MongoDB query structure
            if (!parsed.find && !parsed.aggregate && !parsed.insert && !parsed.update && !parsed.delete) {
                warnings.push('MongoDB query must have: find, aggregate, insert, update, or delete');
            }

            // Check for common mistakes
            if (parsed.find && !parsed.filter && Object.keys(parsed).length === 1) {
                warnings.push('Tip: Add "filter" field for query conditions. Example: {"find": "users", "filter": {"age": {"$gt": 18}}}');
            }
        } catch (e) {
            warnings.push('Invalid JSON format! MongoDB queries must be valid JSON');
        }
    }

    if (dbType === 'redis') {
        // Redis-specific validations
        if (lowerQuery.includes('select') || lowerQuery.includes('insert') || lowerQuery.includes('create')) {
            warnings.push('Redis uses JSON format, not SQL! Example: {"command": "GET", "args": ["mykey"]}');
        }

        // Check if valid JSON
        try {
            const parsed = JSON.parse(query);

            if (!parsed.command) {
                warnings.push('Redis query must have "command" field. Example: {"command": "KEYS", "args": ["*"]}');
            }
        } catch (e) {
            warnings.push('Invalid JSON format! Redis queries must be valid JSON');
        }
    }

    // Common validations for SQL databases
    if (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb') {
        // Check for missing semicolon at end (optional but good practice)
        if (!query.trim().endsWith(';') && !query.trim().endsWith('}')) {
            // This is just a tip, not critical
        }

        // Warn about SELECT * in production
        if (lowerQuery.includes('select *') && !lowerQuery.includes('limit')) {
            warnings.push('Tip: Consider adding LIMIT clause to SELECT * queries');
        }

        // Check for DROP without IF EXISTS
        if (lowerQuery.includes('drop table') && !lowerQuery.includes('if exists')) {
            warnings.push('Safety: Consider using DROP TABLE IF EXISTS');
        }
    }

    // Return formatted warning message
    if (warnings.length === 0) {
        return '';
    }

    if (warnings.length === 1) {
        return `⚠️ ${warnings[0]}`;
    }

    return `⚠️ Syntax Warnings:\n${warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}`;
}

function QueryPageContent() {
    const searchParams = useSearchParams();
    const connectionId = searchParams?.get('connection');
    const { theme } = useTheme();

    // Multi-tab state
    const [tabs, setTabs] = useState<QueryTab[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [showDebugger, setShowDebugger] = useState(true);
    const [tabsLoaded, setTabsLoaded] = useState(false);

    // Current query is derived from active tab
    const query = tabs[activeTabIndex]?.query || '';
    const [results, setResults] = useState<QueryResult[]>([]);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [connectionInfo, setConnectionInfo] = useState<any>(null);
    const [schemas, setSchemas] = useState<any[]>([]);
    const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']));
    const [schemaTables, setSchemaTables] = useState<Map<string, TableInfo[]>>(new Map());
    const [schemaProcedures, setSchemaProcedures] = useState<Map<string, any[]>>(new Map());
    const [pendingChanges, setPendingChanges] = useState<number>(0);
    const [editorRef, setEditorRef] = useState<any>(null);
    const [showTableDesigner, setShowTableDesigner] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showQueryPlan, setShowQueryPlan] = useState(false);
    const [queryPlan, setQueryPlan] = useState<any>(null);
    const [filteredResults, setFilteredResults] = useState<Map<number, any[]>>(new Map());
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        tableName: string;
        schemaName: string;
    } | null>(null);
    const [importTable, setImportTable] = useState<{ name: string; schema: string } | null>(null);
    const [exportingIndex, setExportingIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [procedureMenu, setProcedureMenu] = useState<{
        x: number;
        y: number;
        procedureName: string;
        schemaName: string;
    } | null>(null);

    // Loading states map: schemaName -> { tables: boolean, procedures: boolean }
    const [loadingResources, setLoadingResources] = useState<Map<string, { tables: boolean; procedures: boolean }>>(new Map());
    const [resourceErrors, setResourceErrors] = useState<Map<string, string>>(new Map());
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [monacoInstance, setMonacoInstance] = useState<any>(null);
    const [debugSessionId, setDebugSessionId] = useState<string | null>(null);
    const [debugStatus, setDebugStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
    const [debugCurrentLine, setDebugCurrentLine] = useState<number | null>(null);
    const debugDecorationRef = useRef<string[]>([]);
    const breakpointDecorationsRef = useRef<Map<number, string[]>>(new Map());

    // Memoize columns for the first result (fallback)
    const columns = useMemo(() => results.length > 0 ? results[0].fields.map(f => f.name) : [], [results]);

    // Tab management functions
    const setQuery = useCallback((newQuery: string) => {
        setTabs(prevTabs => {
            const updated = [...prevTabs];
            if (updated[activeTabIndex]) {
                updated[activeTabIndex] = { ...updated[activeTabIndex], query: newQuery, isDirty: true };
            }
            return updated;
        });
    }, [activeTabIndex]);

    const currentBreakpoints = useMemo(() => tabs[activeTabIndex]?.breakpoints || [], [tabs, activeTabIndex]);

    const setBreakpointsForTab = useCallback((lineNumbers: number[]) => {
        setTabs(prevTabs => {
            const updated = [...prevTabs];
            if (updated[activeTabIndex]) {
                updated[activeTabIndex] = { ...updated[activeTabIndex], breakpoints: lineNumbers };
            }
            return updated;
        });
    }, [activeTabIndex]);

    const syncBreakpointToBackend = async (line: number, enabled: boolean) => {
        if (!debugSessionId) return;
        try {
            await fetch(`/api/debug/sessions/${debugSessionId}/breakpoints`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'line',
                    config: { lineNumber: line, enabled }
                })
            });
        } catch (e) {
            console.error('Failed to sync breakpoint:', e);
        }
    };

    const toggleBreakpoint = useCallback((line: number) => {
        const current = [...currentBreakpoints];
        const idx = current.indexOf(line);
        let enabled = true;
        if (idx >= 0) {
            current.splice(idx, 1);
            enabled = false;
        } else {
            current.push(line);
            enabled = true;
        }
        setBreakpointsForTab(current);
        syncBreakpointToBackend(line, enabled);
    }, [currentBreakpoints, setBreakpointsForTab, debugSessionId]);

    const addNewTab = useCallback(() => {
        const newTab: QueryTab = {
            id: generateTabId(),
            name: `Query ${tabs.length + 1}`,
            query: '',
            breakpoints: []
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabIndex(tabs.length);
    }, [tabs.length]);

    const closeTab = useCallback((index: number) => {
        if (tabs.length <= 1) return;
        setTabs(prev => prev.filter((_, i) => i !== index));
        if (activeTabIndex >= index && activeTabIndex > 0) {
            setActiveTabIndex(activeTabIndex - 1);
        }
    }, [tabs.length, activeTabIndex]);

    const renameTab = useCallback((index: number, newName: string) => {
        setTabs(prevTabs => {
            const updated = [...prevTabs];
            if (updated[index]) {
                updated[index] = { ...updated[index], name: newName };
            }
            return updated;
        });
    }, []);

    // Load tabs from localStorage on mount
    useEffect(() => {
        if (connectionId && !tabsLoaded) {
            const saved = loadTabs(connectionId);
            if (saved && saved.tabs.length > 0) {
                setTabs(saved.tabs);
                setActiveTabIndex(saved.activeIndex);
            } else {
                const defaults = createDefaultTabs();
                setTabs(defaults.tabs);
                setActiveTabIndex(defaults.activeIndex);
            }
            setTabsLoaded(true);
        }
    }, [connectionId, tabsLoaded]);

    // Save tabs to localStorage on changes (debounced)
    useEffect(() => {
        if (!connectionId || !tabsLoaded || tabs.length === 0) return;

        const timeoutId = setTimeout(() => {
            saveTabs(connectionId, { tabs, activeIndex: activeTabIndex });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [tabs, activeTabIndex, connectionId, tabsLoaded]);

    const updateLoading = (schema: string, type: 'tables' | 'procedures', isLoading: boolean) => {
        setLoadingResources(prev => {
            const next = new Map(prev);
            const current = next.get(schema) || { tables: false, procedures: false };
            next.set(schema, { ...current, [type]: isLoading });
            return next;
        });
    };

    const getHeaders = () => {
        const currentUser = getCurrentUser();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (currentUser?.email) headers['x-user-email'] = currentUser.email;
        if (currentUser?.organizationId) headers['x-org-id'] = currentUser.organizationId;
        return headers;
    };

    const handleRefresh = async () => {
        setSchemas([]);
        setSchemaTables(new Map());
        setSchemaProcedures(new Map());
        setExpandedSchemas(new Set());
        setLoadingResources(new Map());
        setResourceErrors(new Map());
        setResourceErrors(new Map());
        await fetchSchemas();
        await loadPendingChanges();
        await fetchHistory();
    };

    // Format SQL handler
    const handleFormatSQL = () => {
        if (!query.trim() || !connectionInfo) return;
        const dialect = getDialectFromDbType(connectionInfo.type);
        const formatted = formatSQL(query, { dialect });
        setQuery(formatted);
    };

    // Explain Query handler
    const handleExplainQuery = async () => {
        if (!connectionId || !query.trim() || !connectionInfo) return;

        setExecuting(true);
        setError('');

        try {
            const explainPrefix = getExplainPrefix(connectionInfo.type);
            const explainQuery = explainPrefix + query.trim().replace(/;$/, '');

            const res = await fetch('/api/query', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    connectionId,
                    query: explainQuery,
                    timeout: 30000,
                    maxRows: 1000,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'EXPLAIN failed');
            }

            // Parse the plan from result
            let plan = data.rows;
            if (connectionInfo.type === 'postgresql' && data.rows?.[0]?.['QUERY PLAN']) {
                plan = data.rows[0]['QUERY PLAN'];
            }

            setQueryPlan(plan);
            setShowQueryPlan(true);
        } catch (err: any) {
            setError(`EXPLAIN failed: ${err.message}`);
        } finally {
            setExecuting(false);
        }
    };

    // Handle table right-click
    const handleTableContextMenu = (e: React.MouseEvent, tableName: string, schemaName: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, tableName, schemaName });
    };



    // Monaco decorations for breakpoints and current line
    useEffect(() => {
        if (!editorRef || !monacoInstance) return;

        const model = editorRef.getModel();
        if (model) {
            const newDecorations: any[] = [];

            // Highlight current execution line
            if (debugCurrentLine) {
                newDecorations.push({
                    range: new monacoInstance.Range(debugCurrentLine, 1, debugCurrentLine, 1),
                    options: {
                        isWholeLine: true,
                        className: 'debug-current-line-highlight',
                        glyphMarginClassName: 'debug-current-line-glyph',
                        stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });
            }

            // Highlight breakpoints
            currentBreakpoints.forEach(line => {
                newDecorations.push({
                    range: new monacoInstance.Range(line, 1, line, 1),
                    options: {
                        isWholeLine: false,
                        glyphMarginClassName: 'debug-breakpoint-glyph',
                        stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });
            });

            debugDecorationRef.current = editorRef.deltaDecorations(
                debugDecorationRef.current,
                newDecorations
            );
        }
    }, [editorRef, monacoInstance, debugCurrentLine, currentBreakpoints]);

    useEffect(() => {
        if (connectionId) {
            fetchConnectionInfo();
            fetchSchemas();
            loadPendingChanges();
            fetchHistory();
        }
    }, [connectionId]);

    // Register Autocomplete
    useEffect(() => {
        if (!monacoInstance || schemas.length === 0) return;

        const tableNames = Array.from(schemaTables.values()).flat().map(t => t.name);
        const schemaNames = schemas.map(s => s.name);

        const provider = monacoInstance.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: any, position: any) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = [
                    ...['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS', 'IN', 'IS', 'NULL', 'NOT', 'EXISTS', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'TRUNCATE'].map(k => ({
                        label: k,
                        kind: monacoInstance.languages.CompletionItemKind.Keyword,
                        insertText: k,
                        range: range,
                    })),
                    ...schemaNames.map(s => ({
                        label: s,
                        kind: monacoInstance.languages.CompletionItemKind.Module,
                        insertText: s,
                        range: range,
                    })),
                    ...tableNames.map(t => ({
                        label: t,
                        kind: monacoInstance.languages.CompletionItemKind.Class,
                        insertText: t,
                        range: range,
                    })),
                ];

                return { suggestions };
            },
        });

        return () => provider.dispose();
    }, [monacoInstance, schemas, schemaTables]);

    const loadPendingChanges = async () => {
        if (!connectionId) return;
        const changes = await getPendingChanges(connectionId);
        setPendingChanges(changes.length);
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`/api/history?connectionId=${connectionId}`, { headers: getHeaders() });
            const data = await res.json();
            if (data.history) {
                // Map server history format to frontend format if needed
                setHistory(data.history.map((h: any) => ({
                    id: h.id,
                    sql: h.query,
                    timestamp: new Date(h.executedAt),
                    duration: h.executionTime,
                    status: h.success ? 'success' : 'error'
                })));
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const fetchConnectionInfo = async () => {
        try {
            const res = await fetch('/api/connections', { headers: getHeaders() });
            const data = await res.json();
            const conn = data.connections?.find((c: any) => c.id === connectionId);
            setConnectionInfo(conn);
        } catch (err) {
            console.error('Failed to fetch connection info:', err);
        }
    };

    const fetchSchemas = async () => {
        try {
            const res = await fetch(`/api/schema?connectionId=${connectionId}`, { headers: getHeaders() });
            const data = await res.json();
            setSchemas(data.schemas || []);
        } catch (err) {
            console.error('Failed to fetch schemas:', err);
        }
    };

    const fetchProcedures = async (schemaName: string) => {
        updateLoading(schemaName, 'procedures', true);
        try {
            const res = await fetch(`/api/procedures?connectionId=${connectionId}&schema=${schemaName}`, { headers: getHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch procedures');
            setSchemaProcedures(prev => new Map(prev).set(schemaName, data.procedures || []));
        } catch (err: any) {
            console.error('Failed to fetch procedures:', err);
            setResourceErrors(prev => new Map(prev).set(`${schemaName}:procedures`, err.message));
        } finally {
            updateLoading(schemaName, 'procedures', false);
        }
    };

    const fetchTables = async (schemaName: string) => {
        updateLoading(schemaName, 'tables', true);
        try {
            const res = await fetch(`/api/tables?connectionId=${connectionId}&schema=${schemaName}`, { headers: getHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch tables');
            setSchemaTables(prev => new Map(prev).set(schemaName, data.tables || []));
        } catch (err: any) {
            console.error('Failed to fetch tables:', err);
            setResourceErrors(prev => new Map(prev).set(`${schemaName}:tables`, err.message));
        } finally {
            updateLoading(schemaName, 'tables', false);
        }
    };

    const toggleSchema = async (schemaName: string) => {
        const newExpanded = new Set(expandedSchemas);
        if (newExpanded.has(schemaName)) {
            newExpanded.delete(schemaName);
        } else {
            newExpanded.add(schemaName);
            // Fetch tables and procedures if not already loaded
            if (!schemaTables.has(schemaName)) {
                fetchTables(schemaName);
            }
            if (!schemaProcedures.has(schemaName)) {
                fetchProcedures(schemaName);
            }
        }
        setExpandedSchemas(newExpanded);
    };

    const executeQuery = useCallback(async (customQuery?: string) => {
        if (!connectionId) return;

        // Use custom query, selected text, or full text
        let rawQuery = (customQuery || query).trim();
        if (!customQuery && editorRef) {
            const selection = editorRef.getSelection();
            const selectedText = editorRef.getModel()?.getValueInRange(selection);
            if (selectedText && selectedText.trim()) {
                rawQuery = selectedText.trim();
            }
        }

        if (!rawQuery) return;

        setExecuting(true);
        setError('');
        setWarning('');
        setResults([]);

        const queries = splitSQL(rawQuery);

        if (queries.length === 0) {
            setExecuting(false);
            return;
        }

        const allResults: QueryResult[] = [];
        let finalError = '';

        try {
            for (const q of queries) {
                // Validate syntax (only show for the first one for brevity, or combine)
                if (connectionInfo) {
                    const syntaxWarning = validateQuerySyntax(q, connectionInfo.type);
                    if (syntaxWarning) setWarning(prev => prev ? `${prev}\n${syntaxWarning}` : syntaxWarning);
                }

                const qUpper = q.toUpperCase();
                let metadata: any = {};

                // Capture Metadata for Rollback (Row Snapshots & Schema)
                const isDrop = qUpper.startsWith('DROP TABLE') ||
                    (connectionInfo?.type === 'mongodb' && q.includes('"drop"')) ||
                    (connectionInfo?.type === 'redis' && q.toUpperCase().includes('"DEL"'));

                if (qUpper.startsWith('DELETE FROM') || qUpper.startsWith('UPDATE') || isDrop) {
                    try {
                        let tableNameMatch = q.match(/(?:DELETE\s+FROM|UPDATE|DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?)\s+([`"]?)([\w.]+)\1/i);

                        // Handle NoSQL matches if SQL regex fails
                        if (!tableNameMatch && isDrop) {
                            if (connectionInfo?.type === 'mongodb') {
                                const mMatch = q.match(/"drop"\s*:\s*"([^"]+)"/);
                                if (mMatch) tableNameMatch = [mMatch[0], '', mMatch[1]];
                            } else if (connectionInfo?.type === 'redis') {
                                const rMatch = q.match(/"args"\s*:\s*\[\s*"([^"]+)"/);
                                if (rMatch) tableNameMatch = [rMatch[0], '', rMatch[1]];
                            }
                        }

                        const whereMatch = q.match(/WHERE\s+([\s\S]+)$/i);

                        if (tableNameMatch) {
                            const fullTableName = tableNameMatch[2];
                            const whereClause = whereMatch ? whereMatch[0] : '';

                            if (isDrop) {
                                // Extract schema if present (e.g., public.users)
                                let schema = 'public';
                                let tableOnly = fullTableName;

                                if (fullTableName.includes('.')) {
                                    const parts = fullTableName.split('.');
                                    schema = parts[0].replace(/["`]/g, '');
                                    tableOnly = parts[1].replace(/["`]/g, '');
                                } else {
                                    tableOnly = fullTableName.replace(/["`]/g, '');
                                }

                                // Capture table structure (or collection/key info) before dropping
                                const ddlRes = await fetch(`/api/schema/table?connectionId=${connectionId}&table=${tableOnly}&schema=${schema}`, {
                                    headers: getHeaders(),
                                });
                                if (ddlRes.ok) {
                                    const ddlData = await ddlRes.json();
                                    metadata.originalCreateSQL = ddlData.sql;
                                    metadata.tableMetadata = ddlData.tableMetadata;
                                }
                            } else {
                                // Capture rows BEFORE they are changed/deleted
                                const tableNameOnly = fullTableName.includes('.') ? fullTableName.split('.')[1].replace(/["`]/g, '') : fullTableName.replace(/["`]/g, '');
                                const snapshotRes = await fetch('/api/query', {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify({
                                        connectionId,
                                        query: connectionInfo?.type === 'mongodb' ? q : `SELECT * FROM ${fullTableName} ${whereClause}`,
                                        timeout: 10000,
                                        maxRows: 1000
                                    }),
                                });

                                if (snapshotRes.ok) {
                                    const snapshotData = await snapshotRes.json();
                                    if (qUpper.startsWith('DELETE FROM')) {
                                        metadata.rows = snapshotData.rows;
                                    } else {
                                        metadata.oldRows = snapshotData.rows;
                                        metadata.primaryKeyFields = snapshotData.fields?.map((f: any) => f.name).slice(0, 1); // Heuristic
                                    }
                                }
                            }
                        }
                    } catch (snapErr) {
                        console.error('Failed to capture snapshot for rollback:', snapErr);
                    }
                }

                const res = await fetch('/api/query', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        connectionId,
                        query: q,
                        timeout: 30000,
                        maxRows: 1000,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    finalError = data.error || 'Query execution failed';
                    // We stop on the first error for safety
                    break;
                }

                // Extract table name from query for inline editing
                const tableNameFromQuery = extractTableName(q);

                const resultWithColumns: QueryResult = {
                    ...data,
                    columnNames: data.fields?.map((f: any) => f.name) || [],
                    tableName: tableNameFromQuery || undefined,
                    originalQuery: q
                };
                allResults.push(resultWithColumns);

                // Track database changes for version control
                const change = parseQueryForChanges(q, data.rowCount);
                if (change) {
                    // Enrich change with metadata and pre-generated rollback SQL
                    change.metadata = metadata;
                    change.rollbackSQL = generateRollbackSQL(q, metadata);
                    await trackChange(connectionId, change);
                }

                // Add to history
                const historyItem = {
                    id: crypto.randomUUID(),
                    sql: q,
                    timestamp: new Date(),
                    duration: data.executionTime,
                    status: 'success'
                };
                setHistory(prev => [historyItem, ...prev].slice(0, 50));
            }

            setResults(allResults);
            if (finalError) {
                setError(finalError);
                // Add error to history
                const errorHistoryItem = {
                    id: crypto.randomUUID(),
                    sql: queries[allResults.length] || rawQuery,
                    timestamp: new Date(),
                    duration: 0,
                    status: 'error'
                };
                setHistory(prev => [errorHistoryItem, ...prev].slice(0, 50));
            }

            // Reload pending changes once after all queries
            await loadPendingChanges();
            setActiveTab(0); // Show first result set
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExecuting(false);
        }
    }, [connectionId, query, editorRef, connectionInfo]);

    const executeByCursor = useCallback(async () => {
        if (!editorRef || !connectionId) return;

        const position = editorRef.getPosition();
        if (!position) return;

        const model = editorRef.getModel();
        if (!model) return;

        const offset = model.getOffsetAt(position);
        const fullSql = model.getValue();
        const statement = getCurrentStatement(fullSql, offset);

        if (statement) {
            await executeQuery(statement);
        }
    }, [editorRef, connectionId, executeQuery]);

    // Handle Ctrl+E shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                executeQuery();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                executeByCursor();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [executeQuery]);



    const exportToCSV = () => {
        if (results.length === 0 || !results[0].rows.length) return;

        const res = results[0];
        const headers = res.fields.map((f: any) => f.name).join(',');
        const rows = res.rows.map((row: any) =>
            res.fields.map((f: any) => JSON.stringify(row[f.name] || '')).join(',')
        );

        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `query-result-${Date.now()}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    };

    if (!connectionId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold mb-2">No connection selected</h2>
                    <p className="text-muted-foreground mb-6">
                        Please select a connection from the dashboard
                    </p>
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <Database className="w-8 h-8 text-primary" />
                            <span className="text-2xl font-bold">BosDB</span>
                        </Link>
                        <div className="text-sm text-muted-foreground">Query Editor</div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex">
                {/* Sidebar - Schema Explorer */}
                <aside className="w-64 border-r border-border p-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <TableIcon className="w-4 h-4" />
                            Explorer
                        </h3>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleRefresh}
                                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition"
                                title="Refresh Explorer"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowTableDesigner(true)}
                                className="p-1 hover:bg-accent rounded text-primary"
                                title="Create New Table"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {schemas.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No schemas found</p>
                        ) : (
                            schemas.map((schema) => (
                                <div key={schema.name} className="text-sm">
                                    <button
                                        onClick={() => toggleSchema(schema.name)}
                                        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-accent rounded transition"
                                    >
                                        {expandedSchemas.has(schema.name) ? (
                                            <ChevronDown className="w-3 h-3" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3" />
                                        )}
                                        <Database className="w-3 h-3" />
                                        <span className="font-medium">{schema.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            ({schema.tableCount})
                                        </span>
                                    </button>

                                    {expandedSchemas.has(schema.name) && (
                                        <div className="ml-6 mt-1 space-y-0.5">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Tables</div>

                                            {loadingResources.get(schema.name)?.tables ? (
                                                <div className="px-2 py-1 text-xs text-muted-foreground">Loading tables...</div>
                                            ) : resourceErrors.get(`${schema.name}:tables`) ? (
                                                <div className="px-2 py-1 text-xs text-destructive/80" title={resourceErrors.get(`${schema.name}:tables`)}>Error loading tables</div>
                                            ) : schemaTables.get(schema.name)?.length === 0 ? (
                                                <div className="px-2 py-1 text-xs text-muted-foreground italic">No tables</div>
                                            ) : (
                                                schemaTables.get(schema.name)?.map((table) => (
                                                    <button
                                                        key={table.name}
                                                        onClick={() => setQuery(`SELECT * FROM ${schema.name}.${table.name} LIMIT 100;`)}
                                                        onContextMenu={(e) => handleTableContextMenu(e, table.name, schema.name)}
                                                        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-accent rounded transition text-left"
                                                        title={`Click to query, right-click for options`}
                                                    >
                                                        <TableIcon className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs">{table.name}</span>
                                                        {table.type && (
                                                            <span className="text-xs text-muted-foreground ml-auto">
                                                                {table.type === 'BASE TABLE' ? 'T' : 'V'}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))
                                            )}

                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Procedures</div>

                                            {loadingResources.get(schema.name)?.procedures ? (
                                                <div className="px-2 py-1 text-xs text-muted-foreground">Loading procedures...</div>
                                            ) : resourceErrors.get(`${schema.name}:procedures`) ? (
                                                <div className="px-2 py-1 text-xs text-destructive/80" title={resourceErrors.get(`${schema.name}:procedures`)}>Error loading procedures</div>
                                            ) : schemaProcedures.get(schema.name)?.length === 0 ? (
                                                <div className="px-2 py-1 text-xs text-muted-foreground italic">No procedures</div>
                                            ) : (
                                                schemaProcedures.get(schema.name)?.map((proc) => (
                                                    <button
                                                        key={proc.name}
                                                        onClick={() => setQuery(`CALL ${schema.name}.${proc.name}();`)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            setProcedureMenu({
                                                                x: e.clientX,
                                                                y: e.clientY,
                                                                procedureName: proc.name,
                                                                schemaName: schema.name
                                                            });
                                                        }}
                                                        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-accent rounded transition text-left"
                                                        title={`Click to call, right-click for options`}
                                                    >
                                                        <FileCode className="w-3 h-3 text-blue-400" />
                                                        <span className="text-xs">{proc.name}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Top Bar - Database Info */}
                    {connectionInfo && (
                        <div className="bg-accent/30 border-b border-border px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-primary" />
                                    <span className="font-semibold">{connectionInfo.name}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Type: <span className="font-mono bg-background px-2 py-0.5 rounded">{connectionInfo.type.toUpperCase()}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {connectionInfo.host}:{connectionInfo.port}/{connectionInfo.database}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Query Tabs Bar */}
                    {tabs.length > 0 && (
                        <QueryTabs
                            tabs={tabs}
                            activeIndex={activeTabIndex}
                            onTabChange={setActiveTabIndex}
                            onTabClose={closeTab}
                            onTabAdd={addNewTab}
                            onTabRename={renameTab}
                        />
                    )}

                    {/* Toolbar */}
                    <div className="border-b border-border p-4 flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => executeQuery()}
                            disabled={executing || !query.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {executing ? 'Executing...' : 'Run (Ctrl+E)'}
                        </button>

                        <div className="w-px h-6 bg-border" />

                        <button
                            onClick={handleFormatSQL}
                            disabled={!query.trim()}
                            className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition flex items-center gap-2"
                            title="Format SQL"
                        >
                            <Wand2 className="w-4 h-4" />
                            Format
                        </button>

                        <button
                            onClick={() => setShowTemplates(true)}
                            className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition flex items-center gap-2"
                            title="SQL Templates"
                        >
                            <FileStack className="w-4 h-4" />
                            Templates
                        </button>

                        <div className="w-px h-6 bg-border" />

                        <button
                            className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition flex items-center gap-2"
                            onClick={() => setShowSaveModal(true)}
                            disabled={!query.trim()}
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>

                        {results.length > 0 && (
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        )}

                        <Link
                            href={`/version-control?connection=${connectionId}`}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 relative"
                        >
                            <GitBranch className="w-4 h-4" />
                            VCS
                            {pendingChanges > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {pendingChanges}
                                </span>
                            )}
                        </Link>

                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`px-3 py-2 border border-border rounded-lg transition flex items-center gap-2 ${showHistory ? 'bg-accent border-primary' : 'hover:bg-accent'}`}
                            title="Query History"
                        >
                            <Clock className="w-4 h-4" />
                            History
                        </button>

                        <button
                            onClick={() => setShowDebugger(!showDebugger)}
                            className={`px-3 py-2 border border-border rounded-lg transition flex items-center gap-2 ${showDebugger ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : 'hover:bg-accent'}`}
                            title="Toggle Debugger Panel"
                        >
                            <Bug className="w-4 h-4" />
                            Debug
                        </button>

                        <div className="flex-1" />

                        {results.length > 0 && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {results.reduce((acc, r) => acc + r.executionTime, 0)}ms
                                </div>
                                <div>{results.length} result set(s)</div>
                            </div>
                        )}
                    </div>

                    {/* Editor - Larger size for better usability */}
                    <div className="h-[450px] border-b border-border">
                        <Editor
                            height="100%"
                            language="sql"
                            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                            value={query}
                            onChange={(value: string | undefined) => setQuery(value || '')}
                            onMount={(editor: any, monaco: any) => {
                                setEditorRef(editor);
                                setMonacoInstance(monaco);

                                // Click on line numbers to toggle breakpoints
                                editor.onMouseDown((e: any) => {
                                    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
                                        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
                                        const lineNumber = e.target.position?.lineNumber;
                                        if (lineNumber) {
                                            toggleBreakpoint(lineNumber);
                                        }
                                    }
                                });
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: 'on',
                                glyphMargin: true,
                                lineDecorationsWidth: 10,
                            }}
                        />
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-auto p-4">
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        {warning && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg mb-4">
                                {warning}
                            </div>
                        )}
                        {/* Result Tabs */}
                        {results.length > 0 && (
                            <div className="flex border-b border-border mb-4 overflow-x-auto">
                                {results.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveTab(idx)}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === idx
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Result {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.length > 0 && results[activeTab] && (
                            <div className="animate-fadeIn">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                                        Result Set #{activeTab + 1} ({results[activeTab].rowCount} rows)
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Executed in {results[activeTab].executionTime}ms
                                    </div>
                                </div>

                                {results[activeTab].rows.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                                        Query executed successfully but returned no rows
                                    </div>
                                ) : (
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        <ResultsToolbar
                                            data={results[activeTab].rows}
                                            columns={results[activeTab].columnNames}
                                            onFilteredDataChange={(data) => {
                                                setFilteredResults(prev => {
                                                    const next = new Map(prev);
                                                    next.set(activeTab, data);
                                                    return next;
                                                });
                                            }}
                                            onExport={() => {
                                                setExportingIndex(activeTab);
                                                setShowExportModal(true);
                                            }}
                                        />
                                        <div className="h-[400px]">
                                            <DataEditor
                                                rows={results[activeTab].rows}
                                                fields={results[activeTab].fields}
                                                onSave={async (updates) => {
                                                    // Get table name from result set
                                                    const tableName = results[activeTab].tableName;
                                                    if (!tableName) {
                                                        alert('Cannot edit: Unable to determine table name from query. Only simple SELECT queries support inline editing.');
                                                        return;
                                                    }

                                                    // Execute UPDATE queries for each row
                                                    for (const update of updates) {
                                                        const setClauses = Object.entries(update.changes)
                                                            .map(([col, val]) => {
                                                                if (val === null) return `${col} = NULL`;
                                                                if (typeof val === 'string') return `${col} = '${val.replace(/'/g, "''")}'`;
                                                                if (typeof val === 'boolean') return `${col} = ${val}`;
                                                                return `${col} = ${val}`;
                                                            })
                                                            .join(', ');

                                                        const whereClauses = Object.entries(update.primaryKey)
                                                            .map(([col, val]) => {
                                                                if (val === null) return `${col} IS NULL`;
                                                                if (typeof val === 'string') return `${col} = '${val.replace(/'/g, "''")}'`;
                                                                return `${col} = ${val}`;
                                                            })
                                                            .join(' AND ');

                                                        const updateQuery = `UPDATE ${tableName} SET ${setClauses} WHERE ${whereClauses}`;

                                                        const res = await fetch('/api/query', {
                                                            method: 'POST',
                                                            headers: getHeaders(),
                                                            body: JSON.stringify({
                                                                connectionId,
                                                                query: updateQuery,
                                                                timeout: 30000
                                                            })
                                                        });

                                                        if (!res.ok) {
                                                            const errData = await res.json();
                                                            throw new Error(errData.error || 'Update failed');
                                                        }
                                                    }

                                                    // Refresh the current result set - re-run the original query
                                                    const originalQuery = results[activeTab].originalQuery;
                                                    if (originalQuery) {
                                                        const refreshRes = await fetch('/api/query', {
                                                            method: 'POST',
                                                            headers: getHeaders(),
                                                            body: JSON.stringify({
                                                                connectionId,
                                                                query: originalQuery,
                                                                timeout: 30000,
                                                                maxRows: 1000
                                                            })
                                                        });

                                                        if (refreshRes.ok) {
                                                            const refreshData = await refreshRes.json();
                                                            const updatedResult: QueryResult = {
                                                                ...refreshData,
                                                                columnNames: refreshData.fields?.map((f: any) => f.name) || [],
                                                                tableName: results[activeTab].tableName,
                                                                originalQuery: originalQuery
                                                            };

                                                            setResults(prev => {
                                                                const newResults = [...prev];
                                                                newResults[activeTab] = updatedResult;
                                                                return newResults;
                                                            });
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {results.length === 0 && !error && (
                            <div className="text-center py-12 text-muted-foreground">
                                Write a query and click &quot;Run&quot; (or Ctrl+E) to execute
                            </div>
                        )}
                    </div>
                </div>

                {/* Debugger Panel */}
                {showDebugger && connectionId && (
                    <DebuggerPanel
                        connectionId={connectionId}
                        currentQuery={query}
                        breakpoints={currentBreakpoints}
                        onToggleBreakpoint={toggleBreakpoint}
                        sessionId={debugSessionId}
                        setSessionId={setDebugSessionId}
                        status={debugStatus}
                        setStatus={setDebugStatus}
                        currentLine={debugCurrentLine}
                        setCurrentLine={setDebugCurrentLine}
                    />
                )}

                {/* History Sidebar */}
                {showHistory && (
                    <QueryHistory
                        history={history}
                        onSelect={(sql) => setQuery(sql)}
                        onRun={(sql) => {
                            setQuery(sql);
                            setTimeout(() => executeQuery(sql), 100);
                        }}
                        onClear={() => setHistory([])}
                        onRemove={(id) => setHistory(prev => prev.filter(item => item.id !== id))}
                    />
                )}
            </div>
            {/* Table Designer Modal */}
            {showTableDesigner && connectionId && (
                <TableDesigner
                    connectionId={connectionId}
                    onClose={() => setShowTableDesigner(false)}
                    onSuccess={() => {
                        setShowTableDesigner(false);
                        fetchSchemas(); // Refresh schema list
                    }}
                />
            )}
            {/* Save Query Modal */}
            {showSaveModal && connectionId && (
                <SaveQueryModal
                    query={query}
                    connectionId={connectionId}
                    onClose={() => setShowSaveModal(false)}
                    onSuccess={() => setShowSaveModal(false)}
                />
            )}

            {/* Export Modal */}
            {showExportModal && results[exportingIndex] && (
                <ExportModal
                    data={filteredResults.get(exportingIndex) || results[exportingIndex].rows}
                    columns={results[exportingIndex].columnNames}
                    tableName={`query-result-${exportingIndex + 1}-${Date.now()}`}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* Import Modal */}
            {showImportModal && importTable && connectionId && (
                <ImportModal
                    tableName={`${importTable.schema}.${importTable.name}`}
                    connectionId={connectionId}
                    onClose={() => {
                        setShowImportModal(false);
                        setImportTable(null);
                    }}
                    onSuccess={() => {
                        setShowImportModal(false);
                        setImportTable(null);
                    }}
                />
            )}

            {/* SQL Templates Modal */}
            {showTemplates && (
                <SQLTemplateModal
                    onSelect={(sql) => setQuery(sql)}
                    onClose={() => setShowTemplates(false)}
                />
            )}

            {/* Query Plan Viewer */}
            {showQueryPlan && queryPlan && connectionInfo && (
                <QueryPlanViewer
                    plan={queryPlan}
                    executionTime={results[0]?.executionTime}
                    dbType={connectionInfo.type}
                    onClose={() => setShowQueryPlan(false)}
                />
            )}

            {/* Table Context Menu */}
            {contextMenu && (
                <TableContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    tableName={contextMenu.tableName}
                    schemaName={contextMenu.schemaName}
                    onClose={() => setContextMenu(null)}
                    onSelectQuery={(sql) => setQuery(sql)}
                    onImport={() => {
                        setImportTable({ name: contextMenu.tableName, schema: contextMenu.schemaName });
                        setShowImportModal(true);
                        setContextMenu(null);
                    }}
                />
            )}

            {/* Procedure Context Menu */}
            {procedureMenu && (
                <div
                    className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
                    style={{ top: procedureMenu.y, left: procedureMenu.x }}
                    onClick={() => setProcedureMenu(null)}
                >
                    <button
                        onClick={() => setQuery(`CALL ${procedureMenu.schemaName}.${procedureMenu.procedureName}();`)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                        <Play className="w-4 h-4 text-green-500" />
                        Execute
                    </button>
                    <button
                        onClick={() => setQuery(`-- View definition of ${procedureMenu.procedureName}\nSELECT routine_definition FROM information_schema.routines WHERE routine_name = '${procedureMenu.procedureName}' AND routine_schema = '${procedureMenu.schemaName}';`)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                        <FileCode className="w-4 h-4 text-blue-500" />
                        View Definition
                    </button>
                    <button
                        onClick={() => setQuery(`-- Edit procedure (modify and execute)\n-- First, get the current definition:\nSELECT routine_definition FROM information_schema.routines WHERE routine_name = '${procedureMenu.procedureName}';`)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    >
                        <Wand2 className="w-4 h-4 text-purple-500" />
                        Edit
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                        onClick={() => setQuery(`DROP PROCEDURE IF EXISTS ${procedureMenu.schemaName}.${procedureMenu.procedureName};`)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Drop Procedure
                    </button>
                </div>
            )}

            {/* Click outside to close context menus */}
            {(procedureMenu || contextMenu) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setProcedureMenu(null);
                        setContextMenu(null);
                    }}
                />
            )}

            {/* AI Assistant - Floating Button */}
            {connectionId && connectionInfo && (
                <div className="fixed bottom-0 right-0 z-50 p-4">
                    <AIAssistantPanel
                        connectionId={connectionId}
                        connectionInfo={connectionInfo}
                        schemas={schemas.map(s => s.name)}
                        tables={Array.from(schemaTables.entries()).flatMap(([schema, tables]) =>
                            tables.map(t => ({ schema, name: t.name }))
                        )}
                        onInsertQuery={(sql) => setQuery(sql)}
                        onRunQuery={(sql) => {
                            setQuery(sql);
                            setTimeout(() => executeQuery(), 100);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// Wrapper with Suspense for useSearchParams
export default function QueryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
            <QueryPageContent />
        </Suspense>
    );
}

'use client';

import { useState } from 'react';
import { FileSearch, X, ChevronRight, ChevronDown, Clock, Cpu, HardDrive, AlertTriangle } from 'lucide-react';

interface QueryPlanViewerProps {
    plan: any;
    executionTime?: number;
    dbType: string;
    onClose: () => void;
}

interface PlanNode {
    type: string;
    details: Record<string, any>;
    cost?: { startup: number; total: number };
    rows?: number;
    width?: number;
    actualTime?: { min: number; max: number };
    actualRows?: number;
    loops?: number;
    children?: PlanNode[];
}

export function QueryPlanViewer({ plan, executionTime, dbType, onClose }: QueryPlanViewerProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

    // Parse plan based on database type
    const parsedPlan = parsePlan(plan, dbType);

    const toggleNode = (nodeId: string) => {
        const next = new Set(expandedNodes);
        if (next.has(nodeId)) {
            next.delete(nodeId);
        } else {
            next.add(nodeId);
        }
        setExpandedNodes(next);
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2">
                            <FileSearch className="w-5 h-5 text-primary" />
                            Query Execution Plan
                        </h3>
                        {executionTime !== undefined && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Execution time: {executionTime.toFixed(2)}ms
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {parsedPlan ? (
                        <div className="space-y-2">
                            <PlanNodeComponent
                                node={parsedPlan}
                                nodeId="root"
                                depth={0}
                                expandedNodes={expandedNodes}
                                onToggle={toggleNode}
                            />
                        </div>
                    ) : (
                        <div className="bg-muted rounded-lg p-4">
                            <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                                {typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                {parsedPlan && (
                    <div className="p-4 border-t border-border bg-muted/50">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-blue-500" />
                                <span className="text-muted-foreground">Estimated Cost:</span>
                                <span className="font-medium">{parsedPlan.cost?.total?.toFixed(2) || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-green-500" />
                                <span className="text-muted-foreground">Est. Rows:</span>
                                <span className="font-medium">{parsedPlan.rows || 'N/A'}</span>
                            </div>
                            {parsedPlan.actualRows !== undefined && (
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className={`w-4 h-4 ${Math.abs((parsedPlan.actualRows || 0) - (parsedPlan.rows || 0)) > (parsedPlan.rows || 1) * 0.5
                                            ? 'text-yellow-500'
                                            : 'text-green-500'
                                        }`} />
                                    <span className="text-muted-foreground">Actual Rows:</span>
                                    <span className="font-medium">{parsedPlan.actualRows}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PlanNodeComponent({
    node,
    nodeId,
    depth,
    expandedNodes,
    onToggle,
}: {
    node: PlanNode;
    nodeId: string;
    depth: number;
    expandedNodes: Set<string>;
    onToggle: (id: string) => void;
}) {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;

    const nodeTypeColors: Record<string, string> = {
        'Seq Scan': 'bg-red-500/20 text-red-600 border-red-500/30',
        'Index Scan': 'bg-green-500/20 text-green-600 border-green-500/30',
        'Index Only Scan': 'bg-green-500/20 text-green-600 border-green-500/30',
        'Bitmap Heap Scan': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
        'Hash Join': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        'Merge Join': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        'Nested Loop': 'bg-purple-500/20 text-purple-600 border-purple-500/30',
        'Sort': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
        'Aggregate': 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
    };

    const colorClass = Object.entries(nodeTypeColors).find(([key]) =>
        node.type.includes(key)
    )?.[1] || 'bg-gray-500/20 text-gray-600 border-gray-500/30';

    return (
        <div style={{ marginLeft: depth * 24 }}>
            <div
                className={`flex items-start gap-2 p-2 rounded-lg border ${colorClass} cursor-pointer hover:opacity-80 transition`}
                onClick={() => onToggle(nodeId)}
            >
                {hasChildren ? (
                    isExpanded ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )
                ) : (
                    <div className="w-4" />
                )}

                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{node.type}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                        {node.cost && (
                            <span>Cost: {node.cost.startup.toFixed(2)}..{node.cost.total.toFixed(2)}</span>
                        )}
                        {node.rows !== undefined && (
                            <span>Rows: {node.rows}</span>
                        )}
                        {node.actualRows !== undefined && (
                            <span>Actual: {node.actualRows}</span>
                        )}
                        {node.actualTime && (
                            <span>Time: {node.actualTime.min.toFixed(3)}..{node.actualTime.max.toFixed(3)}ms</span>
                        )}
                    </div>
                    {isExpanded && Object.keys(node.details).length > 0 && (
                        <div className="mt-2 text-xs space-y-0.5 opacity-80">
                            {Object.entries(node.details).map(([key, value]) => (
                                <div key={key}>
                                    <span className="font-medium">{key}:</span>{' '}
                                    <span>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-1 space-y-1">
                    {node.children!.map((child, index) => (
                        <PlanNodeComponent
                            key={index}
                            node={child}
                            nodeId={`${nodeId}-${index}`}
                            depth={depth + 1}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function parsePlan(plan: any, dbType: string): PlanNode | null {
    try {
        if (dbType === 'postgresql' || dbType === 'postgres') {
            return parsePostgresPlan(plan);
        } else if (dbType === 'mysql' || dbType === 'mariadb') {
            return parseMySQLPlan(plan);
        }
        return null;
    } catch {
        return null;
    }
}

function parsePostgresPlan(plan: any): PlanNode | null {
    // PostgreSQL EXPLAIN (FORMAT JSON) returns array
    const planData = Array.isArray(plan) ? plan[0]?.Plan : plan?.Plan || plan;
    if (!planData) return null;

    const parseNode = (node: any): PlanNode => ({
        type: node['Node Type'] || 'Unknown',
        details: {
            ...(node['Relation Name'] && { Table: node['Relation Name'] }),
            ...(node['Index Name'] && { Index: node['Index Name'] }),
            ...(node['Filter'] && { Filter: node['Filter'] }),
            ...(node['Join Type'] && { 'Join Type': node['Join Type'] }),
            ...(node['Sort Key'] && { 'Sort Key': node['Sort Key'].join(', ') }),
        },
        cost: node['Total Cost'] ? {
            startup: node['Startup Cost'] || 0,
            total: node['Total Cost'],
        } : undefined,
        rows: node['Plan Rows'],
        width: node['Plan Width'],
        actualTime: node['Actual Total Time'] ? {
            min: node['Actual Startup Time'] || 0,
            max: node['Actual Total Time'],
        } : undefined,
        actualRows: node['Actual Rows'],
        loops: node['Actual Loops'],
        children: node.Plans?.map(parseNode),
    });

    return parseNode(planData);
}

function parseMySQLPlan(plan: any): PlanNode | null {
    // MySQL EXPLAIN FORMAT=JSON
    const queryBlock = plan?.query_block;
    if (!queryBlock) return null;

    const parseTable = (table: any): PlanNode => ({
        type: table.access_type || 'table scan',
        details: {
            ...(table.table_name && { Table: table.table_name }),
            ...(table.key && { Key: table.key }),
            ...(table.used_key_parts && { 'Key Parts': table.used_key_parts.join(', ') }),
            ...(table.ref && { Ref: table.ref.join(', ') }),
            ...(table.filtered && { Filtered: `${table.filtered}%` }),
        },
        rows: table.rows_examined_per_scan,
        cost: table.cost_info ? {
            startup: 0,
            total: parseFloat(table.cost_info.read_cost || 0),
        } : undefined,
        children: [],
    });

    if (queryBlock.table) {
        return parseTable(queryBlock.table);
    }

    if (queryBlock.nested_loop) {
        return {
            type: 'Nested Loop',
            details: {},
            children: queryBlock.nested_loop.map((item: any) => parseTable(item.table)),
        };
    }

    return {
        type: 'Query Block',
        details: { 'Select ID': queryBlock.select_id },
        children: [],
    };
}

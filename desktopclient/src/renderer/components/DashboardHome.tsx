
import React from 'react';
import { Database, Plus, Play, Clock, Save, Server, Globe, Trash2, Shield, Layers, Cpu, Box, Zap } from 'lucide-react';

interface ConnectionConfig {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    isCloud?: boolean;
    isRailway?: boolean;
}

interface DashboardHomeProps {
    user: any;
    connections: Record<string, ConnectionConfig>;
    onSelectConnection: (conn: ConnectionConfig) => void;
    onNewConnection: () => void;
    onDeleteConnection: (id: string, e: React.MouseEvent) => void;
    onShowHistory: () => void;
    onShowSaved: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
    user,
    connections,
    onSelectConnection,
    onNewConnection,
    onDeleteConnection,
    onShowHistory,
    onShowSaved
}) => {

    const getDbIcon = (type: string) => {
        const safeType = (type || '').toLowerCase();
        switch (safeType) {
            case 'postgres': return <Database size={20} className="text-blue-400" />;
            case 'mysql': return <Database size={20} className="text-orange-400" />;
            case 'mongodb': return <Layers size={20} className="text-green-500" />;
            case 'mariadb': return <Database size={20} className="text-amber-200" />;
            case 'oracle': return <Shield size={20} className="text-red-500" />;
            case 'cassandra': return <Cpu size={20} className="text-cyan-400" />;
            case 'sqlite': return <Box size={20} className="text-slate-300" />;
            case 'redis': return <Zap size={20} className="text-red-600" />;
            default: return <Server size={20} className="text-slate-400" />;
        }
    };

    const actionCards = [
        {
            icon: <Plus size={24} className="text-white" />,
            title: 'New Connection',
            desc: 'Connect to a database',
            action: onNewConnection
        },
        {
            icon: <Play size={24} className="text-white" />,
            title: 'Run Query',
            desc: 'Execute SQL queries',
            action: () => alert('Please select a connection first to run queries.')
        },
        {
            icon: <Clock size={24} className="text-white" />,
            title: 'Query History',
            desc: 'View past queries',
            action: onShowHistory
        },
        {
            icon: <Save size={24} className="text-white" />,
            title: 'Saved Queries',
            desc: 'Access saved queries',
            action: onShowSaved
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-8 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white tracking-tight">Database Connections</h1>
                    <p className="text-slate-400 font-medium">Manage your database connections and execute queries</p>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-4 gap-4">
                    {actionCards.map((card, idx) => (
                        <button
                            key={idx}
                            onClick={card.action}
                            className="bg-slate-900/50 border border-white/5 hover:border-violet-500/50 hover:bg-slate-900 hover:shadow-2xl hover:shadow-violet-900/10 p-6 rounded-2xl text-left transition-all group active:scale-95"
                        >
                            <div className="mb-4 w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-violet-600">
                                {card.icon}
                            </div>
                            <h3 className="font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">{card.title}</h3>
                            <p className="text-xs text-slate-500 font-medium">{card.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Connections List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Your Connections</h2>

                    {Object.keys(connections).length === 0 ? (
                        <div className="p-12 border border-dashed border-white/10 rounded-2xl bg-slate-900/20 text-center">
                            <Database size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 font-medium mb-4">No connections yet</p>
                            <button
                                onClick={onNewConnection}
                                className="px-6 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-500 transition-colors"
                            >
                                Create your first connection
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.values(connections).map(conn => (
                                <div key={conn.id} className="bg-slate-900 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                                                {getDbIcon(conn.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base">{conn.name}</h3>
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">
                                                    {conn.type}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {conn.isCloud && (
                                                <span className="px-2 py-1 bg-blue-600/10 text-blue-400 text-[10px] font-bold rounded uppercase border border-blue-500/20">
                                                    ORG
                                                </span>
                                            )}
                                            <div className="px-2 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase">
                                                Disconnected
                                            </div>
                                            <button
                                                onClick={(e) => onDeleteConnection(conn.id, e)}
                                                className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded transition-colors ml-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-slate-400 mb-6 font-mono text-xs">
                                        <span className="text-slate-600 font-bold">Host:</span>
                                        <span className="truncate">{conn.host}</span>
                                        <span className="text-slate-600 font-bold">Database:</span>
                                        <span className="truncate">{conn.database}</span>
                                    </div>

                                    <button
                                        onClick={() => onSelectConnection(conn)}
                                        className="w-full py-2.5 bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm shadow-lg shadow-white/5 active:scale-[0.98]"
                                    >
                                        Open Query Editor
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

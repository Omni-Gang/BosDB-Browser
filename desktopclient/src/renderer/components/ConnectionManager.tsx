
// ConnectionManager.tsx
import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Link2, AlertCircle, CheckCircle2, Zap, Layers, Cpu, Globe, Box, Shield, Server, RefreshCw } from 'lucide-react';
import { PublicAccessModal } from './PublicAccessModal';

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

interface ConnectionManagerProps {
    onSelect: (conn: ConnectionConfig) => void;
    user: any;
    activeConnection: any;
    connections: Record<string, ConnectionConfig>;
    isRefreshing: boolean;
    onRefresh: () => void;
    onDelete: (id: string, e?: React.MouseEvent) => void;
    externalShowNew?: boolean;
    onExternalShowNewClose?: () => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
    onSelect,
    user,
    activeConnection,
    connections,
    isRefreshing,
    onRefresh,
    onDelete,
    externalShowNew,
    onExternalShowNewClose
}) => {
    // Removed internal connections/isRefreshing state
    const [showNew, setShowNew] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newTab, setNewTab] = useState<'manual' | 'railway'>('manual');
    const [form, setForm] = useState<Partial<ConnectionConfig>>({ type: 'postgres', port: 5432 });
    const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null);
    const [provisioning, setProvisioning] = useState(false);
    const [publicAccessConn, setPublicAccessConn] = useState<ConnectionConfig | null>(null);

    useEffect(() => {
        if (externalShowNew) {
            setShowNew(true);
            setNewTab('manual');
        }
    }, [externalShowNew]);

    const handleCloseNew = () => {
        setShowNew(false);
        if (onExternalShowNewClose) onExternalShowNewClose();
    };

    // Removed useEffect for loadConnections and menu listener (handled in App.tsx)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if we're updating an existing connection or creating a new one
        const id = (form as any).id || `conn_${Date.now()}`;
        const newConn = { ...form, id } as ConnectionConfig;

        // @ts-ignore
        await window.electron.db.saveConnection(newConn);

        // Push to cloud if user is logged in
        if (user) {
            try {
                await fetch('http://localhost:3000/api/connections', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': user.email,
                        'x-org-id': user.organizationId
                    },
                    body: JSON.stringify(newConn)
                });
            } catch (e) {
                console.error('Cloud Sync Save Error:', e);
            }
        }

        await onRefresh();
        handleCloseNew();
        setForm({ type: 'postgres', port: 5432 });
    };

    const handleRailwayConnect = async () => {
        setProvisioning(true);
        setStatus(null);
        try {
            // @ts-ignore
            const result = await window.electron.db.provisionRailway(form.type || 'postgres', form.name || 'Railway DB');
            if (result.success) {
                // Save the connection locally
                // @ts-ignore
                await window.electron.db.saveConnection(result.config);

                // Sync to cloud if logged in
                if (user) {
                    try {
                        await fetch('http://localhost:3000/api/connections', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-user-email': user.email,
                                'x-org-id': user.organizationId,
                                'x-user-role': user.role
                            },
                            body: JSON.stringify(result.config)
                        });
                    } catch (e) {
                        console.error('Failed to sync to cloud:', e);
                    }
                }

                await onRefresh();
                handleCloseNew();
                handleConnect(result.config);
            } else {
                setStatus({ type: 'error', msg: result.error });
            }
        } finally {
            setProvisioning(false);
        }
    };

    const handleConnect = async (conn: ConnectionConfig) => {
        setStatus(null);
        // @ts-ignore
        const result = await window.electron.db.connect(conn);
        if (result.success) {
            setStatus({ type: 'success', msg: `Connected to ${conn.name}` });
            onSelect(conn);
        } else {
            setStatus({ type: 'error', msg: result.error });
        }
    };

    // Removed handleDeleteConnection (handled in App.tsx)

    const getDbIcon = (type: string) => {
        const safeType = (type || '').toLowerCase();
        switch (safeType) {
            case 'postgres': return <Database size={14} className="text-blue-400" />;
            case 'mysql': return <Database size={14} className="text-orange-400" />;
            case 'mongodb': return <Layers size={14} className="text-green-500" />;
            case 'mariadb': return <Database size={14} className="text-amber-200" />;
            case 'oracle': return <Shield size={14} className="text-red-500" />;
            case 'cassandra': return <Cpu size={14} className="text-cyan-400" />;
            case 'sqlite': return <Box size={14} className="text-slate-300" />;
            case 'redis': return <Zap size={14} className="text-red-600" />;
            default: return <Server size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-white/5 w-72">
            {/* ... (existing header) ... */}
            <div className="p-4 border-b border-white/5 space-y-3 bg-slate-800/20">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connections</h2>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onRefresh}
                            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                            title="Reload Connections"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => {
                                setNewTab('manual');
                                setShowNew(true);
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                            title="New Connection (Ctrl+N)"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="SEARCH DATABASES..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-300 outline-none focus:border-violet-500 transition-all placeholder:opacity-30"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {Object.values(connections)
                    .filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.type || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(conn => {
                        const isActive = activeConnection?.id === conn.id;
                        return (
                            <div
                                key={conn.id}
                                onClick={() => handleConnect(conn)}
                                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isActive ? 'bg-violet-600/10 border-violet-500/30' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}
                            >
                                <div className={`w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110 ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40' : 'bg-slate-800 text-slate-400'}`}>
                                    {getDbIcon(conn.type)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-violet-400' : 'text-slate-200'}`}>{conn.name}</p>
                                        {conn.isRailway && <span className="text-[8px] bg-pink-500/20 text-pink-400 px-1 rounded font-bold uppercase tracking-tighter shadow-sm border border-pink-500/10">Railway</span>}
                                        {conn.isCloud && <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded-sm font-black uppercase tracking-[0.1em] border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Account Sync</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase font-mono">{conn.type} • {conn.host}</p>
                                </div>
                                {isActive && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                )}
                                <div className={`flex items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPublicAccessConn(conn);
                                        }}
                                        className="p-1.5 hover:bg-blue-500/20 text-slate-600 hover:text-blue-400 rounded transition-all"
                                        title="Public Access"
                                    >
                                        <Globe size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => onDelete(conn.id, e)}
                                        className="p-1.5 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded transition-all"
                                        title="Delete Connection"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {publicAccessConn && (
                <PublicAccessModal
                    connection={publicAccessConn}
                    onClose={() => setPublicAccessConn(null)}
                />
            )}

            {status && (
                <div className={`m-4 p-3 rounded-lg flex items-start gap-2 text-xs border animate-in fade-in slide-in-from-bottom-2 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
                    <span className="flex-1">{status.msg}</span>
                </div>
            )}

            {showNew && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 bg-slate-800/50">
                            <h3 className="font-bold text-lg text-white">Add Database</h3>
                            <div className="flex mt-4 bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => setNewTab('manual')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTab === 'manual' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    MANUAL DETAILS
                                </button>
                                <button
                                    onClick={() => setNewTab('railway')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTab === 'railway' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    DIRECT RAILWAY
                                </button>
                            </div>
                        </div>

                        {newTab === 'manual' ? (
                            <form onSubmit={handleSave}>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Provider</label>
                                        <select
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                            value={form.type}
                                            onChange={e => setForm({ ...form, type: e.target.value })}
                                        >
                                            <option value="postgres">PostgreSQL</option>
                                            <option value="mysql">MySQL</option>
                                            <option value="mariadb">MariaDB</option>
                                            <option value="mssql">SQL Server</option>
                                            <option value="oracle">Oracle</option>
                                            <option value="db2">IBM DB2</option>
                                            <option value="sqlite">SQLite</option>
                                            <option value="firebird">Firebird</option>
                                            <option value="cubrid">CUBRID</option>
                                            <option value="cockroachdb">CockroachDB</option>
                                            <option value="yugabyte">YugabyteDB</option>
                                            <option value="tidb">TiDB</option>
                                            <option value="spanner">Spanner</option>
                                            <option value="informix">Informix</option>
                                            <option value="sybase">Sybase</option>
                                            <option value="maxdb">SAP MaxDB</option>
                                            <option value="hana">SAP HANA</option>
                                            <option value="ingres">Ingres</option>
                                            <option value="interbase">InterBase</option>
                                            <option value="derby">Apache Derby</option>
                                            <option value="h2">H2</option>
                                            <option value="hsqldb">HSQLDB</option>
                                            <option value="access">MS Access</option>
                                            <option value="snowflake">Snowflake</option>
                                            <option value="redshift">Redshift</option>
                                            <option value="bigquery">BigQuery</option>
                                            <option value="teradata">Teradata</option>
                                            <option value="vertica">Vertica</option>
                                            <option value="greenplum">Greenplum</option>
                                            <option value="netezza">Netezza</option>
                                            <option value="exasol">Exasol</option>
                                            <option value="monetdb">MonetDB</option>
                                            <option value="clickhouse">ClickHouse</option>
                                            <option value="duckdb">DuckDB</option>
                                            <option value="trino">Trino</option>
                                            <option value="presto">Presto</option>
                                            <option value="hive">Hive</option>
                                            <option value="impala">Impala</option>
                                            <option value="spark">Spark SQL</option>
                                            <option value="drill">Apache Drill</option>
                                            <option value="phoenix">Phoenix</option>
                                            <option value="kyuubi">Kyuubi</option>
                                            <option value="athena">Athena</option>
                                            <option value="mongodb">MongoDB</option>
                                            <option value="couchbase">Couchbase</option>
                                            <option value="couchdb">CouchDB</option>
                                            <option value="cosmosdb">Cosmos DB</option>
                                            <option value="dynamodb">DynamoDB</option>
                                            <option value="cassandra">Cassandra</option>
                                            <option value="scylladb">ScyllaDB</option>
                                            <option value="hbase">HBase</option>
                                            <option value="redis">Redis</option>
                                            <option value="memcached">Memcached</option>
                                            <option value="neo4j">Neo4j</option>
                                            <option value="orientdb">OrientDB</option>
                                            <option value="arangodb">ArangoDB</option>
                                            <option value="timescaledb">Timescale</option>
                                            <option value="influxdb">InfluxDB</option>
                                            <option value="elasticsearch">Elasticsearch</option>
                                            <option value="solr">Solr</option>
                                            <option value="opensearch">OpenSearch</option>
                                            <option value="mimer">Mimer SQL</option>
                                            <option value="cache">InterSystems Cache</option>
                                            <option value="iris">InterSystems IRIS</option>
                                            <option value="yellowbrick">Yellowbrick</option>
                                            <option value="babelfish">Babelfish</option>
                                            <option value="virtuoso">Virtuoso</option>
                                            <option value="calcite">Apache Calcite</option>
                                            <option value="kylin">Apache Kylin</option>
                                            <option value="risingwave">RisingWave</option>
                                            <option value="denodo">Denodo</option>
                                            <option value="dremio">Dremio</option>
                                            <option value="edb">EDB Postgres</option>
                                            <option value="h2gis">H2GIS</option>
                                            <option value="cratedb">CrateDB</option>
                                            <option value="oceanbase">OceanBase</option>
                                            <option value="heavydb">HeavyDB</option>
                                            <option value="openedge">OpenEdge</option>
                                            <option value="pervasive">Pervasive</option>
                                            <option value="salesforce">Salesforce</option>
                                            <option value="sqream">SQream</option>
                                            <option value="fujitsu">Fujitsu</option>
                                            <option value="materialize">Materialize</option>
                                            <option value="ksqldb">ksqlDB</option>
                                            <option value="dameng">Dameng</option>
                                            <option value="altibase">Altibase</option>
                                            <option value="gaussdb">GaussDB</option>
                                            <option value="cloudberry">Cloudberry</option>
                                            <option value="gbase">GBase</option>
                                            <option value="dsql">Aurora DSQL</option>
                                            <option value="kingbase">Kingbase</option>
                                            <option value="greengage">Greengage</option>
                                            <option value="databricks">Databricks</option>
                                            <option value="ocient">Ocient</option>
                                            <option value="prestodb">PrestoDB</option>
                                            <option value="starrocks">StarRocks</option>
                                            <option value="arrow">Arrow</option>
                                            <option value="ferretdb">FerretDB</option>
                                            <option value="documentdb">DocumentDB</option>
                                            <option value="keyspaces">Keyspaces</option>
                                            <option value="timestream">Timestream</option>
                                            <option value="bigtable">Bigtable</option>
                                            <option value="neptune">Neptune</option>
                                            <option value="azuresql">Azure SQL</option>
                                            <option value="singlestore">SingleStore</option>
                                            <option value="nuodb">NuoDB</option>
                                            <option value="netsuite">NetSuite</option>
                                            <option value="adw">Oracle ADW</option>
                                            <option value="atp">Oracle ATP</option>
                                            <option value="ajd">Oracle AJD</option>
                                            <option value="cloudsql">Cloud SQL</option>
                                            <option value="alloydb">AlloyDB</option>
                                            <option value="firestore">Firestore</option>
                                            <option value="databend">Databend</option>
                                            <option value="teiid">Teiid</option>
                                            <option value="sparkhive">Spark Hive</option>
                                            <option value="gemfire">GemFire</option>
                                            <option value="ignite">Ignite</option>
                                            <option value="cloudera">Cloudera</option>
                                            <option value="snappydata">SnappyData</option>
                                            <option value="rabbitmq">RabbitMQ</option>
                                            <option value="minio">MinIO</option>
                                            <option value="dgraph">Dgraph</option>
                                            <option value="machbase">Machbase</option>
                                            <option value="tdengine">TDengine</option>
                                            <option value="timecho">IoTDB</option>
                                            <option value="dolphindb">DolphinDB</option>
                                            <option value="csv">CSV</option>
                                            <option value="wmi">WMI</option>
                                            <option value="dbf">DBF</option>
                                            <option value="raima">Raima</option>
                                            <option value="libsql">libSQL</option>
                                            <option value="surrealdb">SurrealDB</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Host</label>
                                            <input
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                                placeholder="localhost"
                                                value={form.host || ''}
                                                onChange={e => setForm({ ...form, host: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Port</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                                value={form.port}
                                                onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Database Name</label>
                                        <input
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                            placeholder="postgres"
                                            value={form.database || ''}
                                            onChange={e => setForm({ ...form, database: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Username</label>
                                            <input
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                                placeholder="postgres"
                                                value={form.username || ''}
                                                onChange={e => setForm({ ...form, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                                            <input
                                                type="password"
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                                placeholder="••••••••"
                                                value={form.password || ''}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Connection Alias</label>
                                        <input
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                                            placeholder="Production DB"
                                            value={form.name || ''}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/30 flex justify-end gap-3">
                                    <button type="button" onClick={handleCloseNew} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-violet-900/20">Connect Manually</button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg text-xs leading-relaxed text-pink-200">
                                    <strong>Direct Railway Provisioning:</strong> This will instantly create a new database on a shared Railway cloud instance. Perfect for testing or hosting projects without local setup.
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Database Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'postgres', name: 'Postgres', icon: <Database size={14} /> },
                                                { id: 'mysql', name: 'MySQL', icon: <Database size={14} /> },
                                                { id: 'mongodb', name: 'MongoDB', icon: <Layers size={14} /> },
                                                { id: 'mariadb', name: 'MariaDB', icon: <Database size={14} /> },
                                                { id: 'oracle', name: 'Oracle', icon: <Shield size={14} /> },
                                                { id: 'cassandra', name: 'Cassandra', icon: <Cpu size={14} /> },
                                                { id: 'mssql', name: 'SQL Server', icon: <Server size={14} /> },
                                                { id: 'redis', name: 'Redis', icon: <Zap size={14} /> },
                                                { id: 'sqlite', name: 'SQLite', icon: <Box size={14} /> },
                                                { id: 'cockroachdb', name: 'Cockroach', icon: <Database size={14} /> },
                                                { id: 'elasticsearch', name: 'Search', icon: <Layers size={14} /> },
                                                { id: 'neo4j', name: 'Neo4j', icon: <Cpu size={14} /> }
                                            ].map(db => (
                                                <button
                                                    key={db.id}
                                                    onClick={() => setForm({ ...form, type: db.id })}
                                                    className={`p-3 rounded-lg border text-[10px] font-black uppercase flex flex-col items-center gap-2 transition-all ${form.type === db.id ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/40' : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'}`}
                                                >
                                                    {db.icon}
                                                    <span>{db.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Workplace Name</label>
                                        <input
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-500"
                                            placeholder="My Railway Project"
                                            value={form.name || ''}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/30 flex justify-end gap-3 rounded-b-xl -mx-6 -mb-6">
                                    <button type="button" onClick={handleCloseNew} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancel</button>
                                    <button
                                        onClick={handleRailwayConnect}
                                        disabled={provisioning}
                                        className="px-6 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-800 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-pink-900/40 flex items-center gap-2"
                                    >
                                        {provisioning && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        <Plus size={14} strokeWidth={3} />
                                        PROVISION ON RAILWAY
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

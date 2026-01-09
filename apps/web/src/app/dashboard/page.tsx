'use client';

import { useState, useEffect } from 'react';
import { Database, Plus, Play, History, Save, LogOut, User, Shield, Zap, Star, Building, Lock, Trash2 } from 'lucide-react';
import { VALID_DATABASE_TYPES } from '@/constants/database-types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/auth';
import { fetchOrgSubscription, getOrgSubscriptionStatus, isDatabaseAllowed, isPro } from '@/lib/subscription';

interface Connection {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    status: string;
    readOnly: boolean;
    organizationId?: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewConnection, setShowNewConnection] = useState(false);
    const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState({ isPro: false, isTrial: false });
    const [orgName, setOrgName] = useState<string | null>(null);

    useEffect(() => {
        // Check if user is logged in
        const user = getCurrentUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setCurrentUser(user);

        // Fetch organization subscription status
        if (user.organizationId) {
            fetchOrgSubscription(user.organizationId).then(status => {
                setSubscriptionStatus(status);
                const cached = getOrgSubscriptionStatus();
                setOrgName(cached.orgName);
            });
        }
    }, [router]);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const user = getCurrentUser();
            const headers: HeadersInit = {};
            if (user?.email) {
                headers['x-user-email'] = user.email;
            }
            if (user?.organizationId) {
                headers['x-org-id'] = user.organizationId;
            }
            const res = await fetch('/api/connections', { headers });
            const data = await res.json();
            setConnections(data.connections || []);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <Database className="w-8 h-8 text-primary" />
                            <span className="text-2xl font-bold">BosDB</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            {orgName && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <Building className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-400">{orgName}</span>
                                </div>
                            )}
                            {currentUser && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                                    <User className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{currentUser.name}</span>
                                    <span className="text-xs text-muted-foreground">({currentUser.id})</span>
                                </div>
                            )}
                            <Link href="/docs">
                                <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                                    Documentation
                                </button>
                            </Link>

                            <Link href="/settings">
                                <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                                    Settings
                                </button>
                            </Link>
                            {currentUser?.role === 'admin' && currentUser?.accountType === 'enterprise' && (
                                <Link href="/admin">
                                    <button className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition flex items-center gap-1">
                                        <Shield className="w-4 h-4" />
                                        Admin Panel
                                    </button>
                                </Link>
                            )}
                            {!subscriptionStatus.isPro && (
                                <Link href="/pricing">
                                    <button className="px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition flex items-center gap-1">
                                        <Zap className="w-4 h-4" />
                                        Upgrade to Pro
                                    </button>
                                </Link>
                            )}
                            {subscriptionStatus.isPro && (
                                <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${subscriptionStatus.isTrial
                                    ? 'bg-gradient-to-r from-green-500/20 to-teal-500/20 text-green-400'
                                    : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400'
                                    }`}>
                                    <Star className="w-3 h-3" />
                                    {subscriptionStatus.isTrial ? 'Trial' : 'Pro'}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    logout();
                                    router.push('/login');
                                }}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Database Connections</h1>
                    <p className="text-muted-foreground">
                        Manage your database connections and execute queries
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <QuickActionCard
                        icon={<Plus className="w-6 h-6" />}
                        title="New Connection"
                        description="Connect to a database"
                        onClick={() => setShowNewConnection(true)}
                    />
                    <QuickActionCard
                        icon={<Play className="w-6 h-6" />}
                        title="Run Query"
                        description="Execute SQL queries"
                        disabled={connections.length === 0}
                        href={connections.length > 0 ? `/query?connection=${connections[0].id}` : undefined}
                    />
                    <QuickActionCard
                        icon={<History className="w-6 h-6" />}
                        title="Query History"
                        description="View past queries"
                        href="/history"
                    />
                    <QuickActionCard
                        icon={<Save className="w-6 h-6" />}
                        title="Saved Queries"
                        description="Access saved queries"
                        href="/saved-queries"
                    />
                </div>

                {/* Connections List */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Your Connections</h2>

                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Get started by creating your first database connection
                            </p>
                            <button
                                onClick={() => setShowNewConnection(true)}
                                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                            >
                                <Plus className="w-4 h-4 inline mr-2" />
                                New Connection
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {connections.map((conn) => (
                                <ConnectionCard key={conn.id} connection={conn} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* New Connection Modal */}
            {showNewConnection && (
                <NewConnectionModal
                    onClose={() => setShowNewConnection(false)}
                    isPro={subscriptionStatus.isPro}
                    onSuccess={() => {
                        setShowNewConnection(false);
                        fetchConnections();
                    }}
                />
            )}
        </div>
    );
}

function QuickActionCard({
    icon,
    title,
    description,
    onClick,
    disabled,
    href,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick?: () => void;
    disabled?: boolean;
    href?: string;
}) {
    const content = (
        <>
            <div className="text-primary mb-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </>
    );

    const className = `p-6 bg-card border border-border rounded-lg text-left transition-all hover:border-primary hover:shadow-lg group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    if (href && !disabled) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
        >
            {content}
        </button>
    );
}

function ConnectionCard({ connection }: { connection: Connection }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete connection "${connection.name}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            const user = getCurrentUser();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (user?.email) {
                headers['x-user-email'] = user.email;
            }
            if (user?.organizationId) {
                headers['x-org-id'] = user.organizationId;
            }

            const res = await fetch(`/api/connections?id=${connection.id}`, {
                method: 'DELETE',
                headers
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete connection');
            }

            // Refresh connections list
            window.location.reload();
        } catch (error: any) {
            alert(error.message || 'Failed to delete connection');
            setDeleting(false);
        }
    };

    return (
        <div className="p-6 bg-card border border-border rounded-lg hover:border-primary transition-all group relative">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{connection.name}</h3>
                            {connection.organizationId && (
                                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                                    Org
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{connection.type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={`px-2 py-1 text-xs rounded-full ${connection.status === 'connected'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-gray-500'
                            }`}
                    >
                        {connection.status}
                    </span>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition disabled:opacity-50"
                        title="Delete connection"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span>
                    <span className="font-mono">{connection.host}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Database:</span>
                    <span className="font-mono">{connection.database}</span>
                </div>
                {connection.readOnly && (
                    <div className="text-xs text-amber-500">Read-only mode</div>
                )}
            </div>

            <Link
                href={`/query?connection=${connection.id}`}
                className="block w-full px-4 py-2 bg-primary text-primary-foreground text-center rounded-lg hover:bg-primary/90 transition"
            >
                Open Query Editor
            </Link>
        </div>
    );
}

function NewConnectionModal({
    onClose,
    onSuccess,
    isPro,
}: {
    onClose: () => void;
    onSuccess: () => void;
    isPro: boolean;
}) {
    const router = useRouter();
    const [provisioning, setProvisioning] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualConnection, setManualConnection] = useState({
        name: '',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: '',
        ssl: false,
        readOnly: false,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', name: 'All' },
        { id: 'relational', name: 'Relational' },
        { id: 'analytical', name: 'Analytical' },
        { id: 'nosql', name: 'NoSQL' },
        { id: 'cloud', name: 'Cloud' },
        { id: 'bigdata', name: 'Big Data' },
        { id: 'specialized', name: 'Specialized' },
        { id: 'embedded', name: 'Embedded' },
    ];

    const allDatabases = [
        // Relational
        { id: 'postgres', name: 'PostgreSQL', icon: '🐘', category: 'relational', desc: 'Advanced open-source object-relational database' },
        { id: 'mysql', name: 'MySQL', icon: '🐬', category: 'relational', desc: 'Most popular open-source database' },
        { id: 'mariadb', name: 'MariaDB', icon: '🦭', category: 'relational', desc: 'Open source fork of MySQL' },
        { id: 'mssql', name: 'SQL Server', icon: '🏢', category: 'relational', desc: 'Microsoft enterprise database' },
        { id: 'oracle', name: 'Oracle', icon: '🔴', category: 'relational', desc: 'Enterprise multi-model database' },
        { id: 'db2', name: 'IBM DB2', icon: '🔵', category: 'relational', desc: 'IBM enterprise database' },
        { id: 'sqlite', name: 'SQLite', icon: '💾', category: 'embedded', desc: 'Self-contained, serverless database' },
        { id: 'firebird', name: 'Firebird', icon: '🔥', category: 'relational', desc: 'True universal open source database' },
        { id: 'cubrid', name: 'CUBRID', icon: '🧊', category: 'relational', desc: 'Open source optimized for web' },
        { id: 'cockroachdb', name: 'CockroachDB', icon: '🪳', category: 'relational', desc: 'Distributed SQL database' },
        { id: 'yugabyte', name: 'YugabyteDB', icon: '🚀', category: 'relational', desc: 'High-performance distributed SQL' },
        { id: 'tidb', name: 'TiDB', icon: '📐', category: 'relational', desc: 'Open source distributed HTAP' },
        { id: 'spanner', name: 'Spanner', icon: '🌐', category: 'cloud', desc: 'Google Cloud distributed database' },
        { id: 'informix', name: 'Informix', icon: 'ℹ️', category: 'relational', desc: 'IBM securable embedded database' },
        { id: 'sybase', name: 'Sybase', icon: '⚡', category: 'relational', desc: 'Enterprise relational database' },
        { id: 'maxdb', name: 'SAP MaxDB', icon: '💠', category: 'relational', desc: 'SAP enterprise database' },
        { id: 'hana', name: 'SAP HANA', icon: '🍃', category: 'analytical', desc: 'In-memory, column-oriented RDBMS' },
        { id: 'ingres', name: 'Ingres', icon: '🚪', category: 'relational', desc: 'Commercial open source database' },
        { id: 'interbase', name: 'InterBase', icon: '⚾', category: 'relational', desc: 'Embeddable SQL database' },
        { id: 'derby', name: 'Apache Derby', icon: '🐎', category: 'embedded', desc: 'Java relational database' },
        { id: 'h2', name: 'H2', icon: '🧪', category: 'embedded', desc: 'Fast Java SQL database' },
        { id: 'hsqldb', name: 'HSQLDB', icon: '📝', category: 'embedded', desc: 'Leading Java SQL database' },
        { id: 'access', name: 'MS Access', icon: '🔑', category: 'embedded', desc: 'Desktop database management' },
        { id: 'snowflake', name: 'Snowflake', icon: '❄️', category: 'cloud', desc: 'Cloud data platform' },
        { id: 'redshift', name: 'Redshift', icon: '🟥', category: 'cloud', desc: 'AWS data warehouse' },
        { id: 'bigquery', name: 'BigQuery', icon: '🔎', category: 'cloud', desc: 'Google serverless warehouse' },
        { id: 'teradata', name: 'Teradata', icon: '📊', category: 'analytical', desc: 'Enterprise data analytics' },
        { id: 'vertica', name: 'Vertica', icon: '📈', category: 'analytical', desc: 'Unified analytics warehouse' },
        { id: 'greenplum', name: 'Greenplum', icon: '🍏', category: 'analytical', desc: 'Massively parallel Postgres' },
        { id: 'netezza', name: 'Netezza', icon: '🕸️', category: 'analytical', desc: 'High-performance analytics' },
        { id: 'exasol', name: 'Exasol', icon: '⚡', category: 'analytical', desc: 'In-memory analytics database' },
        { id: 'monetdb', name: 'MonetDB', icon: '🎨', category: 'analytical', desc: 'Column-store database' },
        { id: 'clickhouse', name: 'ClickHouse', icon: '🏠', category: 'analytical', desc: 'Real-time analytics DBMS' },
        { id: 'duckdb', name: 'DuckDB', icon: '🦆', category: 'analytical', desc: 'In-process SQL OLAP' },
        { id: 'trino', name: 'Trino', icon: '🐰', category: 'analytical', desc: 'Distributed SQL query engine' },
        { id: 'presto', name: 'Presto', icon: '🏃', category: 'analytical', desc: 'Distributed SQL query engine' },
        { id: 'hive', name: 'Hive', icon: '🐝', category: 'bigdata', desc: 'Data warehouse software' },
        { id: 'impala', name: 'Impala', icon: '🦌', category: 'bigdata', desc: 'Native analytic database' },
        { id: 'spark', name: 'Spark SQL', icon: '✨', category: 'bigdata', desc: 'Large-scale data processing' },
        { id: 'drill', name: 'Apache Drill', icon: '🔩', category: 'bigdata', desc: 'Schema-free SQL engine' },
        { id: 'phoenix', name: 'Phoenix', icon: '🔥', category: 'bigdata', desc: 'OLTP for Hadoop' },
        { id: 'kyuubi', name: 'Kyuubi', icon: '🦊', category: 'bigdata', desc: 'Distributed JDBC driver' },
        { id: 'athena', name: 'Athena', icon: '🦉', category: 'cloud', desc: 'Serverless query service' },
        { id: 'mongodb', name: 'MongoDB', icon: '🍃', category: 'nosql', desc: 'Document-oriented database' },
        { id: 'couchbase', name: 'Couchbase', icon: '🛋️', category: 'nosql', desc: 'Distributed NoSQL cloud db' },
        { id: 'couchdb', name: 'CouchDB', icon: '🛋️', category: 'nosql', desc: 'Seamless multi-master sync' },
        { id: 'cosmosdb', name: 'Cosmos DB', icon: '🪐', category: 'cloud', desc: 'Microsoft NoSQL database' },
        { id: 'dynamodb', name: 'DynamoDB', icon: '⚡', category: 'cloud', desc: 'AWS key-value database' },
        { id: 'cassandra', name: 'Cassandra', icon: '👁️', category: 'nosql', desc: 'Wide-column store' },
        { id: 'scylladb', name: 'ScyllaDB', icon: '👹', category: 'nosql', desc: 'High-performance NoSQL' },
        { id: 'hbase', name: 'HBase', icon: '🐘', category: 'bigdata', desc: 'Distributed scalable big data' },
        { id: 'redis', name: 'Redis', icon: '🥡', category: 'nosql', desc: 'In-memory data structure store' },
        { id: 'memcached', name: 'Memcached', icon: '🧠', category: 'nosql', desc: 'Distributed memory caching' },
        { id: 'neo4j', name: 'Neo4j', icon: '🕸️', category: 'specialized', desc: 'Graph database platform' },
        { id: 'orientdb', name: 'OrientDB', icon: '🧭', category: 'specialized', desc: 'Multi-model NoSQL' },
        { id: 'arangodb', name: 'ArangoDB', icon: '🥑', category: 'nosql', desc: 'Multi-model graph database' },
        { id: 'timescaledb', name: 'Timescale', icon: '🐯', category: 'specialized', desc: 'Time-series SQL' },
        { id: 'influxdb', name: 'InfluxDB', icon: '📉', category: 'specialized', desc: 'Time-series platform' },
        { id: 'elasticsearch', name: 'Elasticsearch', icon: '🔍', category: 'specialized', desc: 'Search and analytics engine' },
        { id: 'solr', name: 'Solr', icon: '☀️', category: 'specialized', desc: 'Open source search platform' },
        { id: 'opensearch', name: 'OpenSearch', icon: '🔎', category: 'specialized', desc: 'Community-driven search' },
        { id: 'mimer', name: 'Mimer SQL', icon: '🧩', category: 'relational', desc: 'Embedded SQL database' },
        { id: 'cache', name: 'InterSystems Cache', icon: '💾', category: 'relational', desc: 'High-performance object' },
        { id: 'iris', name: 'InterSystems IRIS', icon: '🌷', category: 'relational', desc: 'Data platform' },
        { id: 'yellowbrick', name: 'Yellowbrick', icon: '🧱', category: 'analytical', desc: 'Data warehouse' },
        { id: 'babelfish', name: 'Babelfish', icon: '🐟', category: 'relational', desc: 'PostgreSQL for SQL Server' },
        { id: 'virtuoso', name: 'Virtuoso', icon: '🎻', category: 'relational', desc: 'Universal Server' },
        { id: 'calcite', name: 'Apache Calcite', icon: '💎', category: 'relational', desc: 'Dynamic data management' },
        { id: 'kylin', name: 'Apache Kylin', icon: '🦁', category: 'analytical', desc: 'Distributed Analytics Engine' },
        { id: 'risingwave', name: 'RisingWave', icon: '🌊', category: 'analytical', desc: 'Distributed SQL Streaming' },
        { id: 'denodo', name: 'Denodo', icon: '🧬', category: 'relational', desc: 'Data virtualization' },
        { id: 'dremio', name: 'Dremio', icon: '🦈', category: 'analytical', desc: 'Data lakehouse platform' },
        { id: 'edb', name: 'EDB Postgres', icon: '🐘', category: 'relational', desc: 'Enterprise Postgres' },
        { id: 'h2gis', name: 'H2GIS', icon: '🗺️', category: 'specialized', desc: 'Spatial database' },
        { id: 'cratedb', name: 'CrateDB', icon: '📦', category: 'relational', desc: 'Distributed SQL database' },
        { id: 'oceanbase', name: 'OceanBase', icon: '🌊', category: 'relational', desc: 'Distributed relational' },
        { id: 'heavydb', name: 'HeavyDB', icon: '🏋️', category: 'analytical', desc: 'GPU-accelerated analytics' },
        { id: 'openedge', name: 'OpenEdge', icon: '🔓', category: 'relational', desc: 'Business application platform' },
        { id: 'pervasive', name: 'Pervasive', icon: '🌫️', category: 'relational', desc: 'Embeddable database' },
        { id: 'salesforce', name: 'Salesforce', icon: '☁️', category: 'cloud', desc: 'CRM database' },
        { id: 'sqream', name: 'SQream', icon: '🍦', category: 'analytical', desc: 'GPU-accelerated warehouse' },
        { id: 'fujitsu', name: 'Fujitsu', icon: '🗻', category: 'relational', desc: 'Enterprise Postgres' },
        { id: 'materialize', name: 'Materialize', icon: '⚡', category: 'analytical', desc: 'Streaming database' },
        { id: 'ksqldb', name: 'ksqlDB', icon: '🔄', category: 'specialized', desc: 'Stream processing' },
        { id: 'dameng', name: 'Dameng', icon: '🧱', category: 'relational', desc: 'Database management system' },
        { id: 'altibase', name: 'Altibase', icon: '🚀', category: 'relational', desc: 'Hybrid in-memory database' },
        { id: 'gaussdb', name: 'GaussDB', icon: '🧮', category: 'relational', desc: 'AI-native database' },
        { id: 'cloudberry', name: 'Cloudberry', icon: '🫐', category: 'analytical', desc: 'MPP database' },
        { id: 'gbase', name: 'GBase', icon: '🏛️', category: 'relational', desc: 'Database management system' },
        { id: 'dsql', name: 'Aurora DSQL', icon: '🌌', category: 'cloud', desc: 'Distributed SQL' },
        { id: 'kingbase', name: 'Kingbase', icon: '👑', category: 'relational', desc: 'Database system' },
        { id: 'greengage', name: 'Greengage', icon: '🟢', category: 'relational', desc: 'Database solution' },
        { id: 'databricks', name: 'Databricks', icon: '🧱', category: 'analytical', desc: 'Lakehouse platform' },
        { id: 'ocient', name: 'Ocient', icon: '🌊', category: 'analytical', desc: 'Hyperscale data warehouse' },
        { id: 'prestodb', name: 'PrestoDB', icon: '🐰', category: 'analytical', desc: 'Distributed SQL query' },
        { id: 'starrocks', name: 'StarRocks', icon: '⭐', category: 'analytical', desc: 'MPP database' },
        { id: 'arrow', name: 'Arrow', icon: '🏹', category: 'analytical', desc: 'In-memory analytics' },
        { id: 'ferretdb', name: 'FerretDB', icon: '🦦', category: 'nosql', desc: 'MongoDB compatibility' },
        { id: 'documentdb', name: 'DocumentDB', icon: '📄', category: 'cloud', desc: 'AWS document database' },
        { id: 'keyspaces', name: 'Keyspaces', icon: '🔑', category: 'cloud', desc: 'AWS Cassandra compatible' },
        { id: 'timestream', name: 'Timestream', icon: '⏳', category: 'cloud', desc: 'AWS time series' },
        { id: 'bigtable', name: 'Bigtable', icon: '🧊', category: 'cloud', desc: 'Google NoSQL wide-column' },
        { id: 'neptune', name: 'Neptune', icon: '🔱', category: 'cloud', desc: 'AWS graph database' },
        { id: 'azuresql', name: 'Azure SQL', icon: '🔷', category: 'cloud', desc: 'Managed SQL database' },
        { id: 'singlestore', name: 'SingleStore', icon: '🚀', category: 'cloud', desc: 'Real-time distributed SQL' },
        { id: 'nuodb', name: 'NuoDB', icon: '🐦', category: 'cloud', desc: 'Distributed SQL database' },
        { id: 'netsuite', name: 'NetSuite', icon: '👔', category: 'cloud', desc: 'SuiteAnalytics Connect' },
        { id: 'adw', name: 'Oracle ADW', icon: '🏭', category: 'cloud', desc: 'Autonomous Data Warehouse' },
        { id: 'atp', name: 'Oracle ATP', icon: '⚡', category: 'cloud', desc: 'Autonomous Transaction' },
        { id: 'ajd', name: 'Oracle AJD', icon: '📝', category: 'cloud', desc: 'Autonomous JSON' },
        { id: 'cloudsql', name: 'Cloud SQL', icon: '☁️', category: 'cloud', desc: 'Google managed database' },
        { id: 'alloydb', name: 'AlloyDB', icon: '🛡️', category: 'cloud', desc: 'PG-compatible for AI' },
        { id: 'firestore', name: 'Firestore', icon: '🔥', category: 'cloud', desc: 'Serverless document db' },
        { id: 'databend', name: 'Databend', icon: '🧊', category: 'cloud', desc: 'Cloud data warehouse' },
        { id: 'teiid', name: 'Teiid', icon: '🔗', category: 'cloud', desc: 'Data virtualization' },
        { id: 'sparkhive', name: 'Spark Hive', icon: '🐝', category: 'bigdata', desc: 'Hive on Spark' },
        { id: 'gemfire', name: 'GemFire', icon: '💎', category: 'bigdata', desc: 'In-memory data grid' },
        { id: 'ignite', name: 'Ignite', icon: '🔥', category: 'bigdata', desc: 'In-memory computing' },
        { id: 'cloudera', name: 'Cloudera', icon: '☁️', category: 'bigdata', desc: 'Data platform' },
        { id: 'snappydata', name: 'SnappyData', icon: '🐊', category: 'bigdata', desc: 'Spark + In-memory DB' },
        { id: 'rabbitmq', name: 'RabbitMQ', icon: '🐰', category: 'nosql', desc: 'Message broker' },
        { id: 'minio', name: 'MinIO', icon: '🦅', category: 'nosql', desc: 'Object storage' },
        { id: 'dgraph', name: 'Dgraph', icon: '🕸️', category: 'nosql', desc: 'Distributed graph db' },
        { id: 'machbase', name: 'Machbase', icon: '🚀', category: 'specialized', desc: 'Time series database' },
        { id: 'tdengine', name: 'TDengine', icon: '🚂', category: 'specialized', desc: 'Time series platform' },
        { id: 'timecho', name: 'IoTDB', icon: '⌚', category: 'specialized', desc: 'Time series for IoT' },
        { id: 'dolphindb', name: 'DolphinDB', icon: '🐬', category: 'specialized', desc: 'Time series analytics' },
        { id: 'csv', name: 'CSV', icon: '📄', category: 'embedded', desc: 'Comma-separated values' },
        { id: 'wmi', name: 'WMI', icon: '🪟', category: 'embedded', desc: 'Windows Management' },
        { id: 'dbf', name: 'DBF', icon: '💾', category: 'embedded', desc: 'dBASE database file' },
        { id: 'raima', name: 'Raima', icon: '⚡', category: 'embedded', desc: 'In-memory embedded' },
        { id: 'libsql', name: 'libSQL', icon: '📚', category: 'embedded', desc: 'SQLite fork' },
        { id: 'surrealdb', name: 'SurrealDB', icon: '🚀', category: 'nosql', desc: 'Multi-model cloud db' }
    ];

    const permissionCheck = (type: string) => {
        if (isDatabaseAllowed(type)) {
            provisionDatabase(type);
        } else {
            // Optional: You could show a specialized modal here instead of redirecting
            if (confirm('This database requires a Pro plan. Upgrade now to access 100+ databases?')) {
                router.push('/pricing');
            }
        }
    };

    const filteredDatabases = allDatabases.filter(db => {
        const matchesSearch = db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            db.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || db.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const provisionDatabase = async (type: string) => {
        const controller = new AbortController();
        setAbortController(controller);
        setProvisioning(true);
        setProgress(`Creating ${type} database...`);
        setError('');

        try {
            const user = getCurrentUser();
            if (!user) {
                throw new Error('Not logged in');
            }

            // Call Docker provision API
            const res = await fetch('/api/docker/provision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-email': user.email || '',
                },
                body: JSON.stringify({
                    type,
                    name: `My ${type.charAt(0).toUpperCase() + type.slice(1)} Database`,
                    autoStart: true
                }),
                signal: controller.signal
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 499 || data.error === 'Provisioning cancelled') {
                    return; // Handled by catch
                }
                throw new Error(data.error || 'Failed to create database');
            }

            setProgress('Saving connection...');

            // Save connection instantly (skipTest=true means no connection test needed)
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (user?.email) headers['x-user-email'] = user.email;
            if (user?.organizationId) headers['x-org-id'] = user.organizationId;

            const connRes = await fetch('/api/connections', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: data.database.name,
                    type: data.database.type,
                    host: 'localhost',
                    port: data.database.port,
                    database: data.database.database,
                    username: data.database.username,
                    password: data.database.password,
                    ssl: false,
                    readOnly: false,
                    skipTest: true, // Skip test for auto-provisioned - credentials are trusted
                }),
                signal: controller.signal
            });

            const connData = await connRes.json();

            if (!connRes.ok) {
                throw new Error(connData.error || 'Failed to save connection');
            }

            setProgress('✅ Ready!');

            // Instant redirect
            router.push(`/query?connection=${connData.id}`);

        } catch (err: any) {
            if (err.name === 'AbortError' || err.message === 'Provisioning cancelled') {
                console.log('Provisioning was cancelled');
                setProvisioning(false);
                setProgress('');
                return;
            }
            setError(err.message || 'Failed to create database');
            setProvisioning(false);
        } finally {
            setAbortController(null);
        }
    };

    const handleCancelProvisioning = () => {
        if (abortController) {
            abortController.abort();
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisioning(true);
        setError('');

        try {
            const user = getCurrentUser();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (user?.email) headers['x-user-email'] = user.email;
            if (user?.organizationId) headers['x-org-id'] = user.organizationId;

            const res = await fetch('/api/connections', {
                method: 'POST',
                headers,
                body: JSON.stringify(manualConnection),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create connection');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to create connection');
            setProvisioning(false);
        }
    };

    if (showManualForm) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-8 my-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Connect to External Database</h2>
                            <p className="text-muted-foreground">
                                Enter your database connection details
                            </p>
                        </div>
                        {!provisioning && (
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Connection Name</label>
                            <input
                                type="text"
                                value={manualConnection.name}
                                onChange={(e) => setManualConnection({ ...manualConnection, name: e.target.value })}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                placeholder="My Database"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Database Type</label>
                            <select
                                value={manualConnection.type}
                                onChange={(e) => {
                                    const type = e.target.value;
                                    setManualConnection({ ...manualConnection, type });
                                }}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                            >
                                {VALID_DATABASE_TYPES.map(type => (
                                    <option key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Host</label>
                                <input
                                    type="text"
                                    value={manualConnection.host}
                                    onChange={(e) => setManualConnection({ ...manualConnection, host: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    placeholder="localhost"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Port</label>
                                <input
                                    type="number"
                                    value={manualConnection.port}
                                    onChange={(e) => setManualConnection({ ...manualConnection, port: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Database Name</label>
                            <input
                                type="text"
                                value={manualConnection.database}
                                onChange={(e) => setManualConnection({ ...manualConnection, database: e.target.value })}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                placeholder="demodb"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Username</label>
                                <input
                                    type="text"
                                    value={manualConnection.username}
                                    onChange={(e) => setManualConnection({ ...manualConnection, username: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={manualConnection.password}
                                    onChange={(e) => setManualConnection({ ...manualConnection, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={manualConnection.ssl}
                                    onChange={(e) => setManualConnection({ ...manualConnection, ssl: e.target.checked })}
                                    className="rounded"
                                />
                                Use SSL
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={manualConnection.readOnly}
                                    onChange={(e) => setManualConnection({ ...manualConnection, readOnly: e.target.checked })}
                                    className="rounded"
                                />
                                Read-only mode
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={provisioning}
                                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                {provisioning ? 'Connecting...' : 'Connect'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowManualForm(false)}
                                disabled={provisioning}
                                className="px-4 py-3 border border-border rounded-lg hover:bg-muted transition disabled:opacity-50"
                            >
                                Back
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Create Database</h2>
                        <p className="text-muted-foreground">
                            Select from 100+ database types to provision instantly
                        </p>
                    </div>
                    <button
                        onClick={provisioning ? handleCancelProvisioning : onClose}
                        className={`p-2 rounded-lg transition-colors ${provisioning
                            ? 'text-red-500 hover:bg-red-500/10 hover:text-red-400'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        title={provisioning ? "Cancel provisioning" : "Close"}
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
                        {error}
                    </div>
                )}

                {!provisioning && !isPro && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-border px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-1 rounded-full">
                                <Star className="w-3 h-3" fill="currentColor" />
                            </div>
                            <p className="text-xs font-medium text-purple-300">
                                Free Plan limited to 5 core databases. Upgrade to access 100+ more types!
                            </p>
                        </div>
                        <Link href="/pricing" className="text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 rounded-full hover:opacity-90 transition shadow-lg shadow-purple-500/20">
                            Upgrade Now
                        </Link>
                    </div>
                )}

                {!provisioning && (
                    <div className="px-6 py-4 flex flex-col md:flex-row gap-4 border-b border-border bg-muted/30">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search all databases..."
                                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-muted-foreground">🔍</div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${activeCategory === cat.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted hover:bg-border text-muted-foreground'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {provisioning ? (
                        <div className="text-center py-20">
                            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
                            <p className="text-xl font-medium mb-3">{progress}</p>
                            <p className="text-muted-foreground">
                                Setting up your database instance...
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {filteredDatabases.length > 0 ? (
                                filteredDatabases.map(db => {
                                    const allowed = isDatabaseAllowed(db.id);
                                    return (
                                        <button
                                            key={db.id}
                                            onClick={() => permissionCheck(db.id)}
                                            className={`relative p-3 border-2 border-border rounded-xl transition-all group text-center flex flex-col items-center justify-center overflow-hidden
                                                ${allowed
                                                    ? 'hover:border-primary hover:bg-primary/5 cursor-pointer'
                                                    : 'opacity-60 cursor-not-allowed bg-muted/20'
                                                }`}
                                        >
                                            {!allowed && (
                                                <div className="absolute top-2 right-2 text-muted-foreground/50">
                                                    <Lock className="w-3 h-3" />
                                                </div>
                                            )}

                                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                                {db.icon}
                                            </div>

                                            <h3 className="text-xs font-bold truncate w-full flex items-center justify-center gap-1">
                                                {db.name}
                                            </h3>

                                            <div className={`mt-2 text-[10px] transition font-medium
                                                ${allowed ? 'text-primary opacity-0 group-hover:opacity-100' : 'text-muted-foreground'}`}>
                                                {allowed ? 'Create →' : 'Pro Only'}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-20 text-center text-muted-foreground">
                                    No databases found matching your search.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!provisioning && (
                    <div className="p-6 border-t border-border bg-muted/30">
                        <button
                            onClick={() => setShowManualForm(true)}
                            className="w-full px-4 py-3 border border-border rounded-xl hover:bg-background transition text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <span>🌐</span>
                            Have an existing database? Use External Connection Instead
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

import { NextRequest, NextResponse } from 'next/server';
import { pullAndStartDatabase, checkDockerAvailable } from '@/lib/docker-manager';
import { DatabaseType, VALID_DATABASE_TYPES } from '@/constants/database-types';
import { getCurrentUser } from '@/lib/auth';

// POST /api/docker/provision - Create and start a new Docker database
export async function POST(request: NextRequest) {
    try {
        // Get current user from headers (sent by frontend)
        const userEmail = request.headers.get('x-user-email');
        if (!userEmail) {
            return NextResponse.json({ error: 'User email required' }, { status: 401 });
        }

        // Find user to get organization ID
        const { findUserByEmail } = await import('@/lib/users-store');
        const user = await findUserByEmail(userEmail);
        if (!user || !user.organizationId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { type, name, autoStart } = body;

        // Validate inputs
        if (!type || !name) {
            return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
        }

        if (!VALID_DATABASE_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Invalid database type' }, { status: 400 });
        }

        // ✅ FOR POSTGRESQL: Return Railway deployed database instead of Docker
        if (type === 'postgres') {
            console.log(`[Railway] Using deployed Railway PostgreSQL for "${name}"`);

            const railwayDatabase = {
                id: `railway_postgres_${Date.now()}`,
                type: 'postgres',
                name: name,
                host: 'caboose.proxy.rlwy.net',
                port: 28143,
                username: 'postgres',
                password: 'XkuCSYMEbRpxqNWWpfNLNSqlvAFKtEkO',
                database: 'railway',
                status: 'running',
                isRailway: true
            };

            return NextResponse.json({
                success: true,
                database: {
                    id: railwayDatabase.id,
                    type: railwayDatabase.type,
                    name: railwayDatabase.name,
                    host: railwayDatabase.host,
                    port: railwayDatabase.port,
                    username: railwayDatabase.username,
                    password: railwayDatabase.password,
                    database: railwayDatabase.database,
                    status: railwayDatabase.status,
                    ssl: true, // ✅ Railway requires SSL
                    connectionString: `postgresql://${railwayDatabase.username}:${railwayDatabase.password}@${railwayDatabase.host}:${railwayDatabase.port}/${railwayDatabase.database}?sslmode=require`,
                    message: '✅ Connected to Railway PostgreSQL (Deployed Database)'
                }
            });
        }

        // For other database types, use Docker as before
        // Check Docker is available
        const isDockerAvailable = await checkDockerAvailable();
        if (!isDockerAvailable) {
            return NextResponse.json({
                error: 'Docker is not running. Please start Docker and try again.'
            }, { status: 503 });
        }

        console.log(`[Docker API] Creating ${type} database "${name}" for org ${user.organizationId}`);

        // Create the database (this will pull image, create container, start it)
        const database = await pullAndStartDatabase(
            type,
            name,
            user.organizationId,
            autoStart !== false, // Default to true
            request.signal
        );

        console.log(`[Docker API] Successfully created database: ${database.id}`);

        return NextResponse.json({
            success: true,
            database: {
                id: database.id,
                type: database.type,
                name: database.name,
                port: database.port,
                username: database.username,
                password: database.password,
                database: database.database,
                status: database.status,
                connectionString: getConnectionString(database)
            }
        });

    } catch (error: any) {
        console.error('[Docker API] Failed to provision database:', error);
        return NextResponse.json({
            error: error.message || 'Failed to provision database'
        }, { status: 500 });
    }
}

// Helper to generate connection strings
function getConnectionString(db: any): string {
    const { type, username, password, port, database } = db;
    // In Docker, 'localhost' refers to the container itself. 
    // We need to connect to the host machine where the database containers are mapped.
    const host = process.env.DB_CONNECTION_HOST || 'localhost';

    switch (type) {
        case 'postgres':
        case 'timescaledb':
        case 'edb':
        case 'cloudberry':
        case 'greengage':
        case 'kingbase':
        case 'gaussdb':
        case 'yellowbrick':
        case 'yugabyte':
        case 'cockroachdb':
        case 'greenplum':
        case 'materialize':
            return `postgresql://${username}:${password}@${host}:${port}/${database}`;

        case 'mysql':
        case 'mariadb':
        case 'tidb':
        case 'singlestore':
        case 'gbase':
        case 'oceanbase':
            return `mysql://${username}:${password}@${host}:${port}/${database}`;

        case 'mongodb':
        case 'documentdb':
        case 'ferretdb':
            return `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;

        case 'redis':
            return `redis://default:${password}@${host}:${port}`;

        case 'mssql':
        case 'azuresql':
        case 'babelfish':
            return `mssql://sa:${password}@${host}:${port}`;

        case 'oracle':
        case 'adw':
        case 'atp':
        case 'ajd':
            return `oracle://${username}:${password}@${host}:${port}/XEPDB1`;

        case 'db2':
        case 'netezza':
            return `db2://${username}:${password}@${host}:${port}/${database}`;

        case 'cassandra':
        case 'scylladb':
        case 'keyspaces':
            return `cassandra://${host}:${port}`;

        case 'elasticsearch':
        case 'opensearch':
        case 'opensearchdistro':
        case 'solr':
            return `http://${username}:${password}@${host}:${port}`;

        case 'influxdb':
        case 'machbase':
        case 'tdengine':
            return `http://${username}:${password}@${host}:${port}`;

        case 'neo4j':
            return `neo4j://${username}:${password}@${host}:${port}`;

        case 'clickhouse':
        case 'starrocks':
        case 'duckdb':
        case 'trino':
        case 'prestodb':
        case 'monetdb':
        case 'cratedb':
        case 'heavydb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'sqlite':
        case 'h2':
        case 'derby':
        case 'hsqldb':
        case 'libsql':
        case 'firebird':
        case 'cubrid':
            return `jdbc:${type}:@${host}:${port}/${database}`;

        case 'couchbase':
        case 'couchdb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'orientdb':
            return `remote:${host}:${port}/${database}`;

        case 'rabbitmq':
            return `amqp://${username}:${password}@${host}:${port}`;

        case 'minio':
            return `http://${username}:${password}@${host}:${port}`;

        case 'surrealdb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'snowflake':
        case 'bigquery':
            return `https://${username}:${password}@${host}:${port}/${database}`;

        case 'dynamodb':
            return `http://${host}:${port}`;

        default:
            return `${type}://${username}:${password}@${host}:${port}/${database}`;
    }
}

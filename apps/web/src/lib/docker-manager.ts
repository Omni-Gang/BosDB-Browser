import Docker from 'dockerode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getOrgDataDir } from './organization';
import { DatabaseType, VALID_DATABASE_TYPES } from '@/constants/database-types';

const docker = new Docker();

// DatabaseType and VALID_DATABASE_TYPES are imported from '@/constants/database-types'
// No longer re-exporting them here to prevent accidental client-side inclusion of this file.

export interface DockerDatabase {
    id: string;                    // Unique ID
    type: DatabaseType;
    name: string;                  // User-friendly name
    organizationId: string;        // Multi-tenant isolation
    containerId?: string;          // Docker container ID
    containerName: string;         // Docker container name
    port: number;                  // Exposed port
    username: string;              // Auto-generated
    password: string;              // Auto-generated
    database: string;              // Database name
    status: 'provisioning' | 'running' | 'stopped' | 'error';
    autoStart: boolean;            // Auto-start on BosDB startup
    createdAt: string;
    updatedAt: string;
}

// Database image configurations
const DB_IMAGES: Record<DatabaseType, { image: string; defaultPort: number }> = {
    // Relational
    postgres: { image: 'postgres:16-alpine', defaultPort: 5432 },
    mysql: { image: 'mysql:8-debian', defaultPort: 3306 },
    mariadb: { image: 'mariadb:11', defaultPort: 3306 },
    mssql: { image: 'mcr.microsoft.com/mssql/server:2022-latest', defaultPort: 1433 },
    oracle: { image: 'gvenzl/oracle-xe:21-slim', defaultPort: 1521 },
    db2: { image: 'ibmcom/db2:latest', defaultPort: 50000 },
    maxdb: { image: 'maxshahrokni/maxdb:latest', defaultPort: 7200 }, // Use community image
    informix: { image: 'ibmcom/informix-developer-database:latest', defaultPort: 9088 },
    sybase: { image: 'datagrip/sybase:latest', defaultPort: 5000 },
    mimer: { image: 'mimer/mimer-sql:latest', defaultPort: 1360 },
    cache: { image: 'intersystems/cache:latest', defaultPort: 1972 },
    iris: { image: 'intersystems/iris:latest', defaultPort: 1972 },
    firebird: { image: 'jacobalberty/firebird:latest', defaultPort: 3050 },
    ingres: { image: 'ingres:latest', defaultPort: 21064 },
    yellowbrick: { image: 'yellowbrick/database:latest', defaultPort: 5432 },
    babelfish: { image: 'babelfish/babelfish:latest', defaultPort: 1433 },
    yugabyte: { image: 'yugabytedb/yugabyte:latest', defaultPort: 5433 },
    virtuoso: { image: 'tenforce/virtuoso:latest', defaultPort: 1111 },
    cubrid: { image: 'cubrid/cubrid:latest', defaultPort: 33000 },
    duckdb: { image: 'duckdb/duckdb:latest', defaultPort: 0 }, // Embedded
    calcite: { image: 'apache/calcite:latest', defaultPort: 8765 },
    kylin: { image: 'apache/kylin:latest', defaultPort: 7070 },
    risingwave: { image: 'risingwavelabs/risingwave:latest', defaultPort: 4566 },
    denodo: { image: 'denodo/vdp:latest', defaultPort: 9999 },
    dremio: { image: 'dremio/dremio-oss:latest', defaultPort: 9047 },
    edb: { image: 'edb/edb-postgres-advanced:latest', defaultPort: 5432 },
    spanner: { image: 'gcr.io/cloud-spanner-emulator/emulator:latest', defaultPort: 9010 },
    h2gis: { image: 'h2gis/h2gis:latest', defaultPort: 9092 },
    hsqldb: { image: 'blacktop/hsqldb:latest', defaultPort: 9001 },
    trino: { image: 'trinodb/trino:latest', defaultPort: 8080 },
    cratedb: { image: 'crate:latest', defaultPort: 4200 },
    monetdb: { image: 'monetdb/monetdb:latest', defaultPort: 50000 },
    oceanbase: { image: 'oceanbase/oceanbase-ce:latest', defaultPort: 2881 },
    heavydb: { image: 'heavyai/heavydb-cpu:latest', defaultPort: 6274 },
    openedge: { image: 'progress/openedge:latest', defaultPort: 20931 },
    pervasive: { image: 'pervasive/psql:latest', defaultPort: 1583 },
    salesforce: { image: 'salesforce/force:latest', defaultPort: 443 },
    sqream: { image: 'sqream/sqream:latest', defaultPort: 5000 },
    fujitsu: { image: 'fujitsu/postgres:latest', defaultPort: 5432 },
    materialize: { image: 'materialize/materialized:latest', defaultPort: 6875 },
    tidb: { image: 'pingcap/tidb:latest', defaultPort: 4000 },
    ksqldb: { image: 'confluentinc/cp-ksqldb-server:latest', defaultPort: 8088 },
    dameng: { image: 'dameng/dm8:latest', defaultPort: 5236 },
    altibase: { image: 'altibase/altibase:latest', defaultPort: 20300 },
    gaussdb: { image: 'gaussdb/gaussdb:latest', defaultPort: 5432 },
    cloudberry: { image: 'cloudberry/database:latest', defaultPort: 5432 },
    gbase: { image: 'gbase/gbase:latest', defaultPort: 5258 },
    dsql: { image: 'amazon/aurora-dsql:latest', defaultPort: 5432 },
    kingbase: { image: 'kingbase/kingbase:latest', defaultPort: 54321 },
    greengage: { image: 'greengage/database:latest', defaultPort: 5432 },

    // Analytical
    greenplum: { image: 'greenplum/db:latest', defaultPort: 5432 },
    exasol: { image: 'exasol/docker-db:latest', defaultPort: 8563 },
    vertica: { image: 'vertica/vertica-ce:latest', defaultPort: 5433 },
    teradata: { image: 'teradata/database:latest', defaultPort: 1025 },
    hana: { image: 'scnho/hana:latest', defaultPort: 39015 }, // Use community image
    netezza: { image: 'ibmcom/netezza:latest', defaultPort: 5480 },
    databricks: { image: 'databricks/runtime:latest', defaultPort: 10000 },
    ocient: { image: 'ocient/database:latest', defaultPort: 4040 },
    prestodb: { image: 'prestodb/presto:latest', defaultPort: 8080 },
    clickhouse: { image: 'clickhouse/clickhouse-server:latest', defaultPort: 8123 },
    starrocks: { image: 'starrocks/all-in-one:latest', defaultPort: 9030 },
    arrow: { image: 'apache/arrow:latest', defaultPort: 8081 },

    // NoSQL
    mongodb: { image: 'mongo:7', defaultPort: 27017 },
    couchbase: { image: 'couchbase/server:latest', defaultPort: 8091 },
    couchdb: { image: 'couchdb:3', defaultPort: 5984 },
    ferretdb: { image: 'ferretdb/ferretdb:latest', defaultPort: 27017 },
    cosmosdb: { image: 'mcr.microsoft.com/cosmosdb/linux/azure-cosmos-db-emulator:latest', defaultPort: 8081 },

    // Cloud/Managed
    athena: { image: 'localstack/localstack:latest', defaultPort: 4566 },
    redshift: { image: 'localstack/localstack:latest', defaultPort: 4566 },
    dynamodb: { image: 'amazon/dynamodb-local:latest', defaultPort: 8000 },
    aurora: { image: 'amazon/aurora-emulator:latest', defaultPort: 5432 },
    documentdb: { image: 'amazon/documentdb-emulator:latest', defaultPort: 27017 },
    keyspaces: { image: 'amazon/keyspaces-emulator:latest', defaultPort: 9142 },
    timestream: { image: 'localstack/localstack:latest', defaultPort: 4566 },
    bigtable: { image: 'google/cloud-sdk:latest', defaultPort: 8086 },
    bigquery: { image: 'google/cloud-sdk:latest', defaultPort: 8050 },
    neptune: { image: 'amazon/neptune-emulator:latest', defaultPort: 8182 },
    azuresql: { image: 'mcr.microsoft.com/azure-sql-edge:latest', defaultPort: 1433 },
    snowflake: { image: 'snowflake/emulator:latest', defaultPort: 8080 },
    singlestore: { image: 'singlestore/cluster-in-a-box:latest', defaultPort: 3306 },
    nuodb: { image: 'nuodb/nuodb:latest', defaultPort: 48004 },
    netsuite: { image: 'netsuite/emulator:latest', defaultPort: 1708 },
    adw: { image: 'oracle/adw-emulator:latest', defaultPort: 1521 },
    atp: { image: 'oracle/atp-emulator:latest', defaultPort: 1521 },
    ajd: { image: 'oracle/ajd-emulator:latest', defaultPort: 1521 },
    cloudsql: { image: 'google/cloud-sdk:latest', defaultPort: 5432 },
    alloydb: { image: 'google/alloydb-auth-proxy:latest', defaultPort: 5432 },
    firestore: { image: 'google/cloud-sdk:latest', defaultPort: 8080 },
    databend: { image: 'datafuselabs/databend:latest', defaultPort: 8000 },
    teiid: { image: 'teiid/teiid:latest', defaultPort: 31000 },

    // Big Data
    hive: { image: 'apache/hive:latest', defaultPort: 10000 },
    sparkhive: { image: 'apache/spark:latest', defaultPort: 10001 },
    drill: { image: 'apache/drill:latest', defaultPort: 8047 },
    phoenix: { image: 'apache/phoenix:latest', defaultPort: 8765 },
    impala: { image: 'apache/impala:latest', defaultPort: 21050 },
    gemfire: { image: 'apache/geode:latest', defaultPort: 10334 },
    ignite: { image: 'apache/ignite:latest', defaultPort: 10800 },
    kyuubi: { image: 'apache/kyuubi:latest', defaultPort: 10009 },
    cloudera: { image: 'cloudera/quickstart:latest', defaultPort: 80 },
    cockroachdb: { image: 'cockroachdb/cockroach:latest', defaultPort: 26257 },
    snappydata: { image: 'snappydatainc/snappydata:latest', defaultPort: 1527 },
    scylladb: { image: 'scylladb/scylla:latest', defaultPort: 9042 },

    // Key-Value / Columnar
    cassandra: { image: 'cassandra:5', defaultPort: 9042 },
    redis: { image: 'redis:7-alpine', defaultPort: 6379 },
    memcached: { image: 'memcached:1.6-alpine', defaultPort: 11211 },
    rabbitmq: { image: 'rabbitmq:3.12-management-alpine', defaultPort: 5672 },
    minio: { image: 'minio/minio:latest', defaultPort: 9000 },
    dgraph: { image: 'dgraph/standalone:latest', defaultPort: 8080 },

    // Time Series
    timescaledb: { image: 'timescale/timescaledb:latest-pg16', defaultPort: 5432 },
    influxdb: { image: 'influxdb:2.7-alpine', defaultPort: 8086 },
    machbase: { image: 'machbase/machbase:latest', defaultPort: 5656 },
    tdengine: { image: 'tdengine/tdengine:latest', defaultPort: 6030 },
    timecho: { image: 'timecho/iotdb:latest', defaultPort: 6667 },
    dolphindb: { image: 'dolphindb/dolphindb:latest', defaultPort: 8848 },

    // Graph
    neo4j: { image: 'neo4j:5-community', defaultPort: 7687 },
    orientdb: { image: 'orientdb:latest', defaultPort: 2424 },

    // Search
    elasticsearch: { image: 'elasticsearch:8.11.0', defaultPort: 9200 },
    solr: { image: 'solr:latest', defaultPort: 8983 },
    opensearch: { image: 'opensearchproject/opensearch:latest', defaultPort: 9200 },
    opensearchdistro: { image: 'amazon/opendistro-for-elasticsearch:latest', defaultPort: 9200 },

    // Embedded / File
    sqlite: { image: 'nouchka/sqlite3:latest', defaultPort: 9999 },
    h2: { image: 'oscarfonts/h2:latest', defaultPort: 9092 },
    derby: { image: 'azarezis/derby:latest', defaultPort: 1527 },
    access: { image: 'access/emulator:latest', defaultPort: 0 },
    csv: { image: 'csv/emulator:latest', defaultPort: 0 },
    wmi: { image: 'wmi/emulator:latest', defaultPort: 0 },
    dbf: { image: 'dbf/emulator:latest', defaultPort: 0 },
    raima: { image: 'raima/database:latest', defaultPort: 0 },
    libsql: { image: 'libsql/sqld:latest', defaultPort: 8080 },
    surrealdb: { image: 'surrealdb/surrealdb:latest', defaultPort: 8000 }
};

/**
 * Get Docker containers file path for organization
 */
function getContainersFilePath(orgId: string): string {
    const orgDir = getOrgDataDir(orgId);
    const dockerDir = path.join(orgDir, 'docker');
    if (!fs.existsSync(dockerDir)) {
        fs.mkdirSync(dockerDir, { recursive: true });
    }
    return path.join(dockerDir, 'containers.json');
}

/**
 * Load Docker databases for an organization
 */
export function loadDockerDatabases(orgId: string): DockerDatabase[] {
    try {
        const filePath = getContainersFilePath(orgId);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`[Docker] Failed to load databases for org ${orgId}:`, error);
    }
    return [];
}

/**
 * Save Docker databases for an organization
 */
function saveDockerDatabases(orgId: string, databases: DockerDatabase[]) {
    try {
        const filePath = getContainersFilePath(orgId);
        fs.writeFileSync(filePath, JSON.stringify(databases, null, 2));
    } catch (error) {
        console.error(`[Docker] Failed to save databases for org ${orgId}:`, error);
    }
}

/**
 * Generate secure random password
 */
function generatePassword(length: number = 16): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Generate secure random username
 */
function generateUsername(prefix: string = 'user'): string {
    return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
    const net = await import('net');
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
            resolve(false);
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '0.0.0.0');
    });
}

/**
 * Check if Docker is running
 */
export async function checkDockerAvailable(): Promise<boolean> {
    try {
        await docker.ping();
        return true;
    } catch (error) {
        console.error('[Docker] Docker is not running or not accessible:', error);
        return false;
    }
}

/**
 * Find available port starting from defaultPort
 */
async function findAvailablePort(orgId: string, defaultPort: number): Promise<number> {
    const existing = loadDockerDatabases(orgId);
    const usedPorts = existing.map(db => db.port);

    let port = defaultPort;
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
        if (!usedPorts.includes(port)) {
            const available = await isPortAvailable(port);
            if (available) {
                console.log(`[Docker] Found available port: ${port}`);
                return port;
            }
        }
        port++;
        attempts++;
    }

    throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

/**
 * Pull Docker image if not exists
 */
async function pull(imageName: string, onProgress?: (message: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) return reject(err);

            if (onProgress) onProgress(`Pulling ${imageName}...`);

            docker.modem.followProgress(stream, (err: Error | null, _result: any[]) => {
                if (err) return reject(err);
                if (onProgress) onProgress(`Image ${imageName} pulled successfully`);
                resolve();
            }, (event: any) => {
                if (onProgress && event.status) {
                    onProgress(`${event.status}${event.progress || ''}`);
                }
            });
        });
    });
}

/**
 * Create and start a Docker database container
 */
export async function pullAndStartDatabase(
    type: DatabaseType,
    name: string,
    orgId: string,
    autoStart: boolean = true,
    onProgress?: (message: string) => void
): Promise<DockerDatabase> {
    // Check Docker availability
    const isAvailable = await checkDockerAvailable();
    if (!isAvailable) {
        throw new Error('Docker is not running. Please start Docker and try again.');
    }

    const config = DB_IMAGES[type];
    const port = await findAvailablePort(orgId, config.defaultPort);
    const username = generateUsername('bosdb');
    const password = generatePassword(20);
    const database = 'bosdb';
    const containerName = `bosdb-${orgId}-${type}-${Date.now()}`;

    // Create database record
    const dbRecord: DockerDatabase = {
        id: crypto.randomUUID(),
        type,
        name,
        organizationId: orgId,
        containerName,
        port,
        username,
        password,
        database,
        status: 'provisioning',
        autoStart,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Pull image
        onProgress?.(`Pulling ${config.image}...`);
        await pullImage(config.image, onProgress);

        // Create container with appropriate environment
        const env = getEnvironmentVars(type, username, password, database);

        onProgress?.(`Creating container ${containerName}...`);
        const container = await docker.createContainer({
            Image: config.image,
            name: containerName,
            Env: env,
            ExposedPorts: {
                [`${config.defaultPort}/tcp`]: {}
            },
            HostConfig: {
                PortBindings: {
                    [`${config.defaultPort}/tcp`]: [{ HostPort: port.toString() }]
                },
                AutoRemove: false
            }
        });

        dbRecord.containerId = container.id;

        // Start container
        onProgress?.(`Starting container...`);
        await container.start();

        // Wait for container to be healthy
        onProgress?.(`Waiting for database to be ready...`);
        await waitForContainer(container, 30000); // 30 second timeout

        dbRecord.status = 'running';
        dbRecord.updatedAt = new Date().toISOString();

        // Save to database list
        const databases = loadDockerDatabases(orgId);
        databases.push(dbRecord);
        saveDockerDatabases(orgId, databases);

        onProgress?.(`✅ Database ${name} is ready!`);
        console.log(`[Docker] Created ${type} database for org ${orgId}: ${containerName}`);

        return dbRecord;
    } catch (error) {
        dbRecord.status = 'error';
        console.error('[Docker] Failed to create database:', error);
        throw error;
    }
}

/**
 * Get environment variables for database type
 */
function getEnvironmentVars(type: DatabaseType, username: string, password: string, database: string): string[] {
    switch (type) {
        case 'postgres':
        case 'timescaledb':
        case 'edb':
        case 'cloudberry':
        case 'greengage':
        case 'kingbase':
        case 'gaussdb':
        case 'yellowbrick':
            return [
                `POSTGRES_USER=${username}`,
                `POSTGRES_PASSWORD=${password}`,
                `POSTGRES_DB=${database}`
            ];
        case 'mysql':
        case 'mariadb':
        case 'tidb':
        case 'singlestore':
        case 'gbase':
            return [
                `${type === 'mariadb' ? 'MARIADB' : 'MYSQL'}_ROOT_PASSWORD=${password}`,
                `${type === 'mariadb' ? 'MARIADB' : 'MYSQL'}_DATABASE=${database}`,
                `${type === 'mariadb' ? 'MARIADB' : 'MYSQL'}_USER=${username}`,
                `${type === 'mariadb' ? 'MARIADB' : 'MYSQL'}_PASSWORD=${password}`
            ];
        case 'mongodb':
        case 'documentdb':
            return [
                `MONGO_INITDB_ROOT_USERNAME=${username}`,
                `MONGO_INITDB_ROOT_PASSWORD=${password}`,
                `MONGO_INITDB_DATABASE=${database}`
            ];
        case 'redis':
            return [
                `REDIS_PASSWORD=${password}`
            ];
        case 'mssql':
        case 'azuresql':
        case 'babelfish':
            return [
                `ACCEPT_EULA=Y`,
                `MSSQL_SA_PASSWORD=${password}`,
                `MSSQL_PID=Developer`
            ];
        case 'oracle':
        case 'adw':
        case 'atp':
        case 'ajd':
            return [
                `ORACLE_PASSWORD=${password}`,
                `APP_USER=${username}`,
                `APP_USER_PASSWORD=${password}`
            ];
        case 'db2':
        case 'netezza':
            return [
                `DB2INST1_PASSWORD=${password}`,
                `LICENSE=accept`
            ];
        case 'maxdb':
            return [
                `MAXDB_PASSWORD=${password}`
            ];
        case 'informix':
            return [
                `ISC_USER=${username}`,
                `ISC_PASSWORD=${password}`
            ];
        case 'sybase':
            return [
                `SYBASE_ROOT_PASSWORD=${password}`
            ];
        case 'influxdb':
            return [
                `DOCKER_INFLUXDB_INIT_MODE=setup`,
                `DOCKER_INFLUXDB_INIT_USERNAME=${username}`,
                `DOCKER_INFLUXDB_INIT_PASSWORD=${password}`,
                `DOCKER_INFLUXDB_INIT_ORG=bosdb`,
                `DOCKER_INFLUXDB_INIT_BUCKET=${database}`
            ];
        case 'neo4j':
            return [
                `NEO4J_AUTH=${username}/${password}`
            ];
        case 'clickhouse':
            return [
                `CLICKHOUSE_USER=${username}`,
                `CLICKHOUSE_PASSWORD=${password}`,
                `CLICKHOUSE_DB=${database}`
            ];
        case 'rabbitmq':
            return [
                `RABBITMQ_DEFAULT_USER=${username}`,
                `RABBITMQ_DEFAULT_PASS=${password}`
            ];
        case 'minio':
            return [
                `MINIO_ROOT_USER=${username}`,
                `MINIO_ROOT_PASSWORD=${password}`
            ];
        case 'surrealdb':
            return [
                `SURREAL_USER=${username}`,
                `SURREAL_PASS=${password}`
            ];
        case 'cockroachdb':
            return [
                `COCKROACH_USER=${username}`,
                `COCKROACH_PASSWORD=${password}`
            ];
        case 'scylladb':
        case 'cassandra':
        case 'keyspaces':
            return [
                `CASSANDRA_CLUSTER_NAME=BosDB_Cluster`,
                `CASSANDRA_DC=dc1`
            ];
        case 'elasticsearch':
        case 'opensearch':
        case 'opensearchdistro':
            return [
                `discovery.type=single-node`,
                `ELASTIC_PASSWORD=${password}`,
                `xpack.security.enabled=false`
            ];
        case 'couchdb':
            return [
                `COUCHDB_USER=${username}`,
                `COUCHDB_PASSWORD=${password}`
            ];
        case 'dynamodb':
            return []; // Local DynamoDB doesn't need auth env vars by default
        case 'snowflake':
        case 'bigquery':
        case 'athena':
        case 'redshift':
        case 'spanner':
            return [
                `EMULATOR_MODE=true`
            ];
        default:
            return [];
    }
}

/**
 * Pull Docker image
 */
async function pullImage(imageName: string, onProgress?: (message: string) => void): Promise<void> {
    // Check if image exists
    const images = await docker.listImages({ filters: { reference: [imageName] } });
    if (images.length > 0) {
        onProgress?.(`Image ${imageName} already exists`);
        return;
    }

    // Pull image
    await pullDockerImage(imageName, onProgress);
}

/**
 * Wait for container to be ready
 */
async function waitForContainer(container: Docker.Container, timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const info = await container.inspect();
        if (info.State.Running) {
            // Get container name to detect MongoDB
            const containerName = info.Name || '';
            const isMongoDB = containerName.includes('mongodb');

            // Most databases need about 1.5s to be ready for connections. MongoDB needs more.
            const waitTime = isMongoDB ? 5000 : 1500;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Container failed to start within timeout');
}

/**
 * Stop a Docker database
 */
export async function stopDatabase(id: string, orgId: string): Promise<void> {
    const databases = loadDockerDatabases(orgId);
    const db = databases.find(d => d.id === id);

    if (!db || !db.containerId) {
        throw new Error('Database not found');
    }

    const container = docker.getContainer(db.containerId);
    await container.stop();

    db.status = 'stopped';
    db.updatedAt = new Date().toISOString();
    saveDockerDatabases(orgId, databases);

    console.log(`[Docker] Stopped database ${db.name} for org ${orgId}`);
}

/**
 * Start a Docker database
 */
export async function startDatabase(id: string, orgId: string): Promise<void> {
    const databases = loadDockerDatabases(orgId);
    const db = databases.find(d => d.id === id);

    if (!db || !db.containerId) {
        throw new Error('Database not found');
    }

    const container = docker.getContainer(db.containerId);
    await container.start();

    db.status = 'running';
    db.updatedAt = new Date().toISOString();
    saveDockerDatabases(orgId, databases);

    console.log(`[Docker] Started database ${db.name} for org ${orgId}`);
}

/**
 * Remove a Docker database (container and data)
 */
export async function removeDatabase(id: string, orgId: string): Promise<void> {
    const databases = loadDockerDatabases(orgId);
    const db = databases.find(d => d.id === id);

    if (!db || !db.containerId) {
        throw new Error('Database not found');
    }

    const container = docker.getContainer(db.containerId);

    // Stop if running
    try {
        await container.stop();
    } catch (error) {
        // Already stopped
    }

    // Remove container
    await container.remove({ v: true }); // Remove volumes too

    // Remove from database list
    const updated = databases.filter(d => d.id !== id);
    saveDockerDatabases(orgId, updated);

    console.log(`[Docker] Removed database ${db.name} for org ${orgId}`);
}

/**
 * Get container logs
 */
export async function getContainerLogs(id: string, orgId: string, tail: number = 100): Promise<string> {
    const databases = loadDockerDatabases(orgId);
    const db = databases.find(d => d.id === id);

    if (!db || !db.containerId) {
        throw new Error('Database not found');
    }

    const container = docker.getContainer(db.containerId);
    const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail
    });

    return logs.toString();
}

/**
 * Update container status
 */
export async function updateContainerStatus(id: string, orgId: string): Promise<void> {
    const databases = loadDockerDatabases(orgId);
    const db = databases.find(d => d.id === id);

    if (!db || !db.containerId) {
        return;
    }

    try {
        const container = docker.getContainer(db.containerId);
        const info = await container.inspect();

        db.status = info.State.Running ? 'running' : 'stopped';
        db.updatedAt = new Date().toISOString();
        saveDockerDatabases(orgId, databases);
    } catch (error) {
        db.status = 'error';
        saveDockerDatabases(orgId, databases);
    }
}

// Helper function that was referenced but not defined
async function pullDockerImage(imageName: string, onProgress?: (message: string) => void): Promise<void> {
    return pull(imageName, onProgress);
}

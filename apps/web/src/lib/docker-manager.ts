import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseType } from '@/constants/database-types';

const docker = new Docker();

// Storage path for database configurations
const STORAGE_DIR = path.join(process.cwd(), 'data', 'docker-databases');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface DockerDatabase {
    id: string;
    type: DatabaseType;
    name: string;
    port: number;
    username: string;
    password: string;
    database: string;
    status: 'running' | 'stopped' | 'error';
    autoStart: boolean;
    createdAt: string;
    lastUsedAt?: string; // Track last activity for auto-sleep
    organizationId: string;
    containerId?: string;
}

// Port ranges for different database types
const PORT_RANGES: Record<string, number> = {
    postgres: 5432,
    mysql: 3306,
    mariadb: 3306,
    mongodb: 27017,
    redis: 6379,
    mssql: 1433,
    oracle: 1521,
    cassandra: 9042,
    neo4j: 7687,
    elasticsearch: 9200,
    clickhouse: 8123,
    influxdb: 8086,
    firebird: 3050,
    cubrid: 33000,
    couchbase: 8091,
    orientdb: 2424,
    rabbitmq: 5672,
    minio: 9000
};

// Default docker images for database types
const DOCKER_IMAGES: Record<string, string> = {
    postgres: 'postgres:16-alpine',
    mysql: 'mysql:8.0',
    mariadb: 'mariadb:11',
    mongodb: 'mongo:7',
    redis: 'redis:7-alpine',
    mssql: 'mcr.microsoft.com/mssql/server:2022-latest',
    cassandra: 'cassandra:5',
    neo4j: 'neo4j:5',
    elasticsearch: 'elasticsearch:8.11.0',
    opensearch: 'opensearchproject/opensearch:2.11.0',
    clickhouse: 'clickhouse/clickhouse-server:latest',
    influxdb: 'influxdb:2.7-alpine',
    timescaledb: 'timescale/timescaledb:latest-pg16',
    cockroachdb: 'cockroachdb/cockroach:latest',
    yugabyte: 'yugabytedb/yugabyte:latest',
    tidb: 'pingcap/tidb:latest',
    scylladb: 'scylladb/scylla:latest',
    ferretdb: 'ghcr.io/ferretdb/ferretdb:latest',
    couchdb: 'couchdb:3',
    solr: 'solr:9',
    memcached: 'memcached:1.6-alpine',
    rabbitmq: 'rabbitmq:3-management-alpine',
    minio: 'minio/minio:latest',
    surrealdb: 'surrealdb/surrealdb:latest',
    oracle: 'gvenzl/oracle-free:latest',
    firebird: 'jacobalberty/firebird:latest',
    cubrid: 'cubrid/cubrid:latest',
    h2: 'oscarfonts/h2:latest',
    couchbase: 'couchbase:latest',
    orientdb: 'orientdb:3.2',
    prometheus: 'prom/prometheus:latest'
};

/**
 * Check if Docker is available and running
 */
export async function checkDockerAvailable(): Promise<boolean> {
    try {
        await docker.ping();
        return true;
    } catch (error) {
        console.error('[Docker] Docker is not available:', error);
        return false;
    }
}

/**
 * Find an available port starting from the default port
 */
async function findAvailablePort(startPort: number): Promise<number> {
    const usedPorts = await getUsedPorts();
    let port = startPort;
    while (usedPorts.has(port)) {
        port++;
    }
    return port;
}

/**
 * Get all currently used ports
 */
async function getUsedPorts(): Promise<Set<number>> {
    const databases = getAllDockerDatabases();
    return new Set(databases.map(db => db.port));
}

/**
 * Get storage file path for organization
 */
function getStorageFilePath(organizationId: string): string {
    return path.join(STORAGE_DIR, `${organizationId}.json`);
}

/**
 * Load databases for a specific organization
 */
export function loadDockerDatabases(organizationId: string): DockerDatabase[] {
    const filePath = getStorageFilePath(organizationId);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[Docker] Failed to load databases for org ${organizationId}:`, error);
        return [];
    }
}

/**
 * Get all databases across all organizations
 */
function getAllDockerDatabases(): DockerDatabase[] {
    const databases: DockerDatabase[] = [];
    if (!fs.existsSync(STORAGE_DIR)) {
        return databases;
    }
    const files = fs.readdirSync(STORAGE_DIR);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const data = fs.readFileSync(path.join(STORAGE_DIR, file), 'utf-8');
                const orgDatabases = JSON.parse(data);
                databases.push(...orgDatabases);
            } catch (error) {
                console.error(`[Docker] Failed to load ${file}:`, error);
            }
        }
    }
    return databases;
}

/**
 * Save databases for a specific organization
 */
function saveDockerDatabases(organizationId: string, databases: DockerDatabase[]): void {
    const filePath = getStorageFilePath(organizationId);
    fs.writeFileSync(filePath, JSON.stringify(databases, null, 2));
}

/**
 * Generate database credentials
 */
function generateCredentials(type: DatabaseType, name: string) {
    const username = type === 'postgres' || type === 'timescaledb' ? 'postgres' :
        type === 'mysql' || type === 'mariadb' ? 'root' :
            type === 'mongodb' ? 'admin' :
                type === 'mssql' ? 'sa' :
                    'admin';

    const password = `${name}_${Math.random().toString(36).substring(2, 10)}`;
    const database = type === 'mongodb' ? 'admin' : name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    return { username, password, database };
}

/**
 * Get environment variables for database container
 */
function getEnvironmentVariables(type: DatabaseType, credentials: any): string[] {
    const { username, password, database } = credentials;

    switch (type) {
        case 'postgres':
        case 'timescaledb':
            return [
                `POSTGRES_USER=${username}`,
                `POSTGRES_PASSWORD=${password}`,
                `POSTGRES_DB=${database}`,
            ];
        case 'mysql':
        case 'mariadb':
            return [
                `MYSQL_ROOT_PASSWORD=${password}`,
                `MYSQL_DATABASE=${database}`,
            ];
        case 'mongodb':
            return [
                `MONGO_INITDB_ROOT_USERNAME=${username}`,
                `MONGO_INITDB_ROOT_PASSWORD=${password}`,
            ];
        case 'redis':
            return [`REDIS_PASSWORD=${password}`];
        case 'mssql':
            return [
                'ACCEPT_EULA=Y',
                `MSSQL_SA_PASSWORD=${password}`,
            ];
        case 'neo4j':
            return [
                `NEO4J_AUTH=${username}/${password}`,
            ];
        case 'elasticsearch':
            return [
                'discovery.type=single-node',
                `ELASTIC_PASSWORD=${password}`,
                'xpack.security.enabled=false',
            ];
        case 'opensearch':
            return [
                'discovery.type=single-node',
                `OPENSEARCH_INITIAL_ADMIN_PASSWORD=${password}`,
                'plugins.security.disabled=true',
            ];
        case 'influxdb':
            return [
                `DOCKER_INFLUXDB_INIT_USERNAME=${username}`,
                `DOCKER_INFLUXDB_INIT_PASSWORD=${password}`,
                `DOCKER_INFLUXDB_INIT_ORG=bosdb`,
                `DOCKER_INFLUXDB_INIT_BUCKET=${database}`,
                'DOCKER_INFLUXDB_INIT_MODE=setup',
            ];
        case 'rabbitmq':
            return [
                `RABBITMQ_DEFAULT_USER=${username}`,
                `RABBITMQ_DEFAULT_PASS=${password}`,
            ];
        case 'minio':
            return [
                `MINIO_ROOT_USER=${username}`,
                `MINIO_ROOT_PASSWORD=${password}`,
            ];
        case 'oracle':
            return [
                `ORACLE_PASSWORD=${password}`,
                `ORACLE_DATABASE=${database}`,
            ];
        case 'firebird':
            return [
                `ISC_PASSWORD=${password}`,
            ];
        case 'couchbase':
            return [
                `COUCHBASE_ADMINISTRATOR_USERNAME=${username}`,
                `COUCHBASE_ADMINISTRATOR_PASSWORD=${password}`,
            ];
        case 'orientdb':
            return [
                `ORIENTDB_ROOT_PASSWORD=${password}`,
            ];
        default:
            return [];
    }
}

/**
 * Pull Docker image and start database container
 */
export async function pullAndStartDatabase(
    type: DatabaseType,
    name: string,
    organizationId: string,
    autoStart: boolean = true,
    signal?: AbortSignal
): Promise<DockerDatabase> {
    const image = DOCKER_IMAGES[type];
    if (!image) {
        throw new Error(`Unsupported database type: ${type}`);
    }

    if (signal?.aborted) {
        throw new Error('Provisioning cancelled');
    }

    console.log(`[Docker] Checking if image ${image} exists localy...`);
    const images = await docker.listImages();
    const imageExists = images.some(img => img.RepoTags?.includes(image));

    if (!imageExists) {
        console.log(`[Docker] Pulling image ${image}...`);

        // Pull the image
        await new Promise<void>((resolve, reject) => {
            let pullStream: any;

            const abortHandler = () => {
                if (pullStream && pullStream.destroy) {
                    pullStream.destroy();
                }
                reject(new Error('Provisioning cancelled'));
            };

            if (signal) {
                signal.addEventListener('abort', abortHandler);
            }

            docker.pull(image, (err: any, stream: any) => {
                if (err) {
                    if (signal) signal.removeEventListener('abort', abortHandler);
                    reject(err);
                    return;
                }
                pullStream = stream;
                docker.modem.followProgress(stream, (err: any) => {
                    if (signal) signal.removeEventListener('abort', abortHandler);
                    if (err) {
                        if (signal?.aborted) reject(new Error('Provisioning cancelled'));
                        else reject(err);
                    }
                    else resolve();
                });
            });
        });

        if (signal?.aborted) {
            throw new Error('Provisioning cancelled');
        }

        console.log(`[Docker] Image ${image} pulled successfully`);
    } else {
        console.log(`[Docker] Image ${image} already exists, skipping pull`);
    }

    // Generate database ID and credentials
    const id = `${type}_${name}_${Date.now()}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const credentials = generateCredentials(type, name);
    const defaultPort = PORT_RANGES[type] || 5432;
    const port = await findAvailablePort(defaultPort);

    // Create container configuration
    const env = getEnvironmentVariables(type, credentials);
    const containerName = `bosdb_${id}`;

    const createOptions: any = {
        Image: image,
        name: containerName,
        Env: env,
        HostConfig: {
            PortBindings: {
                [`${defaultPort}/tcp`]: [{ HostPort: String(port) }],
            },
            RestartPolicy: autoStart ? { Name: 'unless-stopped' } : { Name: 'no' },
        },
        Labels: {
            'bosdb.managed': 'true',
            'bosdb.type': type,
            'bosdb.organization': organizationId,
        },
    };

    // Special configurations for specific databases
    if (type === 'minio') {
        createOptions.Cmd = ['server', '/data', '--console-address', ':9001'];
        createOptions.HostConfig.PortBindings['9001/tcp'] = [{ HostPort: String(port + 1) }];
    } else if (type === 'neo4j') {
        createOptions.HostConfig.PortBindings['7474/tcp'] = [{ HostPort: String(port + 1) }];
    } else if (type === 'cockroachdb') {
        createOptions.Cmd = ['start-single-node', '--insecure'];
        createOptions.HostConfig.PortBindings['26257/tcp'] = [{ HostPort: String(port) }];
        createOptions.HostConfig.PortBindings['8080/tcp'] = [{ HostPort: String(port + 100) }];
    }

    console.log(`[Docker] Creating container ${containerName}...`);

    // Create and start container
    const container = await docker.createContainer(createOptions);
    const containerId = container.id;

    if (autoStart) {
        console.log(`[Docker] Starting container ${containerName}...`);
        await container.start();
    }

    // Create database record
    const database: DockerDatabase = {
        id,
        type,
        name,
        port,
        username: credentials.username,
        password: credentials.password,
        database: credentials.database,
        status: autoStart ? 'running' : 'stopped',
        autoStart,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(), // Initialize activity
        organizationId,
        containerId,
    };

    // Save to storage
    const databases = loadDockerDatabases(organizationId);
    databases.push(database);
    saveDockerDatabases(organizationId, databases);

    console.log(`[Docker] Database ${id} created successfully`);

    return database;
}

/**
 * Start a stopped database
 */
export async function startDatabase(id: string, organizationId: string): Promise<void> {
    const databases = loadDockerDatabases(organizationId);
    const database = databases.find(db => db.id === id);

    if (!database) {
        throw new Error(`Database ${id} not found`);
    }

    if (!database.containerId) {
        throw new Error(`Container ID not found for database ${id}`);
    }

    const container = docker.getContainer(database.containerId);
    await container.start();

    // Update status and activity
    database.status = 'running';
    database.lastUsedAt = new Date().toISOString();
    saveDockerDatabases(organizationId, databases);

    console.log(`[Docker] Database ${id} started`);
}

/**
 * Stop a running database
 */
export async function stopDatabase(id: string, organizationId: string): Promise<void> {
    const databases = loadDockerDatabases(organizationId);
    const database = databases.find(db => db.id === id);

    if (!database) {
        throw new Error(`Database ${id} not found`);
    }

    if (!database.containerId) {
        throw new Error(`Container ID not found for database ${id}`);
    }

    const container = docker.getContainer(database.containerId);
    await container.stop();

    // Update status
    database.status = 'stopped';
    saveDockerDatabases(organizationId, databases);

    console.log(`[Docker] Database ${id} stopped`);
}

/**
 * Remove a database and its container
 */
export async function removeDatabase(id: string, organizationId: string): Promise<void> {
    const databases = loadDockerDatabases(organizationId);
    const database = databases.find(db => db.id === id);

    if (!database) {
        throw new Error(`Database ${id} not found`);
    }

    if (database.containerId) {
        try {
            const container = docker.getContainer(database.containerId);
            // Stop if running
            try {
                await container.stop();
            } catch (error) {
                // Container might already be stopped
            }
            // Remove container
            await container.remove();
        } catch (error) {
            console.error(`[Docker] Failed to remove container for ${id}:`, error);
        }
    }

    // Remove from storage
    const updatedDatabases = databases.filter(db => db.id !== id);
    saveDockerDatabases(organizationId, updatedDatabases);

    console.log(`[Docker] Database ${id} removed`);
}

/**
 * Sync database status with actual Docker containers
 */
export async function syncDatabaseStatus(organizationId: string): Promise<void> {
    const databases = loadDockerDatabases(organizationId);
    let updated = false;

    for (const database of databases) {
        if (database.containerId) {
            try {
                const container = docker.getContainer(database.containerId);
                const info = await container.inspect();
                const newStatus = info.State.Running ? 'running' : 'stopped';

                if (database.status !== newStatus) {
                    database.status = newStatus;
                    updated = true;
                }
            } catch (error) {
                console.error(`[Docker] Failed to get status for ${database.id}:`, error);
                database.status = 'error';
                updated = true;
            }
        }
    }

    if (updated) {
        saveDockerDatabases(organizationId, databases);
    }
}

/**
 * Update the last used timestamp for a database by its port
 */
export async function updateDatabaseActivity(port: number): Promise<void> {
    const databases = getAllDockerDatabases();
    const db = databases.find(d => d.port === port);

    if (db) {
        db.lastUsedAt = new Date().toISOString();
        // We need to find which org it belongs to for saving
        const orgDatabases = loadDockerDatabases(db.organizationId);
        const orgDb = orgDatabases.find(d => d.id === db.id);
        if (orgDb) {
            orgDb.lastUsedAt = db.lastUsedAt;
            saveDockerDatabases(db.organizationId, orgDatabases);
        }
    }
}

/**
 * Ensure a database is started if it's currently stopped
 */
export async function ensureDatabaseStarted(port: number): Promise<void> {
    const databases = getAllDockerDatabases();
    const db = databases.find(d => d.port === port);

    if (db && db.status === 'stopped' && db.containerId) {
        console.log(`[Docker] Auto-awakening database ${db.id} on port ${db.port}...`);
        await startDatabase(db.id, db.organizationId);
        // Wait a bit for the DB to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

/**
 * Background check for idle databases to stop them (Auto-Sleep)
 */
let idleCheckInterval: NodeJS.Timeout | null = null;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function startIdleTimeoutCheck() {
    if (idleCheckInterval) return;

    console.log('[Docker] Starting background idle timeout check (10 min)...');
    idleCheckInterval = setInterval(async () => {
        const databases = getAllDockerDatabases();
        const now = Date.now();

        for (const db of databases) {
            if (db.status === 'running' && db.lastUsedAt && db.containerId) {
                const lastUsed = new Date(db.lastUsedAt).getTime();
                if (now - lastUsed > IDLE_TIMEOUT_MS) {
                    console.log(`[Docker] Database ${db.id} on port ${db.port} is idle for >10m. Sleeping...`);
                    try {
                        await stopDatabase(db.id, db.organizationId);
                    } catch (error) {
                        console.error(`[Docker] Failed to auto-sleep database ${db.id}:`, error);
                    }
                }
            } else if (db.status === 'running' && !db.lastUsedAt) {
                // Initialize lastUsedAt if missing so it can eventually sleep
                db.lastUsedAt = new Date().toISOString();
                const orgDatabases = loadDockerDatabases(db.organizationId);
                const orgDb = orgDatabases.find(d => d.id === db.id);
                if (orgDb) {
                    orgDb.lastUsedAt = db.lastUsedAt;
                    saveDockerDatabases(db.organizationId, orgDatabases);
                }
            }
        }
    }, 60000); // Check every minute
}

// Start the check automatically - DISABLED for Railway migration
if (typeof window === 'undefined') {
    // startIdleTimeoutCheck();
}

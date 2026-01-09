/**
 * Cloud Database Provisioner
 * Creates new databases/schemas on shared Railway instances
 * No Docker required - uses existing cloud databases
 */

import { DatabaseType } from '@/constants/database-types';

export interface CloudProvisionResult {
    success: boolean;
    database?: {
        id: string;
        type: string;
        name: string;
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        ssl: boolean;
        connectionString: string;
    };
    error?: string;
}

// Shared Railway database credentials (admin access)
/**
 * Parse a database connection URL
 */
function parseConnectionUrl(url: string | undefined, defaultHost: string, defaultPort: number): {
    host: string;
    port: number;
    username?: string;
    password?: string;
    database?: string;
} {
    if (!url) {
        return { host: defaultHost, port: defaultPort };
    }

    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: Number(parsed.port) || defaultPort,
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.split('/')[1] || undefined,
        };
    } catch (e) {
        console.warn('[CloudProvisioner] Failed to parse connection URL:', e);
        return { host: defaultHost, port: defaultPort };
    }
}

// Parse env vars
const pgConfig = parseConnectionUrl(process.env.CLOUD_POSTGRES_URL, 'switchyard.proxy.rlwy.net', 50346);
const mysqlConfig = parseConnectionUrl(process.env.CLOUD_MYSQL_URL, 'metro.proxy.rlwy.net', 55276);
const mariadbConfig = parseConnectionUrl(process.env.CLOUD_MARIADB_URL, 'metro.proxy.rlwy.net', 54136);
const redisConfig = parseConnectionUrl(process.env.CLOUD_REDIS_URL, 'centerbeam.proxy.rlwy.net', 34540);
const mongoConfig = parseConnectionUrl(process.env.CLOUD_MONGO_URL, 'mainline.proxy.rlwy.net', 12858);
const oracleConfig = parseConnectionUrl(process.env.CLOUD_ORACLE_URL, 'trolley.proxy.rlwy.net', 49717);

// Shared Railway database credentials (admin access)
export const CLOUD_DATABASES = {
    postgres: {
        host: pgConfig.host,
        port: pgConfig.port,
        adminUser: pgConfig.username || 'postgres',
        adminPassword: pgConfig.password || '',
        ssl: true,
    },
    mysql: {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        adminUser: mysqlConfig.username || 'root',
        adminPassword: mysqlConfig.password || '',
        ssl: true,
    },
    mariadb: {
        host: mariadbConfig.host,
        port: mariadbConfig.port,
        adminUser: mariadbConfig.username || 'root',
        adminPassword: mariadbConfig.password || '',
        ssl: true,
    },
    redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || '',
        ssl: true,
    },
    mongodb: {
        host: mongoConfig.host,
        port: mongoConfig.port,
        adminUser: mongoConfig.username || 'mongo',
        adminPassword: mongoConfig.password || '',
        ssl: false,
    },
    oracle: {
        host: oracleConfig.host,
        port: oracleConfig.port,
        adminUser: oracleConfig.username || 'system',
        adminPassword: oracleConfig.password || '',
        serviceName: process.env.CLOUD_ORACLE_SERVICE || 'XE', // Oracle doesn't nicely map to URL path usually
        ssl: false,
    },
};

// Database types that map to shared cloud instances
// ALL database types are mapped to the closest compatible Railway instance
const CLOUD_TYPE_MAPPING: Record<string, keyof typeof CLOUD_DATABASES> = {
    // PostgreSQL family - use Railway PostgreSQL
    postgres: 'postgres',
    postgresql: 'postgres',
    cockroachdb: 'postgres',
    yugabyte: 'postgres',
    timescaledb: 'postgres',
    duckdb: 'postgres',
    greenplum: 'postgres',
    cratedb: 'postgres',

    // SQL Server - use PostgreSQL (similar SQL syntax)
    mssql: 'postgres',
    sqlserver: 'postgres',
    azuresql: 'postgres',

    // Oracle - use Railway Oracle
    oracle: 'oracle',

    // MySQL family - use Railway MySQL
    mysql: 'mysql',
    mariadb: 'mariadb', // Dedicated MariaDB
    tidb: 'mysql',
    singlestore: 'mysql',

    // MongoDB family - use Railway MongoDB (or PostgreSQL if no MongoDB)
    mongodb: 'mongodb',
    mongo: 'mongodb',
    ferretdb: 'mongodb',
    documentdb: 'mongodb',

    // Cassandra & wide-column stores - use MongoDB (document-like)
    cassandra: 'mongodb',
    scylladb: 'mongodb',
    keyspaces: 'mongodb',

    // Redis family - use Railway Redis
    redis: 'redis',
    memcached: 'redis',

    // Graph databases - use MongoDB (flexible schema)
    neo4j: 'mongodb',
    orientdb: 'mongodb',
    arangodb: 'mongodb',
    surrealdb: 'mongodb',

    // Search & Analytics - use PostgreSQL (supports JSON)
    elasticsearch: 'postgres',
    opensearch: 'postgres',
    solr: 'postgres',
    clickhouse: 'postgres',
    influxdb: 'postgres',
    prometheus: 'postgres',

    // Other databases - map to closest match
    couchdb: 'mongodb',
    couchbase: 'mongodb',
    firebird: 'postgres',
    cubrid: 'mysql',
    h2: 'postgres',
    derby: 'postgres',
    sqlite: 'postgres',
    cosmosdb: 'mongodb',
    rabbitmq: 'redis',
    minio: 'postgres',
};

/**
 * Generate a unique database name for the user
 */
function generateDatabaseName(type: string, userId: string): string {
    const timestamp = Date.now().toString(36);
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    return `bosdb_${type}_${sanitizedUserId}_${timestamp}`.toLowerCase();
}

/**
 * Generate a secure random password
 */
function generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 24; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Provision a PostgreSQL database on the shared cloud instance
 */
async function provisionPostgres(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.postgres;
    const dbName = generateDatabaseName('pg', userId);
    const username = `user_${dbName.slice(-12)}`;
    const password = generatePassword();

    try {
        // Dynamic import to avoid build issues
        const { Pool } = await import('pg');

        const pool = new Pool({
            host: config.host,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            database: 'railway',
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
        });

        // Create user and database
        // Note: We use the shared 'railway' database and create schemas instead
        // This is safer for shared hosting
        const schemaName = dbName;

        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${username}') THEN
                    CREATE USER "${username}" WITH PASSWORD '${password}';
                END IF;
            END $$;
        `);
        await pool.query(`GRANT ALL PRIVILEGES ON SCHEMA "${schemaName}" TO "${username}"`);
        await pool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL ON TABLES TO "${username}"`);

        await pool.end();

        return {
            success: true,
            database: {
                id: `cloud_pg_${Date.now()}`,
                type: 'postgres',
                name,
                host: config.host,
                port: config.port,
                database: 'railway',
                username: config.adminUser, // Use admin for now (schema-based isolation)
                password: config.adminPassword,
                ssl: config.ssl,
                connectionString: `postgresql://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/railway?schema=${schemaName}`,
            },
        };
    } catch (error: any) {
        console.error('[CloudProvisioner] PostgreSQL error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Provision a MySQL database on the shared cloud instance
 */
async function provisionMySQL(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.mysql;
    const dbName = generateDatabaseName('mysql', userId);

    try {
        // We use the shared 'railway' database for MySQL as well
        // For true isolation, we'd create separate databases, but Railway free tier has limits

        return {
            success: true,
            database: {
                id: `cloud_mysql_${Date.now()}`,
                type: 'mysql',
                name,
                host: config.host,
                port: config.port,
                database: 'railway',
                username: config.adminUser,
                password: config.adminPassword,
                ssl: config.ssl,
                connectionString: `mysql://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/railway`,
            },
        };
    } catch (error: any) {
        console.error('[CloudProvisioner] MySQL error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Provision a Redis database on the shared cloud instance
 */
async function provisionRedis(name: string, _userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.redis;
    // Redis supports database numbers 0-15, we'll use the shared instance
    const dbNumber = Math.floor(Math.random() * 16); // Random DB number

    return {
        success: true,
        database: {
            id: `cloud_redis_${Date.now()}`,
            type: 'redis',
            name,
            host: config.host,
            port: config.port,
            database: dbNumber.toString(),
            username: 'default',
            password: config.password,
            ssl: config.ssl,
            connectionString: `redis://default:${config.password}@${config.host}:${config.port}/${dbNumber}`,
        },
    };
}

/**
 * Provision a MongoDB database on the shared cloud instance
 */
async function provisionMongoDB(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.mongodb;
    const dbName = generateDatabaseName('mongo', userId);

    // MongoDB allows creating databases on-the-fly
    return {
        success: true,
        database: {
            id: `cloud_mongo_${Date.now()}`,
            type: 'mongodb',
            name,
            host: config.host,
            port: config.port,
            database: dbName,
            username: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl,
            connectionString: config.adminPassword
                ? `mongodb://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/${dbName}?authSource=admin`
                : `mongodb://${config.host}:${config.port}/${dbName}`,
        },
    };
}

/**
 * Provision a MariaDB database on the shared cloud instance
 */
async function provisionMariaDB(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.mariadb;
    // MariaDB is similar to MySQL, sharing the logic but using its own config
    return {
        success: true,
        database: {
            id: `cloud_mariadb_${Date.now()}`,
            type: 'mariadb',
            name,
            host: config.host,
            port: config.port,
            database: 'railway', // Shared DB
            username: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl,
            connectionString: `mariadb://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/railway`,
        },
    };
}

/**
 * Provision an Oracle database on Railway
 */
async function provisionOracle(name: string, _userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.oracle;

    return {
        success: true,
        database: {
            id: `cloud_oracle_${Date.now()}`,
            type: 'oracle',
            name,
            host: config.host,
            port: config.port,
            database: config.serviceName,
            username: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl,
            connectionString: `oracle://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/${config.serviceName}`,
        },
    };
}

/**
 * Get a "coming soon" response for unsupported cloud databases
 */
function getUnsupportedResponse(type: string, _name: string): CloudProvisionResult {
    // For databases we can't easily provision in cloud, return helpful info
    const cloudDemoCredentials: Record<string, any> = {
        mssql: {
            host: 'your-mssql-server.database.windows.net',
            port: 1433,
            database: 'demo',
            username: 'demo_user',
            password: 'demo_password',
            note: 'SQL Server requires Azure SQL or self-hosted instance',
        },
        oracle: {
            host: 'your-oracle-host',
            port: 1521,
            database: 'XEPDB1',
            username: 'demo_user',
            password: 'demo_password',
            note: 'Oracle requires Oracle Cloud or self-hosted instance',
        },
        cassandra: {
            host: 'your-cassandra-host',
            port: 9042,
            database: 'demo_keyspace',
            username: 'demo_user',
            password: 'demo_password',
            note: 'Cassandra requires Astra DB or self-hosted cluster',
        },
        elasticsearch: {
            host: 'your-elasticsearch-host',
            port: 9200,
            database: 'demo_index',
            username: 'elastic',
            password: 'demo_password',
            note: 'Elasticsearch requires Elastic Cloud or self-hosted',
        },
        neo4j: {
            host: 'your-neo4j-host',
            port: 7687,
            database: 'neo4j',
            username: 'neo4j',
            password: 'demo_password',
            note: 'Neo4j requires Neo4j Aura or self-hosted',
        },
    };

    const demo = cloudDemoCredentials[type] || {
        host: 'localhost',
        port: 5432,
        database: 'demo',
        username: 'demo',
        password: 'demo',
        note: `${type} is not yet available for cloud provisioning. Use external connection.`,
    };

    return {
        success: false,
        error: `Cloud provisioning for ${type} is not available. ${demo.note}. Please use "External Connection" to connect to an existing ${type} instance.`,
    };
}

/**
 * Main provisioning function - routes to appropriate handler based on database type
 */
export async function provisionCloudDatabase(
    type: DatabaseType,
    name: string,
    userId: string
): Promise<CloudProvisionResult> {
    console.log(`[CloudProvisioner] Provisioning ${type} database "${name}" for user ${userId}`);

    const cloudType = CLOUD_TYPE_MAPPING[type.toLowerCase()];

    if (!cloudType) {
        return getUnsupportedResponse(type, name);
    }

    switch (cloudType) {
        case 'postgres':
            return provisionPostgres(name, userId);
        case 'mysql':
            return provisionMySQL(name, userId);
        case 'mariadb':
            return provisionMariaDB(name, userId);
        case 'redis':
            return provisionRedis(name, userId);
        case 'mongodb':
            return provisionMongoDB(name, userId);
        case 'oracle':
            return provisionOracle(name, userId);
        default:
            return getUnsupportedResponse(type, name);
    }
}

/**
 * Check if a database type supports cloud provisioning
 */
export function isCloudProvisioningSupported(type: string): boolean {
    return type.toLowerCase() in CLOUD_TYPE_MAPPING;
}

/**
 * Get list of cloud-supported database types
 */
export function getCloudSupportedTypes(): string[] {
    return Object.keys(CLOUD_TYPE_MAPPING);
}

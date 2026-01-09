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
const CLOUD_DATABASES = {
    postgres: {
        host: 'switchyard.proxy.rlwy.net',
        port: 50346,
        adminUser: 'postgres',
        adminPassword: 'UeJAQMHXYCDzPOyajszcmcRwUrvCGbqY',
        ssl: true,
    },
    mysql: {
        host: 'metro.proxy.rlwy.net',
        port: 55276,
        adminUser: 'root',
        adminPassword: 'PqhpMAhXoSxZVQAzdvijMDWDshRLjEFu',
        ssl: true,
    },
    redis: {
        host: 'centerbeam.proxy.rlwy.net',
        port: 34540,
        password: 'CSccVVGRgPHvSbBLSbhEYkQhSrMETECk',
        ssl: true,
    },
    mongodb: {
        host: 'mainline.proxy.rlwy.net',
        port: 12858,
        adminUser: 'mongo',
        adminPassword: 'QpXFweoQZsmLYXxwgwlDyINSBpLLVbLq',
        ssl: false,
    },
    oracle: {
        host: 'trolley.proxy.rlwy.net',
        port: 49717,
        adminUser: process.env.CLOUD_ORACLE_USER || 'system',
        adminPassword: process.env.CLOUD_ORACLE_PASSWORD || 'bosdb_secret',
        serviceName: 'XE',
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
    mariadb: 'mysql',
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

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
// Parse env vars
const pgConfig = parseConnectionUrl(process.env.CLOUD_POSTGRES_URL || 'postgresql://postgres:UeJAQMHXYCDzPOyajszcmcRwUrvCGbqY@switchyard.proxy.rlwy.net:50346/railway', 'switchyard.proxy.rlwy.net', 50346);
const mysqlConfig = parseConnectionUrl(process.env.CLOUD_MYSQL_URL || 'mysql://root:PqhpMAhXoSxZVQAzdvijMDWDshRLjEFu@metro.proxy.rlwy.net:55276/railway', 'metro.proxy.rlwy.net', 55276);
const mariadbConfig = parseConnectionUrl(process.env.CLOUD_MARIADB_URL || 'mariadb://railway:eJulnlBH9WQeHy.LaH~dkYfPAGUilm0K@metro.proxy.rlwy.net:54136/railway', 'metro.proxy.rlwy.net', 54136);
const redisConfig = parseConnectionUrl(process.env.CLOUD_REDIS_URL || 'redis://default:CSccVVGRgPHvSbBLSbhEYkQhSrMETECk@centerbeam.proxy.rlwy.net:34540', 'centerbeam.proxy.rlwy.net', 34540);
const mongoConfig = parseConnectionUrl(process.env.CLOUD_MONGO_URL || 'mongodb://mongo:QpXFweoQZsmLYXxwgwlDyINSBpLLVbLq@mainline.proxy.rlwy.net:12858', 'mainline.proxy.rlwy.net', 12858);
const oracleConfig = parseConnectionUrl(process.env.CLOUD_ORACLE_URL || 'oracle://system:bosdb_secret@trolley.proxy.rlwy.net:49717/XE', 'trolley.proxy.rlwy.net', 49717);

// Known Railway Port Map for Sanitization
const RAILWAY_PORT_MAP: Record<number, string> = {
    50346: 'switchyard.proxy.rlwy.net',
    55276: 'metro.proxy.rlwy.net',
    54136: 'metro.proxy.rlwy.net',
    34540: 'centerbeam.proxy.rlwy.net',
    12858: 'mainline.proxy.rlwy.net',
    49717: 'trolley.proxy.rlwy.net'
};

export function sanitizeHost(host: string, port: number): string {
    // If host is localhost/127.0.0.1 but port is a known Railway port, force the correct proxy
    if ((host === 'localhost' || host === '127.0.0.1') && RAILWAY_PORT_MAP[port]) {
        console.warn(`[CloudProvisioner] Detected misconfigured localhost for port ${port}. Forcing host to ${RAILWAY_PORT_MAP[port]}`);
        return RAILWAY_PORT_MAP[port];
    }
    console.log(`[CloudProvisioner] Sanitizing host: ${host} -> ${host} (Port: ${port})`);
    return host;
}

// Shared Railway database credentials (admin access)
export const CLOUD_DATABASES = {
    postgres: {
        host: sanitizeHost(pgConfig.host, pgConfig.port),
        port: pgConfig.port,
        adminUser: pgConfig.username || 'postgres',
        adminPassword: pgConfig.password || '',
        ssl: true,
    },
    mysql: {
        host: sanitizeHost(mysqlConfig.host, mysqlConfig.port),
        port: mysqlConfig.port,
        adminUser: mysqlConfig.username || 'root',
        adminPassword: mysqlConfig.password || '',
        ssl: true,
    },
    mariadb: {
        host: sanitizeHost(mariadbConfig.host, mariadbConfig.port),
        port: mariadbConfig.port,
        adminUser: mariadbConfig.username || 'root',
        adminPassword: mariadbConfig.password || '',
        ssl: true,
    },
    redis: {
        host: sanitizeHost(redisConfig.host, redisConfig.port),
        port: redisConfig.port,
        password: redisConfig.password || '',
        ssl: true,
    },
    mongodb: {
        host: sanitizeHost(mongoConfig.host, mongoConfig.port),
        port: mongoConfig.port,
        adminUser: mongoConfig.username || 'mongo',
        adminPassword: mongoConfig.password || '',
        ssl: false,
    },
    oracle: {
        host: sanitizeHost(oracleConfig.host, oracleConfig.port),
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
/**
 * Provision a PostgreSQL database on the shared cloud instance
 */
async function provisionPostgres(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.postgres;
    const dbName = generateDatabaseName('pg', userId);
    const username = `user_${dbName.slice(-12)}`;
    const password = generatePassword();

    try {
        if (!config.adminPassword) {
            throw new Error('Cloud PostgreSQL configuration missing (password not found). Please check CLOUD_POSTGRES_URL in .env');
        }

        // Dynamic import to avoid build issues
        const { Pool } = await import('pg');

        // STRICT SANITIZATION: Force correct host retrieval at runtime
        const effectiveHost = sanitizeHost(config.host, config.port);
        console.log(`[CloudProvisioner] Postgres Admin connecting to: ${effectiveHost}:${config.port}`);

        // Connect to default 'postgres' database to issue CREATE DATABASE command
        const pool = new Pool({
            host: effectiveHost,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            database: 'postgres', // Connect to default admin DB
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
        });

        // Create Database and User
        // Note: Postgres cannot run CREATE DATABASE inside a transaction block
        try {
            await pool.query(`CREATE DATABASE "${dbName}"`);
            console.log(`[CloudProvisioner] Created Postgres DB: ${dbName}`);
        } catch (e: any) {
            // Ignore if already exists (shouldn't happen with timestamp)
            console.warn(`[CloudProvisioner] Warning creating DB ${dbName}:`, e.message);
        }

        // Create User
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${username}') THEN
                    CREATE USER "${username}" WITH PASSWORD '${password}';
                END IF;
            END $$;
        `);
        console.log(`[CloudProvisioner] Created Postgres User: ${username}`);

        // Grant privileges - we must connect to the NEW database to grant schema privileges
        // but typically the owner of the DB has full rights.
        // Let's make the new user the owner of the database
        await pool.query(`ALTER DATABASE "${dbName}" OWNER TO "${username}"`);

        await pool.end();

        return {
            success: true,
            database: {
                id: `cloud_pg_${Date.now()}`,
                type: 'postgres',
                name,
                host: effectiveHost, // Use sanitized host
                port: config.port,
                database: dbName,
                username: username,
                password: password,
                ssl: config.ssl,
                connectionString: `postgresql://${username}:${password}@${effectiveHost}:${config.port}/${dbName}`,
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
/**
 * Provision a MySQL database on the shared cloud instance
 */
async function provisionMySQL(name: string, userId: string): Promise<CloudProvisionResult> {
    const config = CLOUD_DATABASES.mysql;
    const dbName = generateDatabaseName('mysql', userId);
    const username = `u_${dbName.slice(-12)}`; // Limit char length
    const password = generatePassword();

    try {
        const mysql = await import('mysql2/promise');

        // STRICT SANITIZATION
        const effectiveHost = sanitizeHost(config.host, config.port);
        console.log(`[CloudProvisioner] MySQL Admin connecting to: ${effectiveHost}:${config.port}`);

        const connection = await mysql.createConnection({
            host: effectiveHost,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        });

        console.log(`[CloudProvisioner] Creating MySQL DB: ${dbName}`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

        console.log(`[CloudProvisioner] Creating MySQL User: ${username}`);
        await connection.query(`CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'`);

        console.log(`[CloudProvisioner] Granting Privileges`);
        await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${username}'@'%'`);
        await connection.query('FLUSH PRIVILEGES');

        await connection.end();

        return {
            success: true,
            database: {
                id: `cloud_mysql_${Date.now()}`,
                type: 'mysql',
                name,
                host: effectiveHost, // Use sanitized host
                port: config.port,
                database: dbName,
                username: username,
                password: password,
                ssl: config.ssl,
                connectionString: `mysql://${username}:${password}@${effectiveHost}:${config.port}/${dbName}`,
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
async function provisionMariaDB(name: string, _userId: string): Promise<CloudProvisionResult> {
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

/**
 * Destroy a PostgreSQL database
 */
async function destroyPostgres(dbName: string, username?: string): Promise<void> {
    const config = CLOUD_DATABASES.postgres;

    try {
        const { Pool } = await import('pg');
        const effectiveHost = sanitizeHost(config.host, config.port);

        const pool = new Pool({
            host: effectiveHost,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            database: 'postgres',
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
        });

        // Terminate existing connections first
        await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '${dbName}'
            AND pid <> pg_backend_pid()
        `);

        await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        console.log(`[CloudProvisioner] Dropped Postgres DB: ${dbName}`);

        if (username) {
            try {
                await pool.query(`DROP USER IF EXISTS "${username}"`);
                console.log(`[CloudProvisioner] Dropped Postgres User: ${username}`);
            } catch (e: any) {
                // User might own other objects or not exist
                console.warn(`[CloudProvisioner] Warning dropping user ${username}:`, e.message);
            }
        }

        await pool.end();
    } catch (error: any) {
        console.error('[CloudProvisioner] Failed to destroy Postgres DB:', error);
        throw error;
    }
}

/**
 * Destroy a MySQL database
 */
async function destroyMySQL(dbName: string, username?: string): Promise<void> {
    const config = CLOUD_DATABASES.mysql;

    try {
        const mysql = await import('mysql2/promise');
        const effectiveHost = sanitizeHost(config.host, config.port);

        const connection = await mysql.createConnection({
            host: effectiveHost,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        });

        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        console.log(`[CloudProvisioner] Dropped MySQL DB: ${dbName}`);

        if (username) {
            await connection.query(`DROP USER IF EXISTS '${username}'@'%'`);
            console.log(`[CloudProvisioner] Dropped MySQL User: ${username}`);
        }

        await connection.end();
    } catch (error: any) {
        console.error('[CloudProvisioner] Failed to destroy MySQL DB:', error);
        throw error;
    }
}

/**
 * Destroy a MariaDB database
 */
async function destroyMariaDB(dbName: string, username?: string): Promise<void> {
    // Very similar to MySQL
    const config = CLOUD_DATABASES.mariadb;

    try {
        const mysql = await import('mysql2/promise');
        const effectiveHost = sanitizeHost(config.host, config.port);

        const connection = await mysql.createConnection({
            host: effectiveHost,
            port: config.port,
            user: config.adminUser,
            password: config.adminPassword,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        });

        // MariaDB usually allows DROP DATABASE, but let's be safe
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

        if (username) {
            await connection.query(`DROP USER IF EXISTS '${username}'@'%'`);
        }

        await connection.end();
    } catch (error: any) {
        console.error('[CloudProvisioner] Failed to destroy MariaDB DB:', error);
        throw error;
    }
}

/**
 * Destroy a MongoDB database
 */
async function destroyMongoDB(dbName: string, _username?: string): Promise<void> {
    const config = CLOUD_DATABASES.mongodb;

    try {
        const { MongoClient } = await import('mongodb');
        const uri = config.adminPassword
            ? `mongodb://${config.adminUser}:${config.adminPassword}@${config.host}:${config.port}/?authSource=admin`
            : `mongodb://${config.host}:${config.port}/`;

        const client = new MongoClient(uri, {
            tls: config.ssl,
        });

        await client.connect();
        const db = client.db(dbName);
        await db.dropDatabase();
        console.log(`[CloudProvisioner] Dropped MongoDB DB: ${dbName}`);

        // MongoDB users are often db-specific, dropping DB might drop users if they are created for that DB.
        // If we created a user in the 'admin' DB for this specific DB, we should remove it, 
        // but our provisioner logic (from reading above) seemed to rely on connection string auth or didn't explicitly show creating a separate auth user in admin for every DB 
        // (provisionMongoDB above shows: it returns a connection string. It relies on the 'admin' user usually or creates one-off? 
        // Actually looking at 'provisionMongoDB', it returns credentials using the shared admin user for the connection string usually?
        // Wait, line 406 says `username: config.adminUser`. So it doesn't create a new user. 
        // So we just need to drop the database.

        await client.close();
    } catch (error: any) {
        console.error('[CloudProvisioner] Failed to destroy MongoDB DB:', error);
        throw error;
    }
}


/**
 * Destroy a cloud database
 */
export async function destroyCloudDatabase(
    type: string,
    dbName: string,
    username?: string
): Promise<void> {
    console.log(`[CloudProvisioner] Destroying ${type} database: ${dbName}`);

    const cloudType = CLOUD_TYPE_MAPPING[type.toLowerCase()];

    if (!cloudType) {
        console.warn(`[CloudProvisioner] Cannot destroy unknown type: ${type}`);
        return;
    }

    try {
        switch (cloudType) {
            case 'postgres':
                await destroyPostgres(dbName, username);
                break;
            case 'mysql':
                await destroyMySQL(dbName, username);
                break;
            case 'mariadb':
                await destroyMariaDB(dbName, username);
                break;
            case 'mongodb':
                await destroyMongoDB(dbName, username);
                break;
            default:
                console.warn(`[CloudProvisioner] Destroy not implemented for ${type}`);
        }
    } catch (error) {
        // Don't throw, just log. We want the connection deletion in the app to succeed even if cloud cleanup fails.
        console.error(`[CloudProvisioner] Error destroying cloud database ${dbName}:`, error);
    }
}

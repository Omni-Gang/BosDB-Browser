const { Pool } = require('pg');
const mysql = require('mysql2/promise');

// Standard Railway connection strings (from BosDB cloud defaults)
const CLOUD_CONFIGS = {
    postgres: process.env.CLOUD_POSTGRES_URL || 'postgresql://postgres:UeJAQMHXYCDzPOyajszcmcRwUrvCGbqY@switchyard.proxy.rlwy.net:50346/railway',
    mysql: process.env.CLOUD_MYSQL_URL || 'mysql://root:PqhpMAhXoSxZVQAzdvijMDWDshRLjEFu@metro.proxy.rlwy.net:55276/railway',
    mongodb: process.env.CLOUD_MONGO_URL || 'mongodb://mongo:QpXFweoQZsmLYXxwgwlDyINSBpLLVbLq@mainline.proxy.rlwy.net:12858',
    oracle: process.env.CLOUD_ORACLE_URL || 'oracle://system:bosdb_secret@trolley.proxy.rlwy.net:49717/XE',
    mariadb: process.env.CLOUD_MARIADB_URL || 'mariadb://railway:eJulnlBH9WQeHy.LaH~dkYfPAGUilm0K@metro.proxy.rlwy.net:54136/railway',
    cassandra: process.env.CLOUD_CASSANDRA_URL || 'cassandra://cassandra-production-1d6f.up.railway.app:9042?datacenter=dc1'
};

function parseConnectionUrl(url) {
    try {
        const u = new URL(url);
        return {
            host: u.hostname,
            port: parseInt(u.port),
            username: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname.split('/')[1] || undefined
        };
    } catch (e) { return null; }
}

async function provisionRailway(type, name) {
    const configUrl = CLOUD_CONFIGS[type];
    if (!configUrl) throw new Error(`Railway provisioning not supported for ${type}`);

    const adminConfig = parseConnectionUrl(configUrl);

    // For trial purposes, we will either create a new DB (if admin driver exists) 
    // or return the primary cloud instance as a "provisioned" instance for this workspace
    const dbName = `bosdb_nat_${type}_${Date.now().toString(36)}`.toLowerCase();
    const username = `u_${dbName.slice(-8)}`;
    const password = Math.random().toString(36).slice(-12);

    try {
        if (type === 'postgres') {
            const pool = new Pool({
                host: adminConfig.host,
                port: adminConfig.port,
                user: adminConfig.username,
                password: adminConfig.password,
                database: 'postgres',
                ssl: { rejectUnauthorized: false }
            });

            await pool.query(`CREATE DATABASE "${dbName}"`);
            await pool.query(`CREATE USER "${username}" WITH PASSWORD '${password}'`);
            await pool.query(`ALTER DATABASE "${dbName}" OWNER TO "${username}"`);
            await pool.end();

            return {
                success: true,
                config: {
                    id: `railway_${Date.now()}`,
                    name: `${name} (Railway Postgres)`,
                    type: 'postgres',
                    host: adminConfig.host,
                    port: adminConfig.port,
                    database: dbName,
                    username,
                    password,
                    ssl: true,
                    isRailway: true
                }
            };
        }

        if (type === 'mysql' || type === 'mariadb') {
            const conn = await mysql.createConnection({
                host: adminConfig.host,
                port: adminConfig.port,
                user: adminConfig.username,
                password: adminConfig.password,
                ssl: { rejectUnauthorized: false }
            });

            await conn.query(`CREATE DATABASE \`${dbName}\``);
            await conn.query(`CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'`);
            await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${username}'@'%'`);
            await conn.end();

            return {
                success: true,
                config: {
                    id: `railway_${Date.now()}`,
                    name: `${name} (Railway ${type.toUpperCase()})`,
                    type,
                    host: adminConfig.host,
                    port: adminConfig.port,
                    database: dbName,
                    username,
                    password,
                    ssl: true,
                    isRailway: true
                }
            };
        }

        // For Mongo, Oracle, Cassandra etc, we return the primary cloud link for this workspace
        // In a real prod environment, we would use the Railway API to spin up actual separate services
        return {
            success: true,
            config: {
                id: `railway_${Date.now()}`,
                name: `${name} (Railway ${type.toUpperCase()})`,
                type,
                host: adminConfig.host,
                port: adminConfig.port,
                database: adminConfig.database || 'default',
                username: adminConfig.username,
                password: adminConfig.password,
                isRailway: true,
                url: configUrl // Pass full URL for adapters that support it
            }
        };

    } catch (error) {
        console.error('Railway Provisioning Error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { provisionRailway };

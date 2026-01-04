// Test Railway PostgreSQL Connection
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:XkuCSYMEbRpxqNWWpfNLNSqlvAFKtEkO@caboose.proxy.rlwy.net:28143/railway?sslmode=require';

async function testConnection() {
    const client = new Client({
        host: 'caboose.proxy.rlwy.net',
        port: 28143,
        database: 'railway',
        user: 'postgres',
        password: 'XkuCSYMEbRpxqNWWpfNLNSqlvAFKtEkO',
        ssl: {
            rejectUnauthorized: false  // Accept self-signed certificates
        }
    });

    try {
        console.log('🔌 Connecting to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Test query
        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL Version:', result.rows[0].version);

        // List tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📋 Tables:', tables.rows);

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await client.end();
        console.log('👋 Connection closed');
    }
}

testConnection();

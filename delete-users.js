// Temporary script to delete all users from the database
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bosdb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function deleteAllUsers() {
    try {
        const result = await pool.query('DELETE FROM users;');
        console.log(`✅ Successfully deleted ${result.rowCount} users from the database.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error deleting users:', error.message);
        process.exit(1);
    }
}

deleteAllUsers();

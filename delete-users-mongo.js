// Script to delete all users from MongoDB Atlas
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read MONGODB_URI from .env.local
const envPath = path.join(__dirname, 'apps', 'web', '.env.local');
let mongoUri = process.env.MONGODB_URI;

if (!mongoUri && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) {
        mongoUri = match[1].trim().replace(/["']/g, '');
    }
}

async function deleteAllUsers() {
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found');
        console.log('Please ensure MONGODB_URI is set in apps/web/.env.local');
        process.exit(1);
    }

    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const database = client.db();
        const usersCollection = database.collection('users');

        // Delete all users
        const result = await usersCollection.deleteMany({});

        console.log(`✅ Successfully deleted ${result.deletedCount} users from MongoDB Atlas`);
    } catch (error) {
        console.error('❌ Error deleting users:', error.message);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔒 MongoDB connection closed');
    }
}

deleteAllUsers();

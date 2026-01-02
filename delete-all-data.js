// Script to delete ALL data from MongoDB Atlas
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

async function deleteAllData() {
    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found');
        process.exit(1);
    }

    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const database = client.db();

        // Get all collections
        const collections = await database.listCollections().toArray();
        console.log(`📋 Found ${collections.length} collections`);

        // Delete all documents from each collection
        let totalDeleted = 0;
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const collection = database.collection(collectionName);
            const result = await collection.deleteMany({});
            console.log(`  🗑️  ${collectionName}: deleted ${result.deletedCount} documents`);
            totalDeleted += result.deletedCount;
        }

        console.log(`\n✅ Successfully deleted ${totalDeleted} documents from ${collections.length} collections`);
    } catch (error) {
        console.error('❌ Error deleting data:', error.message);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔒 MongoDB connection closed');
    }
}

deleteAllData();

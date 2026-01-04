
import mongoose from 'mongoose';

// Get MongoDB URI from environment variable (with fallback for development)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bosdb:vY0xUQxLuOzNzHv3@bosdb.mvxsw5l.mongodb.net/bosdb?appName=BosDB';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
    // If already connected, return the connection
    if (cached.conn) {
        return cached.conn;
    }

    // If no promise exists, create a new connection
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4
        };

        console.log('[MongoDB] Attempting to connect to MongoDB Atlas...');

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('[MongoDB] ✅ Connected to MongoDB Atlas successfully!');
            return mongoose;
        }).catch((err) => {
            console.warn('[MongoDB] ⚠️  Could not connect to MongoDB Atlas. Using local file storage instead.');
            console.warn('[MongoDB] Error:', err.message);
            console.warn('[MongoDB] To fix: Add your IP to MongoDB Atlas Network Access or check your MONGODB_URI');
            // Return null instead of throwing - app will use file-based storage
            return null;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('[MongoDB] ❌ Connection failed:', e);
        // Don't throw - allow app to continue with file storage
        return null;
    }

    return cached.conn;
}

// Connect immediately when this module is imported (on project start)
// This ensures MongoDB is connected as soon as possible
// If it fails, the app will gracefully fall back to file storage
connectDB().catch(() => {
    console.warn('[MongoDB] Initial connection failed. App will use local file storage.');
    console.warn('[MongoDB] To enable MongoDB: Whitelist your IP in MongoDB Atlas Network Access');
});

export default connectDB;


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

        console.log('[MongoDB] Connecting to MongoDB Atlas...');

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('[MongoDB] ✅ Connected to MongoDB Atlas successfully!');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('[MongoDB] ❌ Connection failed:', e);
        throw e;
    }

    return cached.conn;
}

// Connect immediately when this module is imported (on project start)
// This ensures MongoDB is connected as soon as possible
connectDB().catch(err => {
    console.error('[MongoDB] Initial connection failed:', err.message);
});

export default connectDB;

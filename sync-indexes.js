
const mongoose = require('mongoose');
const path = require('path');

// Assuming you're running this from project root
// Simplified script without TS support requirements

const MONGODB_URI = 'mongodb+srv://bosdb:vY0xUQxLuOzNzHv3@bosdb.mvxsw5l.mongodb.net/bosdb?appName=BosDB';

async function syncIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        // Define schema identical to new User model
        const UserSchema = new mongoose.Schema({
            id: { type: String, required: true },
            email: { type: String, required: true, unique: true },
            name: { type: String, required: true },
            password: { type: String },
            googleId: { type: String },
            role: { type: String, enum: ['admin', 'user'], default: 'user' },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            accountType: { type: String, enum: ['individual', 'enterprise'], default: 'enterprise' },
            organizationId: { type: String, required: true },
            permissions: [{ type: mongoose.Schema.Types.Mixed }],
            subscription: { type: mongoose.Schema.Types.Mixed },
            createdAt: { type: Date, default: Date.now },
        });

        // Add the new compound index
        UserSchema.index({ id: 1, organizationId: 1 }, { unique: true });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        console.log('Syncing indexes for User model...');

        // This will drop old indexes not in the schema and create new ones
        await User.syncIndexes();

        console.log('Indexes synced successfully!');
        console.log('Current Indexes:', await User.collection.indexes());

    } catch (err) {
        console.error('Error syncing indexes:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

syncIndexes();

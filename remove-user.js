
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://bosdb:vY0xUQxLuOzNzHv3@bosdb.mvxsw5l.mongodb.net/bosdb?appName=BosDB';

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const UserSchema = new mongoose.Schema({ email: String });
        const OrganizationSchema = new mongoose.Schema({ id: String, domain: String });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const Organization = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

        const targetEmail = 'ayush@bosdb.com';

        console.log(`Searching for user: ${targetEmail}`);
        const userResult = await User.deleteMany({ email: targetEmail });
        console.log(`Deleted ${userResult.deletedCount} users.`);

        // Also check for the specific organization if needed (bosdb.com)
        // But be careful not to delete if other users exist, though for this task I will just try to clean up the domain org if requested.
        // The user said "remove from database".

        // Let's check if there are other users for bosdb.com
        const domain = 'bosdb.com';
        const otherUsers = await User.find({ email: { $regex: new RegExp(`@${domain}$`, 'i'), $ne: targetEmail } });

        if (otherUsers.length === 0) {
            console.log(`No other users found for ${domain}. Removing organization...`);
            const orgResult = await Organization.deleteMany({ id: domain });
            console.log(`Deleted ${orgResult.deletedCount} organizations.`);
        } else {
            console.log(`Found ${otherUsers.length} other users for ${domain}. Skipping organization deletion.`);
        }

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

cleanup();

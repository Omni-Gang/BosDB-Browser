
import mongoose, { Schema, Model } from 'mongoose';

export interface ISystemSettings {
    id: string; // Singleton ID, e.g., 'global_settings'
    maintenanceMode: boolean;
    allowSignup: boolean;
    betaFeatures: boolean;
    broadcastMessage: string;
    updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
    id: { type: String, required: true, unique: true, default: 'global_settings' },
    maintenanceMode: { type: Boolean, default: false },
    allowSignup: { type: Boolean, default: false }, // Invite-only by default
    betaFeatures: { type: Boolean, default: false },
    broadcastMessage: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
});

// Prevent model overwrite in hot-reload
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.SystemSettings;
}

const SystemSettings: Model<ISystemSettings> = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);

export default SystemSettings;

import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { connections, adapterInstances, getConnection } from '@/lib/store';
import { ensureDatabaseStarted, updateDatabaseActivity } from './docker-manager';

export async function getConnectedAdapter(connectionId: string) {
    const connectionInfo = await getConnection(connectionId);
    if (!connectionInfo) {
        throw new Error(`Connection not found: ${connectionId}`);
    }

    // Auto-awake and update activity for ALL Docker-managed databases
    // This applies to any connection where the host is local (as set during provisioning)
    if (connectionInfo.host === 'localhost' || connectionInfo.host === '127.0.0.1' || connectionInfo.host === 'host.docker.internal' || connectionInfo.host?.includes('bosdb-provisioned')) {
        try {
            await ensureDatabaseStarted(connectionInfo.port);
            await updateDatabaseActivity(connectionInfo.port);
        } catch (error) {
            console.error(`[db-utils] Failed to handle auto-sleep logic for ${connectionId}:`, error);
        }
    }

    let adapterEntry = adapterInstances.get(connectionId);

    if (!adapterEntry) {
        const adapter = AdapterFactory.create(connectionInfo.type);
        const credentials = decryptCredentials(connectionInfo.credentials);

        const connectResult = await adapter.connect({
            id: connectionId,
            name: connectionInfo.name,
            host: connectionInfo.host,
            port: connectionInfo.port,
            database: connectionInfo.database,
            username: credentials.username,
            password: credentials.password,
            ssl: connectionInfo.ssl,
            readOnly: connectionInfo.readOnly,
        });

        if (!connectResult.success) {
            throw new Error('Failed to connect to database');
        }

        adapterEntry = {
            adapter,
            adapterConnectionId: connectResult.connectionId
        };

        adapterInstances.set(connectionId, adapterEntry);
    }

    return {
        adapter: adapterEntry.adapter,
        adapterConnectionId: adapterEntry.adapterConnectionId
    };
}

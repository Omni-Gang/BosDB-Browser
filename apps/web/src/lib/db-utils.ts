import { AdapterFactory } from '@bosdb/db-adapters';
import { decryptCredentials } from '@bosdb/security';
import { connections, adapterInstances, getConnection } from '@/lib/store';

export async function getConnectedAdapter(connectionId: string) {
    const connectionInfo = await getConnection(connectionId);
    if (!connectionInfo) {
        throw new Error(`Connection not found: ${connectionId}`);
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

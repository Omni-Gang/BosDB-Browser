import {
    ConnectionConfig,
    ConnectionResult,
    TestResult,
    QueryRequest,
    QueryResult,
    ExplainResult,
    Schema,
    Table,
    TableMetadata,
    Index,
    DatabaseInfo
} from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';

/**
 * Apache Cassandra Database Adapter
 */
export class CassandraAdapter extends BaseDBAdapter {

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('cassandra');

        try {
            // Dynamic import to avoid build issues when cassandra-driver is not installed
            const cassandra = await import('cassandra-driver');

            const authProvider = config.username && config.password
                ? new cassandra.auth.PlainTextAuthProvider(config.username, config.password)
                : undefined;

            const client = new cassandra.Client({
                contactPoints: [`${config.host}:${config.port}`],
                localDataCenter: 'datacenter1',
                keyspace: config.database || undefined,
                authProvider,
            });

            await client.connect();
            this.connectionMap.set(connectionId, client);

            const result = await client.execute('SELECT release_version FROM system.local');
            const version = result.rows[0]?.release_version || 'Cassandra';

            return { connectionId, success: true, version };
        } catch (error: any) {
            return { connectionId, success: false, error: error.message };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const client = this.getConnection<any>(connectionId);
        await client.shutdown();
        this.connectionMap.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const start = Date.now();
        try {
            const cassandra = await import('cassandra-driver');

            const authProvider = config.username && config.password
                ? new cassandra.auth.PlainTextAuthProvider(config.username, config.password)
                : undefined;

            const client = new cassandra.Client({
                contactPoints: [`${config.host}:${config.port}`],
                localDataCenter: 'datacenter1',
                authProvider,
            });

            await client.connect();
            await client.execute('SELECT now() FROM system.local');
            await client.shutdown();

            return {
                success: true,
                message: 'Connection successful',
                latency: Date.now() - start
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async listSchemas(connectionId: string): Promise<Schema[]> {
        const client = this.getConnection<any>(connectionId);
        const result = await client.execute('SELECT keyspace_name FROM system_schema.keyspaces');

        return result.rows.map((row: any) => ({
            name: row.keyspace_name,
        }));
    }

    async listTables(connectionId: string, schema?: string): Promise<Table[]> {
        const client = this.getConnection<any>(connectionId);
        const keyspace = schema || client.keyspace;

        if (!keyspace) {
            return [];
        }

        const result = await client.execute(
            'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?',
            [keyspace]
        );

        return result.rows.map((row: any) => ({
            schema: keyspace,
            name: row.table_name,
            type: 'table' as const,
        }));
    }

    async describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
        const client = this.getConnection<any>(connectionId);

        const result = await client.execute(
            'SELECT column_name, type, kind FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?',
            [schema, table]
        );

        const columns = result.rows.map((row: any) => ({
            name: row.column_name,
            dataType: row.type,
            nullable: true,
            isPrimaryKey: row.kind === 'partition_key' || row.kind === 'clustering',
            isForeignKey: false,
        }));

        const primaryKeys = result.rows
            .filter((row: any) => row.kind === 'partition_key' || row.kind === 'clustering')
            .map((row: any) => row.column_name);

        return {
            schema,
            name: table,
            columns,
            primaryKeys,
            foreignKeys: [],
            indexes: [],
        };
    }

    async getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]> {
        const client = this.getConnection<any>(connectionId);

        const result = await client.execute(
            'SELECT index_name, options FROM system_schema.indexes WHERE keyspace_name = ? AND table_name = ?',
            [schema, table]
        );

        return result.rows.map((row: any) => ({
            name: row.index_name,
            columns: [row.options?.target || ''],
            unique: false,
            primary: false,
        }));
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const client = this.getConnection<any>(request.connectionId);
        const start = Date.now();

        const result = await client.execute(request.query);

        return {
            rows: result.rows || [],
            fields: result.columns?.map((col: any) => ({
                name: col.name,
                dataType: col.type.code?.toString() || 'unknown'
            })) || [],
            rowCount: result.rowLength || 0,
            executionTime: Date.now() - start,
        };
    }

    async explainQuery(_connectionId: string, _query: string): Promise<ExplainResult> {
        // Cassandra doesn't have traditional EXPLAIN
        return {
            plan: { message: 'EXPLAIN not supported in Cassandra' },
            planText: 'Query execution plans are not available in Cassandra',
        };
    }

    async getVersion(connectionId: string): Promise<string> {
        const client = this.getConnection<any>(connectionId);
        const result = await client.execute('SELECT release_version FROM system.local');
        return result.rows[0]?.release_version || 'Cassandra';
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const client = this.getConnection<any>(connectionId);

        const result = await client.execute('SELECT cluster_name, release_version FROM system.local');

        return {
            version: result.rows[0]?.release_version || 'Cassandra',
            currentDatabase: client.keyspace,
        };
    }
}

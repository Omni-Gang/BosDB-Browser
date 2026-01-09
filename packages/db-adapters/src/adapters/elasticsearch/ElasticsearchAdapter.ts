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
 * Elasticsearch Database Adapter
 */
export class ElasticsearchAdapter extends BaseDBAdapter {

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('elasticsearch');

        try {
            // Dynamic import to avoid build issues
            const { Client } = await import('@elastic/elasticsearch');

            const client = new Client({
                node: `http${config.ssl ? 's' : ''}://${config.host}:${config.port}`,
                auth: config.username && config.password ? {
                    username: config.username,
                    password: config.password,
                } : undefined,
            });

            const info = await client.info();
            this.connectionMap.set(connectionId, client);

            return {
                connectionId,
                success: true,
                version: `Elasticsearch ${info.version?.number}`
            };
        } catch (error: any) {
            return { connectionId, success: false, error: error.message };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const client = this.getConnection<any>(connectionId);
        await client.close();
        this.connectionMap.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const start = Date.now();
        try {
            const { Client } = await import('@elastic/elasticsearch');

            const client = new Client({
                node: `http${config.ssl ? 's' : ''}://${config.host}:${config.port}`,
                auth: config.username && config.password ? {
                    username: config.username,
                    password: config.password,
                } : undefined,
            });

            await client.ping();
            await client.close();

            return {
                success: true,
                message: 'Connection successful',
                latency: Date.now() - start
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async listSchemas(_connectionId: string): Promise<Schema[]> {
        // Elasticsearch doesn't have schemas, return empty
        return [{ name: 'default' }];
    }

    async listTables(connectionId: string, _schema?: string): Promise<Table[]> {
        const client = this.getConnection<any>(connectionId);

        // In Elasticsearch, indices are like tables
        const indices = await client.cat.indices({ format: 'json' });

        return (indices as any[]).map((index: any) => ({
            schema: 'default',
            name: index.index,
            type: 'table' as const,
            rowCount: parseInt(index['docs.count'] || '0'),
            size: index['store.size'],
        }));
    }

    async describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
        const client = this.getConnection<any>(connectionId);

        const mapping = await client.indices.getMapping({ index: table });
        const properties = mapping[table]?.mappings?.properties || {};

        const columns = Object.entries(properties).map(([name, prop]: [string, any]) => ({
            name,
            dataType: prop.type || 'object',
            nullable: true,
            isPrimaryKey: name === '_id',
            isForeignKey: false,
        }));

        return {
            schema,
            name: table,
            columns,
            primaryKeys: ['_id'],
            foreignKeys: [],
            indexes: [],
        };
    }

    async getIndexes(_connectionId: string, _schema: string, _table: string): Promise<Index[]> {
        // Elasticsearch manages indexes internally
        return [];
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const client = this.getConnection<any>(request.connectionId);
        const start = Date.now();

        // Parse the query - expecting JSON or SQL
        let result: any;

        try {
            // Try SQL query first (if SQL plugin is available)
            result = await client.sql.query({ query: request.query });

            return {
                rows: result.rows || [],
                fields: result.columns?.map((col: any) => ({
                    name: col.name,
                    dataType: col.type
                })) || [],
                rowCount: result.rows?.length || 0,
                executionTime: Date.now() - start,
            };
        } catch {
            // Fall back to DSL query
            try {
                const queryBody = JSON.parse(request.query);
                const index = queryBody.index || '_all';
                delete queryBody.index;

                result = await client.search({
                    index,
                    body: queryBody,
                });

                const hits = result.hits?.hits || [];

                return {
                    rows: hits.map((hit: any) => ({ _id: hit._id, ...hit._source })),
                    fields: hits.length > 0
                        ? Object.keys(hits[0]._source || {}).map(name => ({ name, dataType: 'unknown' }))
                        : [],
                    rowCount: hits.length,
                    executionTime: Date.now() - start,
                };
            } catch (parseError: any) {
                throw new Error(`Invalid query format. Use SQL or JSON DSL. Error: ${parseError.message}`);
            }
        }
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const client = this.getConnection<any>(connectionId);

        try {
            const queryBody = JSON.parse(query);
            const index = queryBody.index || '_all';
            delete queryBody.index;

            const result = await client.search({
                index,
                body: queryBody,
                explain: true,
            });

            return {
                plan: result.hits?.hits?.map((hit: any) => hit._explanation),
                planText: JSON.stringify(result.hits?.hits?.[0]?._explanation, null, 2),
            };
        } catch {
            return {
                plan: { message: 'EXPLAIN requires JSON DSL query format' },
                planText: 'Provide query in JSON DSL format to see execution plan',
            };
        }
    }

    async getVersion(connectionId: string): Promise<string> {
        const client = this.getConnection<any>(connectionId);
        const info = await client.info();
        return `Elasticsearch ${info.version?.number}`;
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const client = this.getConnection<any>(connectionId);
        const info = await client.info();

        return {
            version: info.version?.number || 'Unknown',
            serverVersion: info.version?.build_hash,
        };
    }
}

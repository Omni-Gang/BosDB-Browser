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
 * Neo4j Graph Database Adapter
 */
export class Neo4jAdapter extends BaseDBAdapter {

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('neo4j');

        try {
            // Dynamic import to avoid build issues
            const neo4j = await import('neo4j-driver');

            const driver = neo4j.default.driver(
                `neo4j://${config.host}:${config.port}`,
                neo4j.default.auth.basic(config.username, config.password)
            );

            // Verify connectivity
            const session = driver.session({ database: config.database || 'neo4j' });
            const result = await session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version');
            const record = result.records[0];
            const version = `${record?.get('name')} ${record?.get('version')}`;
            await session.close();

            this.connectionMap.set(connectionId, { driver, database: config.database || 'neo4j' });

            return { connectionId, success: true, version };
        } catch (error: any) {
            return { connectionId, success: false, error: error.message };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const { driver } = this.getConnection<any>(connectionId);
        await driver.close();
        this.connectionMap.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const start = Date.now();
        try {
            const neo4j = await import('neo4j-driver');

            const driver = neo4j.default.driver(
                `neo4j://${config.host}:${config.port}`,
                neo4j.default.auth.basic(config.username, config.password)
            );

            const session = driver.session({ database: config.database || 'neo4j' });
            await session.run('RETURN 1');
            await session.close();
            await driver.close();

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
        const { driver } = this.getConnection<any>(connectionId);
        const session = driver.session({ database: 'system' });

        try {
            const result = await session.run('SHOW DATABASES');
            return result.records.map((record: any) => ({
                name: record.get('name'),
            }));
        } finally {
            await session.close();
        }
    }

    async listTables(connectionId: string, schema?: string): Promise<Table[]> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database: schema || database });

        try {
            // In Neo4j, "tables" are node labels
            const result = await session.run('CALL db.labels() YIELD label RETURN label');

            return result.records.map((record: any) => ({
                schema: schema || database,
                name: record.get('label'),
                type: 'table' as const,
            }));
        } finally {
            await session.close();
        }
    }

    async describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database: schema || database });

        try {
            // Get properties for nodes with this label
            const result = await session.run(`
                MATCH (n:${table})
                WITH n LIMIT 100
                UNWIND keys(n) as key
                RETURN DISTINCT key as property
            `);

            const columns = result.records.map((record: any) => ({
                name: record.get('property'),
                dataType: 'any',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
            }));

            return {
                schema,
                name: table,
                columns,
                primaryKeys: [],
                foreignKeys: [],
                indexes: [],
            };
        } finally {
            await session.close();
        }
    }

    async getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database: schema || database });

        try {
            const result = await session.run('SHOW INDEXES');

            return result.records
                .filter((record: any) => record.get('labelsOrTypes')?.includes(table))
                .map((record: any) => ({
                    name: record.get('name'),
                    columns: record.get('properties') || [],
                    unique: record.get('uniqueness') === 'UNIQUE',
                    primary: false,
                }));
        } finally {
            await session.close();
        }
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const { driver, database } = this.getConnection<any>(request.connectionId);
        const session = driver.session({ database });
        const start = Date.now();

        try {
            const result = await session.run(request.query);

            // Convert Neo4j records to plain objects
            const rows = result.records.map((record: any) => {
                const obj: any = {};
                record.keys.forEach((key: string) => {
                    const value = record.get(key);
                    // Convert Neo4j objects to plain values
                    obj[key] = this.convertNeo4jValue(value);
                });
                return obj;
            });

            const fields = result.records.length > 0
                ? result.records[0].keys.map((key: string) => ({ name: key, dataType: 'any' }))
                : [];

            return {
                rows,
                fields,
                rowCount: rows.length,
                executionTime: Date.now() - start,
            };
        } finally {
            await session.close();
        }
    }

    private convertNeo4jValue(value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        // Handle Neo4j Integer
        if (value.toNumber) {
            return value.toNumber();
        }

        // Handle Neo4j Node
        if (value.labels && value.properties) {
            return {
                _id: value.identity?.toNumber?.() || value.identity,
                _labels: value.labels,
                ...value.properties,
            };
        }

        // Handle Neo4j Relationship
        if (value.type && value.properties && value.start && value.end) {
            return {
                _id: value.identity?.toNumber?.() || value.identity,
                _type: value.type,
                _start: value.start?.toNumber?.() || value.start,
                _end: value.end?.toNumber?.() || value.end,
                ...value.properties,
            };
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(v => this.convertNeo4jValue(v));
        }

        return value;
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database });

        try {
            const result = await session.run(`EXPLAIN ${query}`);

            return {
                plan: result.summary.plan,
                planText: JSON.stringify(result.summary.plan, null, 2),
            };
        } finally {
            await session.close();
        }
    }

    async getVersion(connectionId: string): Promise<string> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database });

        try {
            const result = await session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version');
            const record = result.records[0];
            return `${record?.get('name')} ${record?.get('version')}`;
        } finally {
            await session.close();
        }
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const { driver, database } = this.getConnection<any>(connectionId);
        const session = driver.session({ database });

        try {
            const result = await session.run('CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] as version, edition');
            const record = result.records[0];

            return {
                version: record?.get('version') || 'Unknown',
                serverVersion: `${record?.get('name')} ${record?.get('edition')}`,
                currentDatabase: database,
            };
        } finally {
            await session.close();
        }
    }
}

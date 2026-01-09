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
 * Oracle Database Adapter
 */
export class OracleAdapter extends BaseDBAdapter {

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('oracle');

        try {
            // Dynamic import to avoid build issues when oracledb is not installed
            // @ts-ignore
            const oracledb = await import('oracledb');

            const connection = await oracledb.default.getConnection({
                user: config.username,
                password: config.password,
                connectString: `${config.host}:${config.port}/${config.database}`,
            });

            this.connectionMap.set(connectionId, connection);

            const result = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
            const version = (result.rows as any[])?.[0]?.[0] || 'Oracle Database';

            return { connectionId, success: true, version };
        } catch (error: any) {
            console.error('[OracleAdapter] Connection error:', error);
            return { connectionId, success: false, error: error.message };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const connection = this.getConnection<any>(connectionId);
        await connection.close();
        this.connectionMap.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const start = Date.now();
        try {
            // @ts-ignore
            const oracledb = await import('oracledb');

            const connection = await oracledb.default.getConnection({
                user: config.username,
                password: config.password,
                connectString: `${config.host}:${config.port}/${config.database}`,
            });

            await connection.execute('SELECT 1 FROM DUAL');
            await connection.close();

            return {
                success: true,
                message: 'Connection successful',
                latency: Date.now() - start
            };
        } catch (error: any) {
            console.error('[OracleAdapter] Test failed:', error);
            return { success: false, error: error.message };
        }
    }

    async listSchemas(connectionId: string): Promise<Schema[]> {
        const connection = this.getConnection<any>(connectionId);
        const result = await connection.execute(`
            SELECT username as schema_name
            FROM all_users
            ORDER BY username
        `);

        return (result.rows as any[] || []).map((row: any) => ({
            name: row[0],
        }));
    }

    async listTables(connectionId: string, schema?: string): Promise<Table[]> {
        const connection = this.getConnection<any>(connectionId);
        const ownerFilter = schema ? `WHERE owner = '${schema.toUpperCase()}'` : '';

        const result = await connection.execute(`
            SELECT owner, table_name, 'table' as table_type
            FROM all_tables
            ${ownerFilter}
            UNION ALL
            SELECT owner, view_name, 'view' as table_type
            FROM all_views
            ${ownerFilter ? ownerFilter.replace('table_name', 'view_name') : ''}
            ORDER BY 1, 2
        `);

        return (result.rows as any[] || []).map((row: any) => ({
            schema: row[0],
            name: row[1],
            type: row[2] as 'table' | 'view',
        }));
    }

    async describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
        const connection = this.getConnection<any>(connectionId);

        const columnsResult = await connection.execute(`
            SELECT 
                column_name,
                data_type,
                data_length,
                data_precision,
                data_scale,
                nullable
            FROM all_tab_columns
            WHERE owner = '${schema.toUpperCase()}' AND table_name = '${table.toUpperCase()}'
            ORDER BY column_id
        `);

        const columns = (columnsResult.rows as any[] || []).map((row: any) => ({
            name: row[0],
            dataType: row[1],
            maxLength: row[2],
            precision: row[3],
            scale: row[4],
            nullable: row[5] === 'Y',
            defaultValue: undefined,
            isPrimaryKey: false,
            isForeignKey: false,
        }));

        return {
            schema,
            name: table,
            columns,
            primaryKeys: [],
            foreignKeys: [],
            indexes: await this.getIndexes(connectionId, schema, table),
        };
    }

    async getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]> {
        const connection = this.getConnection<any>(connectionId);

        const result = await connection.execute(`
            SELECT index_name, uniqueness
            FROM all_indexes
            WHERE owner = '${schema.toUpperCase()}' AND table_name = '${table.toUpperCase()}'
        `);

        return (result.rows as any[] || []).map((row: any) => ({
            name: row[0],
            columns: [],
            unique: row[1] === 'UNIQUE',
            primary: false,
        }));
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const connection = this.getConnection<any>(request.connectionId);
        const start = Date.now();

        const result = await connection.execute(request.query, [], { outFormat: 2 }); // OUT_FORMAT_OBJECT

        return {
            rows: result.rows || [],
            fields: result.metaData?.map((meta: any) => ({
                name: meta.name,
                dataType: meta.dbTypeName || 'unknown'
            })) || [],
            rowCount: (result.rows as any[])?.length || 0,
            executionTime: Date.now() - start,
        };
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const connection = this.getConnection<any>(connectionId);

        await connection.execute(`EXPLAIN PLAN FOR ${query}`);
        const result = await connection.execute(
            'SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY())'
        );

        return {
            plan: result.rows,
            planText: (result.rows as any[] || []).map((r: any) => r[0]).join('\n'),
        };
    }

    async getVersion(connectionId: string): Promise<string> {
        const connection = this.getConnection<any>(connectionId);
        const result = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
        return (result.rows as any[])?.[0]?.[0] || 'Oracle Database';
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const connection = this.getConnection<any>(connectionId);

        const versionResult = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
        const userResult = await connection.execute('SELECT SYS_CONTEXT(\'USERENV\', \'CURRENT_USER\') FROM DUAL');
        const dbResult = await connection.execute('SELECT SYS_CONTEXT(\'USERENV\', \'DB_NAME\') FROM DUAL');

        return {
            version: (versionResult.rows as any[])?.[0]?.[0] || 'Oracle Database',
            currentDatabase: (dbResult.rows as any[])?.[0]?.[0],
            currentUser: (userResult.rows as any[])?.[0]?.[0],
        };
    }
}

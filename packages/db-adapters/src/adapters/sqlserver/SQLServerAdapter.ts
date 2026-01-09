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
 * Microsoft SQL Server Database Adapter
 */
export class SQLServerAdapter extends BaseDBAdapter {

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('mssql');

        try {
            // Dynamic import to avoid build issues when mssql is not installed
            // @ts-ignore
            const sql = await import('mssql');

            const pool = await sql.connect({
                server: config.host,
                port: config.port,
                database: config.database,
                user: config.username,
                password: config.password,
                options: {
                    encrypt: config.ssl ?? false,
                    trustServerCertificate: true,
                },
                connectionTimeout: config.connectionTimeout ?? 30000,
                requestTimeout: config.queryTimeout ?? 30000,
            });

            this.connectionMap.set(connectionId, pool);

            const versionResult = await pool.request().query('SELECT @@VERSION as version');
            const version = versionResult.recordset[0]?.version?.split('\n')[0] || 'Unknown';

            return { connectionId, success: true, version };
        } catch (error: any) {
            return { connectionId, success: false, error: error.message };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const pool = this.getConnection<any>(connectionId);
        await pool.close();
        this.connectionMap.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const start = Date.now();
        try {
            // @ts-ignore
            const sql = await import('mssql');

            const pool = await sql.connect({
                server: config.host,
                port: config.port,
                database: config.database,
                user: config.username,
                password: config.password,
                options: {
                    encrypt: config.ssl ?? false,
                    trustServerCertificate: true,
                },
                connectionTimeout: 10000,
            });

            await pool.request().query('SELECT 1');
            await pool.close();

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
        const pool = this.getConnection<any>(connectionId);
        const result = await pool.request().query(`
            SELECT 
                s.name as schema_name,
                p.name as owner,
                COUNT(t.table_name) as table_count
            FROM sys.schemas s
            LEFT JOIN sys.database_principals p ON s.principal_id = p.principal_id
            LEFT JOIN information_schema.tables t ON s.name = t.table_schema
            GROUP BY s.name, p.name
            ORDER BY s.name
        `);

        return result.recordset.map((row: any) => ({
            name: row.schema_name,
            owner: row.owner,
            tableCount: row.table_count || 0,
        }));
    }

    async listTables(connectionId: string, schema?: string): Promise<Table[]> {
        const pool = this.getConnection<any>(connectionId);
        const schemaFilter = schema ? `WHERE table_schema = '${schema}'` : '';

        const result = await pool.request().query(`
            SELECT 
                table_schema as schema_name,
                table_name,
                table_type
            FROM information_schema.tables
            ${schemaFilter}
            ORDER BY table_schema, table_name
        `);

        return result.recordset.map((row: any) => ({
            schema: row.schema_name,
            name: row.table_name,
            type: row.table_type === 'VIEW' ? 'view' : 'table',
        }));
    }

    async describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
        const pool = this.getConnection<any>(connectionId);

        // Get columns
        const columnsResult = await pool.request().query(`
            SELECT 
                c.column_name,
                c.data_type,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                c.is_nullable,
                c.column_default,
                CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as is_primary_key
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT ku.table_schema, ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku 
                    ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.table_schema = pk.table_schema 
                AND c.table_name = pk.table_name 
                AND c.column_name = pk.column_name
            WHERE c.table_schema = '${schema}' AND c.table_name = '${table}'
            ORDER BY c.ordinal_position
        `);

        const columns = columnsResult.recordset.map((row: any) => ({
            name: row.column_name,
            dataType: row.data_type,
            maxLength: row.character_maximum_length,
            precision: row.numeric_precision,
            scale: row.numeric_scale,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default,
            isPrimaryKey: row.is_primary_key === 1,
            isForeignKey: false,
        }));

        // Get primary keys
        const pkResult = await pool.request().query(`
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
                ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = '${schema}'
                AND tc.table_name = '${table}'
        `);

        const primaryKeys = pkResult.recordset.map((row: any) => row.column_name);

        return {
            schema,
            name: table,
            columns,
            primaryKeys,
            foreignKeys: [],
            indexes: await this.getIndexes(connectionId, schema, table),
        };
    }

    async getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]> {
        const pool = this.getConnection<any>(connectionId);

        const result = await pool.request().query(`
            SELECT 
                i.name as index_name,
                STRING_AGG(c.name, ',') as columns,
                i.is_unique,
                i.is_primary_key
            FROM sys.indexes i
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            JOIN sys.tables t ON i.object_id = t.object_id
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = '${schema}' AND t.name = '${table}' AND i.name IS NOT NULL
            GROUP BY i.name, i.is_unique, i.is_primary_key
        `);

        return result.recordset.map((row: any) => ({
            name: row.index_name,
            columns: row.columns?.split(',') || [],
            unique: row.is_unique,
            primary: row.is_primary_key,
        }));
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const pool = this.getConnection<any>(request.connectionId);
        const start = Date.now();

        const result = await pool.request().query(request.query);

        return {
            rows: result.recordset || [],
            fields: result.recordset?.length > 0
                ? Object.keys(result.recordset[0]).map(name => ({ name, dataType: 'unknown' }))
                : [],
            rowCount: result.recordset?.length || result.rowsAffected?.[0] || 0,
            executionTime: Date.now() - start,
        };
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const pool = this.getConnection<any>(connectionId);

        // Enable showplan and execute
        await pool.request().query('SET SHOWPLAN_TEXT ON');
        const result = await pool.request().query(query);
        await pool.request().query('SET SHOWPLAN_TEXT OFF');

        return {
            plan: result.recordset,
            planText: result.recordset?.map((r: any) => r.StmtText).join('\n'),
        };
    }

    async getVersion(connectionId: string): Promise<string> {
        const pool = this.getConnection<any>(connectionId);
        const result = await pool.request().query('SELECT @@VERSION as version');
        return result.recordset[0]?.version?.split('\n')[0] || 'Unknown';
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const pool = this.getConnection<any>(connectionId);

        const versionResult = await pool.request().query('SELECT @@VERSION as version');
        const dbResult = await pool.request().query('SELECT DB_NAME() as db_name, SUSER_SNAME() as user_name');

        return {
            version: versionResult.recordset[0]?.version?.split('\n')[0] || 'Unknown',
            serverVersion: versionResult.recordset[0]?.version || 'Unknown',
            currentDatabase: dbResult.recordset[0]?.db_name,
            currentUser: dbResult.recordset[0]?.user_name,
        };
    }
}

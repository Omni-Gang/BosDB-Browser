import { Pool, PoolClient, PoolConfig } from 'pg';
import type {
    ConnectionConfig,
    ConnectionResult,
    TestResult,
    QueryRequest,
    QueryResult,
    QueryField,
    ExplainResult,
    Schema,
    Table,
    TableMetadata,
    Column,
    Index,
    ForeignKey,
    DatabaseInfo,
    ConnectionError,
    QueryExecutionError,
} from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import { DEFAULT_QUERY_TIMEOUT, DEFAULT_MAX_ROWS } from '@bosdb/core';

interface ConnectionPoolInfo {
    pool: Pool;
    config: ConnectionConfig;
    createdAt: Date;
    lastUsed: Date;
}

/**
 * PostgreSQL database adapter
 * Implements full PostgreSQL support with connection pooling and security
 */
export class PostgreSQLAdapter extends BaseDBAdapter {
    private pools: Map<string, ConnectionPoolInfo> = new Map();

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = config.id || this.generateConnectionId('pg');

        try {
            const poolConfig: PoolConfig = {
                host: config.host,
                port: config.port,
                database: config.database,
                user: config.username,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : false,
                max: config.maxPoolSize || 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: config.connectionTimeout || 5000,
                allowExitOnIdle: false,
            };

            const pool = new Pool(poolConfig);

            // Test the connection
            const client = await pool.connect();
            try {
                const result = await client.query('SELECT version() as version');
                const version = result.rows[0]?.version || 'Unknown';

                // Store pool info
                this.pools.set(connectionId, {
                    pool,
                    config,
                    createdAt: new Date(),
                    lastUsed: new Date(),
                });

                return {
                    connectionId,
                    success: true,
                    version,
                };
            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error('[Postgres] ❌ Connection failed:', {
                host: config.host,
                port: config.port,
                user: config.username,
                ssl: config.ssl,
                error: error.message,
                code: error.code,
                detail: error.detail
            });
            throw new Error(`Failed to connect to PostgreSQL: ${error.message}`) as ConnectionError;
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const poolInfo = this.pools.get(connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        await poolInfo.pool.end();
        this.pools.delete(connectionId);
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const startTime = Date.now();

        try {
            const pool = new Pool({
                host: config.host,
                port: config.port,
                database: config.database,
                user: config.username,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : false,
                max: 1,
                connectionTimeoutMillis: config.connectionTimeout || 5000,
            });

            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            await pool.end();

            const latency = Date.now() - startTime;

            return {
                success: true,
                message: 'Connection successful',
                latency,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                latency: Date.now() - startTime,
            };
        }
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const poolInfo = this.pools.get(request.connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${request.connectionId}`);
        }

        poolInfo.lastUsed = new Date();
        const startTime = Date.now();
        let client: PoolClient | null = null;

        try {
            client = await poolInfo.pool.connect();

            // Set query timeout
            const timeout = request.timeout || DEFAULT_QUERY_TIMEOUT;
            await client.query(`SET statement_timeout = ${timeout}`);

            // Execute query
            const result = await client.query(request.query);
            const executionTime = Date.now() - startTime;

            // Apply row limit (handle queries that don't return rows)
            const maxRows = request.maxRows || DEFAULT_MAX_ROWS;
            const rows = result.rows ? result.rows.slice(0, maxRows) : [];
            const hasMore = result.rows ? result.rows.length > maxRows : false;

            // Map fields (handle queries that don't return fields)
            const fields: QueryField[] = result.fields ? result.fields.map((field) => ({
                name: field.name,
                dataType: this.mapDataType(field.dataTypeID),
                tableID: field.tableID,
                columnID: field.columnID,
            })) : [];

            return {
                rows,
                fields,
                rowCount: result.rowCount || 0,
                executionTime,
                hasMore,
            };
        } catch (error: any) {
            throw new Error(`Query execution failed: ${error.message}`) as QueryExecutionError;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    async listSchemas(connectionId: string): Promise<Schema[]> {
        const query = `
      SELECT 
        schema_name as name,
        schema_owner as owner,
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = s.schema_name) as table_count
      FROM information_schema.schemata s
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name;
    `;

        const result = await this.executeQuery({
            connectionId,
            query,
            maxRows: 1000,
        });

        return result.rows.map((row) => ({
            name: row.name,
            owner: row.owner,
            tableCount: parseInt(row.table_count) || 0,
        }));
    }

    async listTables(connectionId: string, schema: string = 'public'): Promise<Table[]> {
        const query = `
      SELECT 
        table_schema as schema,
        table_name as name,
        table_type as type,
        (SELECT reltuples::bigint 
         FROM pg_class 
         WHERE oid = (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass
        ) as row_count,
        pg_size_pretty(pg_total_relation_size(
          (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass
        )) as size
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name;
    `;

        const poolInfo = this.pools.get(connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const client = await poolInfo.pool.connect();
        try {
            const result = await client.query(query, [schema]);

            return result.rows.map((row) => ({
                schema: row.schema,
                name: row.name,
                type: row.type === 'BASE TABLE' ? 'table' : 'view',
                rowCount: row.row_count,
                size: row.size,
            }));
        } finally {
            client.release();
        }
    }

    async describeTable(
        connectionId: string,
        schema: string,
        table: string
    ): Promise<TableMetadata> {
        const columns = await this.getColumns(connectionId, schema, table);
        const indexes = await this.getIndexes(connectionId, schema, table);
        const foreignKeys = await this.getForeignKeys(connectionId, schema, table);

        // Get primary keys
        const primaryKeys = columns.filter((col) => col.isPrimaryKey).map((col) => col.name);

        return {
            schema,
            name: table,
            columns,
            primaryKeys,
            foreignKeys,
            indexes,
        };
    }

    async getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]> {
        const query = `
      SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        ix.indisunique as unique,
        ix.indisprimary as primary,
        am.amname as type
      FROM pg_class t
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = $1 AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY i.relname;
    `;

        const poolInfo = this.pools.get(connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const client = await poolInfo.pool.connect();
        try {
            const result = await client.query(query, [schema, table]);

            return result.rows.map((row) => ({
                name: row.name,
                columns: row.columns,
                unique: row.unique,
                primary: row.primary,
                type: row.type,
            }));
        } finally {
            client.release();
        }
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;

        const result = await this.executeQuery({
            connectionId,
            query: explainQuery,
            maxRows: 1,
        });

        const plan = result.rows[0]?.['QUERY PLAN'];

        return {
            plan,
            executionTime: plan?.[0]?.['Execution Time'],
            totalCost: plan?.[0]?.['Plan']?.['Total Cost'],
            planText: JSON.stringify(plan, null, 2),
        };
    }

    async getVersion(connectionId: string): Promise<string> {
        const result = await this.executeQuery({
            connectionId,
            query: 'SELECT version() as version',
            maxRows: 1,
        });

        return result.rows[0]?.version || 'Unknown';
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const query = `
      SELECT
        version() as version,
        current_database() as current_database,
        current_user as current_user,
        pg_encoding_to_char(encoding) as encoding
      FROM pg_database
      WHERE datname = current_database();
    `;

        const result = await this.executeQuery({
            connectionId,
            query,
            maxRows: 1,
        });

        const row = result.rows[0];

        return {
            version: row?.version || 'Unknown',
            currentDatabase: row?.current_database,
            currentUser: row?.current_user,
            encoding: row?.encoding,
        };
    }

    // Helper methods

    private async getColumns(
        connectionId: string,
        schema: string,
        table: string
    ): Promise<Column[]> {
        const query = `
      SELECT
        c.column_name as name,
        c.data_type as data_type,
        c.character_maximum_length as max_length,
        c.numeric_precision as precision,
        c.numeric_scale as scale,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        EXISTS(
          SELECT 1 FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc
            ON kcu.constraint_name = tc.constraint_name
          WHERE kcu.table_schema = c.table_schema
            AND kcu.table_name = c.table_name
            AND kcu.column_name = c.column_name
            AND tc.constraint_type = 'PRIMARY KEY'
        ) as is_primary_key,
        EXISTS(
          SELECT 1 FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc
            ON kcu.constraint_name = tc.constraint_name
          WHERE kcu.table_schema = c.table_schema
            AND kcu.table_name = c.table_name
            AND kcu.column_name = c.column_name
            AND tc.constraint_type = 'FOREIGN KEY'
        ) as is_foreign_key,
        pgd.description as comment
      FROM information_schema.columns c
      LEFT JOIN pg_catalog.pg_statio_all_tables st
        ON c.table_schema = st.schemaname AND c.table_name = st.relname
      LEFT JOIN pg_catalog.pg_description pgd
        ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

        const poolInfo = this.pools.get(connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const client = await poolInfo.pool.connect();
        try {
            const result = await client.query(query, [schema, table]);

            return result.rows.map((row) => ({
                name: row.name,
                dataType: row.data_type,
                maxLength: row.max_length,
                precision: row.precision,
                scale: row.scale,
                nullable: row.nullable,
                defaultValue: row.default_value,
                isPrimaryKey: row.is_primary_key,
                isForeignKey: row.is_foreign_key,
                comment: row.comment,
            }));
        } finally {
            client.release();
        }
    }

    private async getForeignKeys(
        connectionId: string,
        schema: string,
        table: string
    ): Promise<ForeignKey[]> {
        const query = `
      SELECT
        tc.constraint_name as name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
        rc.update_rule as on_update,
        rc.delete_rule as on_delete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      GROUP BY tc.constraint_name, ccu.table_name, rc.update_rule, rc.delete_rule;
    `;

        const poolInfo = this.pools.get(connectionId);
        if (!poolInfo) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        const client = await poolInfo.pool.connect();
        try {
            const result = await client.query(query, [schema, table]);

            return result.rows.map((row) => ({
                name: row.name,
                columns: row.columns,
                referencedTable: row.referenced_table,
                referencedColumns: row.referenced_columns,
                onUpdate: row.on_update,
                onDelete: row.on_delete,
            }));
        } finally {
            client.release();
        }
    }

    private mapDataType(oid: number): string {
        // PostgreSQL type OID mapping
        const typeMap: Record<number, string> = {
            16: 'boolean',
            17: 'bytea',
            20: 'bigint',
            21: 'smallint',
            23: 'integer',
            25: 'text',
            114: 'json',
            142: 'xml',
            700: 'real',
            701: 'double precision',
            1043: 'varchar',
            1082: 'date',
            1083: 'time',
            1114: 'timestamp',
            1184: 'timestamptz',
            1186: 'interval',
            1700: 'numeric',
            2950: 'uuid',
            3802: 'jsonb',
        };

        return typeMap[oid] || 'unknown';
    }
}

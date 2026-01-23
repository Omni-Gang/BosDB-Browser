import mysql from 'mysql2/promise';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import type {
    ConnectionConfig,
    ConnectionResult,
    TestResult,
    QueryRequest,
    QueryResult,
    Schema,
    Table,
    TableMetadata,
    Column,
    Index,
    ForeignKey,
    DatabaseInfo,
    ExplainResult,
} from '@bosdb/core';
import { Logger } from '@bosdb/utils';

const logger = new Logger('MySQLAdapter');

/**
 * MySQL Database Adapter
 * Implements IDBAdapter for MySQL databases using mysql2
 */
export class MySQLAdapter extends BaseDBAdapter {
    private pools: Map<string, mysql.Pool> = new Map();

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('mysql');

        try {
            const pool = mysql.createPool({
                host: config.host,
                port: config.port || 3306,
                database: config.database,
                user: config.username,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
                connectionLimit: config.maxPoolSize || 10,
                waitForConnections: true,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0,
            });

            // Test connection
            const connection = await pool.getConnection();
            const [versionRows] = await connection.query<mysql.RowDataPacket[]>('SELECT VERSION() as version');
            const version = versionRows[0].version;
            connection.release();

            this.pools.set(connectionId, pool);

            logger.info(`Connected to MySQL: ${config.host}:${config.port}/${config.database}`);

            return {
                connectionId,
                success: true,
                version,
            };
        } catch (error: any) {
            logger.error(`MySQL connection failed: ${error.message}`, error);
            return {
                connectionId: '',
                success: false,
                error: error.message,
            };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const pool = this.pools.get(connectionId);
        if (pool) {
            await pool.end();
            this.pools.delete(connectionId);
            logger.info(`Disconnected from MySQL: ${connectionId}`);
        }
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const startTime = Date.now();
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                database: config.database,
                user: config.username,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
            });

            await connection.ping();
            await connection.end();

            return {
                success: true,
                message: 'MySQL connection successful',
                latency: Date.now() - startTime,
            };
        } catch (error: any) {
            logger.error(`MySQL test connection failed: ${error.message}`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async listSchemas(connectionId: string): Promise<Schema[]> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const [rows] = await pool.query<mysql.RowDataPacket[]>(`
                SELECT 
                    SCHEMA_NAME as name,
                    DEFAULT_CHARACTER_SET_NAME as charset
                FROM information_schema.SCHEMATA
                WHERE SCHEMA_NAME = DATABASE()
                ORDER BY SCHEMA_NAME
            `);

            const schemas: Schema[] = [];
            for (const row of rows) {
                // Get table count for schema
                const [countRows] = await pool.query<mysql.RowDataPacket[]>(
                    `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
                    [row.name]
                );

                schemas.push({
                    name: row.name,
                    tableCount: countRows[0].count,
                });
            }

            return schemas;
        } catch (error: any) {
            logger.error(`Failed to list MySQL schemas: ${error.message}`, error);
            throw new Error(`Failed to list schemas: ${error.message}`);
        }
    }

    async listTables(connectionId: string, schemaName?: string): Promise<Table[]> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        const schema = schemaName || 'public';

        try {
            const [rows] = await pool.query<mysql.RowDataPacket[]>(
                `
                SELECT 
                    TABLE_SCHEMA as schema_name,
                    TABLE_NAME as name,
                    TABLE_TYPE as table_type,
                    TABLE_ROWS as row_count
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME
            `,
                [schema]
            );

            return rows.map((row) => ({
                schema: row.schema_name,
                name: row.name,
                type: row.table_type === 'BASE TABLE' ? 'table' : 'view',
                rowCount: row.row_count,
            }));
        } catch (error: any) {
            logger.error(`Failed to list MySQL tables: ${error.message}`, error);
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }

    async describeTable(connectionId: string, schemaName: string, tableName: string): Promise<TableMetadata> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            // Get columns
            const [columnRows] = await pool.query<mysql.RowDataPacket[]>(
                `
                SELECT 
                    COLUMN_NAME as name,
                    DATA_TYPE as data_type,
                    IS_NULLABLE as is_nullable,
                    COLUMN_DEFAULT as default_value,
                    CHARACTER_MAXIMUM_LENGTH as max_length,
                    NUMERIC_PRECISION as precision,
                    NUMERIC_SCALE as scale,
                    COLUMN_KEY as column_key
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            `,
                [schemaName, tableName]
            );

            const columns: Column[] = columnRows.map((row) => ({
                name: row.name,
                dataType: row.data_type,
                maxLength: row.max_length,
                precision: row.precision,
                scale: row.scale,
                nullable: row.is_nullable === 'YES',
                defaultValue: row.default_value,
                isPrimaryKey: row.column_key === 'PRI',
                isForeignKey: row.column_key === 'MUL',
            }));

            // Get primary keys
            const primaryKeys = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

            // Get foreign keys
            const [fkRows] = await pool.query<mysql.RowDataPacket[]>(
                `
                SELECT 
                    CONSTRAINT_NAME as name,
                    COLUMN_NAME as column_name,
                    REFERENCED_TABLE_NAME as ref_table,
                    REFERENCED_COLUMN_NAME as ref_column
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ? 
                    AND TABLE_NAME = ? 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
            `,
                [schemaName, tableName]
            );

            const foreignKeysMap = new Map<string, ForeignKey>();
            for (const row of fkRows) {
                if (!foreignKeysMap.has(row.name)) {
                    foreignKeysMap.set(row.name, {
                        name: row.name,
                        columns: [row.column_name],
                        referencedTable: row.ref_table,
                        referencedColumns: [row.ref_column],
                    });
                } else {
                    const fk = foreignKeysMap.get(row.name)!;
                    fk.columns.push(row.column_name);
                    fk.referencedColumns.push(row.ref_column);
                }
            }

            // Get indexes
            const indexes = await this.getIndexes(connectionId, schemaName, tableName);

            // Get row count
            const [countRows] = await pool.query<mysql.RowDataPacket[]>(
                `SELECT TABLE_ROWS as row_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
                [schemaName, tableName]
            );

            return {
                schema: schemaName,
                name: tableName,
                columns,
                primaryKeys,
                foreignKeys: Array.from(foreignKeysMap.values()),
                indexes,
                rowCount: countRows[0]?.row_count,
            };
        } catch (error: any) {
            logger.error(`Failed to describe MySQL table: ${error.message}`, error);
            throw new Error(`Failed to describe table: ${error.message}`);
        }
    }

    async getIndexes(connectionId: string, schemaName: string, tableName: string): Promise<Index[]> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const [rows] = await pool.query<mysql.RowDataPacket[]>(
                `
                SELECT 
                    INDEX_NAME as name,
                    COLUMN_NAME as column_name,
                    NOT NON_UNIQUE as is_unique,
                    INDEX_TYPE as type
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                ORDER BY INDEX_NAME, SEQ_IN_INDEX
            `,
                [schemaName, tableName]
            );

            const indexMap = new Map<string, Index>();

            for (const row of rows) {
                if (!indexMap.has(row.name)) {
                    indexMap.set(row.name, {
                        name: row.name,
                        columns: [row.column_name],
                        unique: row.is_unique === 1,
                        primary: row.name === 'PRIMARY',
                        type: row.type,
                    });
                } else {
                    indexMap.get(row.name)!.columns.push(row.column_name);
                }
            }

            return Array.from(indexMap.values());
        } catch (error: any) {
            logger.error(`Failed to get MySQL indexes: ${error.message}`, error);
            throw new Error(`Failed to get indexes: ${error.message}`);
        }
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const pool = this.pools.get(request.connectionId);
        if (!pool) {
            throw new Error(`Connection ${request.connectionId} not found`);
        }

        const startTime = Date.now();

        try {
            const [rows, fields] = await pool.query(request.query);

            const queryFields = Array.isArray(fields)
                ? fields.map((field: any) => ({
                    name: field.name,
                    dataType: this.mapMySQLType(field.type),
                }))
                : [];

            const resultRows = Array.isArray(rows) ? rows : [];
            const executionTime = Date.now() - startTime;

            return {
                rows: resultRows.slice(0, request.maxRows || 1000),
                fields: queryFields,
                rowCount: resultRows.length,
                executionTime,
                hasMore: resultRows.length > (request.maxRows || 1000),
            };
        } catch (error: any) {
            logger.error(`MySQL query execution failed: ${error.message}`, error);
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const [rows] = await pool.query(`EXPLAIN ${query}`);
            return {
                plan: rows,
                planText: JSON.stringify(rows, null, 2),
            };
        } catch (error: any) {
            logger.error(`MySQL EXPLAIN failed: ${error.message}`, error);
            throw new Error(`EXPLAIN failed: ${error.message}`);
        }
    }

    async getVersion(connectionId: string): Promise<string> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT VERSION() as version');
            return rows[0].version;
        } catch (error: any) {
            logger.error(`Failed to get MySQL version: ${error.message}`, error);
            throw new Error(`Failed to get version: ${error.message}`);
        }
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const [versionRows] = await pool.query<mysql.RowDataPacket[]>('SELECT VERSION() as version');
            const [userRows] = await pool.query<mysql.RowDataPacket[]>('SELECT USER() as user');
            const [dbRows] = await pool.query<mysql.RowDataPacket[]>('SELECT DATABASE() as db');

            return {
                version: versionRows[0].version,
                serverVersion: versionRows[0].version,
                currentUser: userRows[0].user,
                currentDatabase: dbRows[0].db,
            };
        } catch (error: any) {
            logger.error(`Failed to get MySQL database info: ${error.message}`, error);
            throw new Error(`Failed to get database info: ${error.message}`);
        }
    }

    private mapMySQLType(type: number): string {
        // MySQL field type constants
        const types: { [key: number]: string } = {
            0: 'DECIMAL',
            1: 'TINY',
            2: 'SHORT',
            3: 'LONG',
            4: 'FLOAT',
            5: 'DOUBLE',
            6: 'NULL',
            7: 'TIMESTAMP',
            8: 'LONGLONG',
            9: 'INT24',
            10: 'DATE',
            11: 'TIME',
            12: 'DATETIME',
            13: 'YEAR',
            15: 'VARCHAR',
            16: 'BIT',
            245: 'JSON',
            246: 'NEWDECIMAL',
            247: 'ENUM',
            248: 'SET',
            249: 'TINY_BLOB',
            250: 'MEDIUM_BLOB',
            251: 'LONG_BLOB',
            252: 'BLOB',
            253: 'VAR_STRING',
            254: 'STRING',
            255: 'GEOMETRY',
        };

        return types[type] || 'UNKNOWN';
    }
}

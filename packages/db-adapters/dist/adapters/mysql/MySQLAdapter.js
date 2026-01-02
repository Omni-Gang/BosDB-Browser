"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLAdapter = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
const utils_1 = require("@bosdb/utils");
const logger = new utils_1.Logger('MySQLAdapter');
/**
 * MySQL Database Adapter
 * Implements IDBAdapter for MySQL databases using mysql2
 */
class MySQLAdapter extends IDBAdapter_1.BaseDBAdapter {
    constructor() {
        super(...arguments);
        this.pools = new Map();
    }
    async connect(config) {
        const connectionId = this.generateConnectionId('mysql');
        try {
            const pool = promise_1.default.createPool({
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
            const [versionRows] = await connection.query('SELECT VERSION() as version');
            const version = versionRows[0].version;
            connection.release();
            this.pools.set(connectionId, pool);
            logger.info(`Connected to MySQL: ${config.host}:${config.port}/${config.database}`);
            return {
                connectionId,
                success: true,
                version,
            };
        }
        catch (error) {
            logger.error(`MySQL connection failed: ${error.message}`, error);
            return {
                connectionId: '',
                success: false,
                error: error.message,
            };
        }
    }
    async disconnect(connectionId) {
        const pool = this.pools.get(connectionId);
        if (pool) {
            await pool.end();
            this.pools.delete(connectionId);
            logger.info(`Disconnected from MySQL: ${connectionId}`);
        }
    }
    async testConnection(config) {
        const startTime = Date.now();
        try {
            const connection = await promise_1.default.createConnection({
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
        }
        catch (error) {
            logger.error(`MySQL test connection failed: ${error.message}`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async listSchemas(connectionId) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const [rows] = await pool.query(`
                SELECT 
                    SCHEMA_NAME as name,
                    DEFAULT_CHARACTER_SET_NAME as charset
                FROM information_schema.SCHEMATA
                WHERE SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
                ORDER BY SCHEMA_NAME
            `);
            const schemas = [];
            for (const row of rows) {
                // Get table count for schema
                const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, [row.name]);
                schemas.push({
                    name: row.name,
                    tableCount: countRows[0].count,
                });
            }
            return schemas;
        }
        catch (error) {
            logger.error(`Failed to list MySQL schemas: ${error.message}`, error);
            throw new Error(`Failed to list schemas: ${error.message}`);
        }
    }
    async listTables(connectionId, schemaName) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        const schema = schemaName || 'public';
        try {
            const [rows] = await pool.query(`
                SELECT 
                    TABLE_SCHEMA as schema_name,
                    TABLE_NAME as name,
                    TABLE_TYPE as table_type,
                    TABLE_ROWS as row_count
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME
            `, [schema]);
            return rows.map((row) => ({
                schema: row.schema_name,
                name: row.name,
                type: row.table_type === 'BASE TABLE' ? 'table' : 'view',
                rowCount: row.row_count,
            }));
        }
        catch (error) {
            logger.error(`Failed to list MySQL tables: ${error.message}`, error);
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }
    async describeTable(connectionId, schemaName, tableName) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            // Get columns
            const [columnRows] = await pool.query(`
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
            `, [schemaName, tableName]);
            const columns = columnRows.map((row) => ({
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
            const [fkRows] = await pool.query(`
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
            `, [schemaName, tableName]);
            const foreignKeysMap = new Map();
            for (const row of fkRows) {
                if (!foreignKeysMap.has(row.name)) {
                    foreignKeysMap.set(row.name, {
                        name: row.name,
                        columns: [row.column_name],
                        referencedTable: row.ref_table,
                        referencedColumns: [row.ref_column],
                    });
                }
                else {
                    const fk = foreignKeysMap.get(row.name);
                    fk.columns.push(row.column_name);
                    fk.referencedColumns.push(row.ref_column);
                }
            }
            // Get indexes
            const indexes = await this.getIndexes(connectionId, schemaName, tableName);
            // Get row count
            const [countRows] = await pool.query(`SELECT TABLE_ROWS as row_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`, [schemaName, tableName]);
            return {
                schema: schemaName,
                name: tableName,
                columns,
                primaryKeys,
                foreignKeys: Array.from(foreignKeysMap.values()),
                indexes,
                rowCount: countRows[0]?.row_count,
            };
        }
        catch (error) {
            logger.error(`Failed to describe MySQL table: ${error.message}`, error);
            throw new Error(`Failed to describe table: ${error.message}`);
        }
    }
    async getIndexes(connectionId, schemaName, tableName) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const [rows] = await pool.query(`
                SELECT 
                    INDEX_NAME as name,
                    COLUMN_NAME as column_name,
                    NOT NON_UNIQUE as is_unique,
                    INDEX_TYPE as type
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                ORDER BY INDEX_NAME, SEQ_IN_INDEX
            `, [schemaName, tableName]);
            const indexMap = new Map();
            for (const row of rows) {
                if (!indexMap.has(row.name)) {
                    indexMap.set(row.name, {
                        name: row.name,
                        columns: [row.column_name],
                        unique: row.is_unique === 1,
                        primary: row.name === 'PRIMARY',
                        type: row.type,
                    });
                }
                else {
                    indexMap.get(row.name).columns.push(row.column_name);
                }
            }
            return Array.from(indexMap.values());
        }
        catch (error) {
            logger.error(`Failed to get MySQL indexes: ${error.message}`, error);
            throw new Error(`Failed to get indexes: ${error.message}`);
        }
    }
    async executeQuery(request) {
        const pool = this.pools.get(request.connectionId);
        if (!pool) {
            throw new Error(`Connection ${request.connectionId} not found`);
        }
        const startTime = Date.now();
        try {
            const [rows, fields] = await pool.query(request.query);
            const queryFields = Array.isArray(fields)
                ? fields.map((field) => ({
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
        }
        catch (error) {
            logger.error(`MySQL query execution failed: ${error.message}`, error);
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }
    async explainQuery(connectionId, query) {
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
        }
        catch (error) {
            logger.error(`MySQL EXPLAIN failed: ${error.message}`, error);
            throw new Error(`EXPLAIN failed: ${error.message}`);
        }
    }
    async getVersion(connectionId) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const [rows] = await pool.query('SELECT VERSION() as version');
            return rows[0].version;
        }
        catch (error) {
            logger.error(`Failed to get MySQL version: ${error.message}`, error);
            throw new Error(`Failed to get version: ${error.message}`);
        }
    }
    async getDatabaseInfo(connectionId) {
        const pool = this.pools.get(connectionId);
        if (!pool) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const [versionRows] = await pool.query('SELECT VERSION() as version');
            const [userRows] = await pool.query('SELECT USER() as user');
            const [dbRows] = await pool.query('SELECT DATABASE() as db');
            return {
                version: versionRows[0].version,
                serverVersion: versionRows[0].version,
                currentUser: userRows[0].user,
                currentDatabase: dbRows[0].db,
            };
        }
        catch (error) {
            logger.error(`Failed to get MySQL database info: ${error.message}`, error);
            throw new Error(`Failed to get database info: ${error.message}`);
        }
    }
    mapMySQLType(type) {
        // MySQL field type constants
        const types = {
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
exports.MySQLAdapter = MySQLAdapter;
//# sourceMappingURL=MySQLAdapter.js.map
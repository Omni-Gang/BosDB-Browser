import sqlite3 from 'sqlite3';
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
    DatabaseInfo,
    ExplainResult,
} from '@bosdb/core';

/**
 * SQLite Database Adapter
 * Implements IDBAdapter for SQLite databases using the pre-compiled sqlite3 driver
 */
export class SQLiteAdapter extends BaseDBAdapter {
    private connections: Map<string, sqlite3.Database> = new Map();

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = config.id || this.generateConnectionId('sqlite');
        const dbPath = config.database || ':memory:';

        return new Promise((resolve) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    return resolve({
                        connectionId: '',
                        success: false,
                        error: err.message
                    });
                }

                this.connections.set(connectionId, db);
                resolve({
                    connectionId,
                    success: true,
                    version: 'SQLite 3'
                });
            });
        });
    }

    async disconnect(connectionId: string): Promise<void> {
        const db = this.connections.get(connectionId);
        if (db) {
            return new Promise((resolve, reject) => {
                db.close((err) => {
                    if (err) reject(err);
                    else {
                        this.connections.delete(connectionId);
                        resolve();
                    }
                });
            });
        }
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const startTime = Date.now();
        const dbPath = config.database || ':memory:';

        return new Promise((resolve) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    return resolve({
                        success: false,
                        error: err.message,
                        latency: Date.now() - startTime
                    });
                }
                db.close();
                resolve({
                    success: true,
                    message: 'SQLite connection successful',
                    latency: Date.now() - startTime
                });
            });
        });
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const db = this.connections.get(request.connectionId);
        if (!db) throw new Error(`Connection ${request.connectionId} not found`);

        const startTime = Date.now();
        const sql = request.query.trim();

        return new Promise((resolve, reject) => {
            const isSelect = sql.toUpperCase().startsWith('SELECT') || sql.toUpperCase().startsWith('PRAGMA');

            if (isSelect) {
                db.all(sql, [], (err, rows: any[]) => {
                    if (err) return reject(err);

                    const fields: any[] = rows.length > 0 ? Object.keys(rows[0]).map(name => ({
                        name,
                        dataType: typeof rows[0][name]
                    })) : [];

                    resolve({
                        rows: rows.slice(0, request.maxRows || 1000),
                        fields,
                        rowCount: rows.length,
                        executionTime: Date.now() - startTime,
                        hasMore: rows.length > (request.maxRows || 1000)
                    });
                });
            } else {
                db.run(sql, [], function (err) {
                    if (err) return reject(err);
                    resolve({
                        rows: [],
                        fields: [],
                        rowCount: this.changes,
                        executionTime: Date.now() - startTime,
                        hasMore: false
                    });
                });
            }
        });
    }

    async listSchemas(_connectionId: string): Promise<Schema[]> {
        return [{ name: 'main', tableCount: 0 }];
    }

    async listTables(connectionId: string, _schemaName?: string): Promise<Table[]> {
        const result = await this.executeQuery({
            connectionId,
            query: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            maxRows: 1000
        });

        return result.rows.map(row => ({
            schema: 'main',
            name: row.name,
            type: 'table'
        }));
    }

    async describeTable(connectionId: string, schemaName: string, tableName: string): Promise<TableMetadata> {
        const result = await this.executeQuery({
            connectionId,
            query: `PRAGMA table_info(${tableName})`,
            maxRows: 1000
        });

        const columns: Column[] = result.rows.map(row => ({
            name: row.name,
            dataType: row.type,
            nullable: row.notnull === 0,
            defaultValue: row.dflt_value,
            isPrimaryKey: row.pk === 1,
            isForeignKey: false
        }));

        return {
            schema: 'main',
            name: tableName,
            columns,
            primaryKeys: columns.filter(c => c.isPrimaryKey).map(c => c.name),
            foreignKeys: [],
            indexes: await this.getIndexes(connectionId, schemaName, tableName)
        };
    }

    async getIndexes(connectionId: string, _schemaName: string, tableName: string): Promise<Index[]> {
        const result = await this.executeQuery({
            connectionId,
            query: `PRAGMA index_list(${tableName})`,
            maxRows: 1000
        });

        return result.rows.map(row => ({
            name: row.name,
            columns: [],
            unique: row.unique === 1,
            primary: row.origin === 'pk'
        }));
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const result = await this.executeQuery({
            connectionId,
            query: `EXPLAIN QUERY PLAN ${query}`,
            maxRows: 1000
        });

        return {
            plan: result.rows,
            planText: result.rows.map(row => row.detail).join('\n')
        };
    }

    async getVersion(_connectionId: string): Promise<string> {
        return 'SQLite 3';
    }

    async getDatabaseInfo(_connectionId: string): Promise<DatabaseInfo> {
        return {
            version: 'SQLite 3',
            currentDatabase: 'main'
        };
    }
}

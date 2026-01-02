import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import type { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, Schema, Table, TableMetadata, Index, DatabaseInfo, ExplainResult } from '@bosdb/core';
/**
 * Redis Database Adapter
 * Redis is a key-value store, not a traditional SQL database
 * Query format: JSON with Redis commands
 * Example: {"command": "GET", "args": ["key"]}
 */
export declare class RedisAdapter extends BaseDBAdapter {
    private clients;
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    listSchemas(connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, schemaName?: string): Promise<Table[]>;
    describeTable(connectionId: string, schemaName: string, tableName: string): Promise<TableMetadata>;
    getIndexes(_connectionId: string, _schemaName: string, _tableName: string): Promise<Index[]>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    explainQuery(_connectionId: string, _query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
}
//# sourceMappingURL=RedisAdapter.d.ts.map
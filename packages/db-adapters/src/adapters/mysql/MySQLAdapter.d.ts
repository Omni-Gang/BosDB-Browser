import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import type { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, Schema, Table, TableMetadata, Index, DatabaseInfo, ExplainResult } from '@bosdb/core';
/**
 * MySQL Database Adapter
 * Implements IDBAdapter for MySQL databases using mysql2
 */
export declare class MySQLAdapter extends BaseDBAdapter {
    private pools;
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    listSchemas(connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, schemaName?: string): Promise<Table[]>;
    describeTable(connectionId: string, schemaName: string, tableName: string): Promise<TableMetadata>;
    getIndexes(connectionId: string, schemaName: string, tableName: string): Promise<Index[]>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
    private mapMySQLType;
}
//# sourceMappingURL=MySQLAdapter.d.ts.map
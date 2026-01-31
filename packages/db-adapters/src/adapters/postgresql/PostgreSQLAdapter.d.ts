import type { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, ExplainResult, Schema, Table, TableMetadata, Index, DatabaseInfo } from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
/**
 * PostgreSQL database adapter
 * Implements full PostgreSQL support with connection pooling and security
 */
export declare class PostgreSQLAdapter extends BaseDBAdapter {
    private pools;
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    listSchemas(connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, schema?: string): Promise<Table[]>;
    describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]>;
    explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
    private getColumns;
    private getForeignKeys;
    private mapDataType;
}
//# sourceMappingURL=PostgreSQLAdapter.d.ts.map
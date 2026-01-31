import { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, ExplainResult, Schema, Table, TableMetadata, Index, DatabaseInfo } from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
/**
 * Microsoft SQL Server Database Adapter
 */
export declare class SQLServerAdapter extends BaseDBAdapter {
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    listSchemas(connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, schema?: string): Promise<Table[]>;
    describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
}
//# sourceMappingURL=SQLServerAdapter.d.ts.map
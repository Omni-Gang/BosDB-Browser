import { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, ExplainResult, Schema, Table, TableMetadata, Index, DatabaseInfo } from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
/**
 * Apache Cassandra Database Adapter
 */
export declare class CassandraAdapter extends BaseDBAdapter {
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    listSchemas(connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, schema?: string): Promise<Table[]>;
    describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    explainQuery(_connectionId: string, _query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
}
//# sourceMappingURL=CassandraAdapter.d.ts.map
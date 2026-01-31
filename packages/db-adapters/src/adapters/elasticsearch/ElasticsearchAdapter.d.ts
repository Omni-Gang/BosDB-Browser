import { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, ExplainResult, Schema, Table, TableMetadata, Index, DatabaseInfo } from '@bosdb/core';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
/**
 * Elasticsearch Database Adapter
 */
export declare class ElasticsearchAdapter extends BaseDBAdapter {
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    disconnect(connectionId: string): Promise<void>;
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    listSchemas(_connectionId: string): Promise<Schema[]>;
    listTables(connectionId: string, _schema?: string): Promise<Table[]>;
    describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    getIndexes(_connectionId: string, _schema: string, _table: string): Promise<Index[]>;
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    getVersion(connectionId: string): Promise<string>;
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
}
//# sourceMappingURL=ElasticsearchAdapter.d.ts.map
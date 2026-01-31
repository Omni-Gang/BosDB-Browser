import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import type { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, Schema, Table, TableMetadata, Index, DatabaseInfo, ExplainResult } from '@bosdb/core';
/**
 * MongoDB Database Adapter
 * Implements IDBAdapter for MongoDB databases
 *
 * Note: MongoDB is document-oriented (NoSQL), so some SQL concepts don't apply:
 * - Schemas -> Databases
 * - Tables -> Collections
 * - Columns -> Document fields (dynamic)
 * - Query -> Aggregation pipelines or find operations
 */
export declare class MongoDBAdapter extends BaseDBAdapter {
    private clients;
    private databases;
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
    /**
     * Infer MongoDB field type from sample documents
     */
    private inferMongoType;
}
//# sourceMappingURL=MongoDBAdapter.d.ts.map
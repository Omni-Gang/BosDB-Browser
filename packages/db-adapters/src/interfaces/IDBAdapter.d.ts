import type { ConnectionConfig, ConnectionResult, TestResult, QueryRequest, QueryResult, ExplainResult, Schema, Table, TableMetadata, Index, DatabaseInfo } from '@bosdb/core';
/**
 * Core database adapter interface
 * All database-specific adapters must implement this interface
 */
export interface IDBAdapter {
    /**
     * Establish a connection to the database
     * @param config Connection configuration
     * @returns Connection result with connection ID
     */
    connect(config: ConnectionConfig): Promise<ConnectionResult>;
    /**
     * Close a database connection
     * @param connectionId Connection ID to close
     */
    disconnect(connectionId: string): Promise<void>;
    /**
     * Test database connection without establishing a persistent connection
     * @param config Connection configuration
     * @returns Test result with success status
     */
    testConnection(config: ConnectionConfig): Promise<TestResult>;
    /**
     * List all schemas in the database
     * @param connectionId Connection ID
     * @returns Array of schemas
     */
    listSchemas(connectionId: string): Promise<Schema[]>;
    /**
     * List all tables in a schema
     * @param connectionId Connection ID
     * @param schema Schema name (optional, defaults to public/default schema)
     * @returns Array of tables
     */
    listTables(connectionId: string, schema?: string): Promise<Table[]>;
    /**
     * Get detailed metadata about a table
     * @param connectionId Connection ID
     * @param schema Schema name
     * @param table Table name
     * @returns Table metadata including columns, keys, and indexes
     */
    describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    /**
     * Get indexes for a table
     * @param connectionId Connection ID
     * @param schema Schema name
     * @param table Table name
     * @returns Array of indexes
     */
    getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]>;
    /**
     * Execute a query against the database
     * @param request Query request with query string and options
     * @returns Query result with rows and metadata
     */
    executeQuery(request: QueryRequest): Promise<QueryResult>;
    /**
     * Get query execution plan (for supported databases)
     * @param connectionId Connection ID
     * @param query Query string
     * @returns Query execution plan
     */
    explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    /**
     * Get database version
     * @param connectionId Connection ID
     * @returns Database version string
     */
    getVersion(connectionId: string): Promise<string>;
    /**
     * Get database information and metadata
     * @param connectionId Connection ID
     * @returns Database info
     */
    getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
}
/**
 * Base adapter class with common functionality
 */
export declare abstract class BaseDBAdapter implements IDBAdapter {
    protected connectionMap: Map<string, any>;
    abstract connect(config: ConnectionConfig): Promise<ConnectionResult>;
    abstract disconnect(connectionId: string): Promise<void>;
    abstract testConnection(config: ConnectionConfig): Promise<TestResult>;
    abstract listSchemas(connectionId: string): Promise<Schema[]>;
    abstract listTables(connectionId: string, schema?: string): Promise<Table[]>;
    abstract describeTable(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
    abstract getIndexes(connectionId: string, schema: string, table: string): Promise<Index[]>;
    abstract executeQuery(request: QueryRequest): Promise<QueryResult>;
    abstract explainQuery(connectionId: string, query: string): Promise<ExplainResult>;
    abstract getVersion(connectionId: string): Promise<string>;
    abstract getDatabaseInfo(connectionId: string): Promise<DatabaseInfo>;
    /**
     * Generate a unique connection ID
     */
    protected generateConnectionId(prefix: string): string;
    /**
     * Get connection from map
     */
    protected getConnection<T>(connectionId: string): T;
    /**
     * Check if connection exists
     */
    protected hasConnection(connectionId: string): boolean;
}
//# sourceMappingURL=IDBAdapter.d.ts.map
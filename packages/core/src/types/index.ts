/**
 * Core type definitions for BosDB
 */

// Database Types
export type DatabaseType = 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'redis' | 'cockroachdb';

export type DatabaseStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// User & Workspace Types
export interface User {
    id: string;
    email: string;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    createdAt: Date;
}

// Connection Types
export interface Connection {
    id: string;
    workspaceId: string;
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    database: string;
    username: string;
    readOnly: boolean;
    status: DatabaseStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConnectionConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    readOnly?: boolean;
    connectionTimeout?: number;
    queryTimeout?: number;
    maxPoolSize?: number;
}

export interface ConnectionResult {
    connectionId: string;
    success: boolean;
    version?: string;
    error?: string;
}

export interface TestResult {
    success: boolean;
    message?: string;
    error?: string;
    latency?: number;
}

// Query Types
export interface QueryRequest {
    connectionId: string;
    query: string;
    timeout?: number;
    maxRows?: number;
    streamResults?: boolean;
}

export interface QueryResult {
    rows: any[];
    fields: QueryField[];
    rowCount: number;
    executionTime: number;
    hasMore?: boolean;
    cursor?: string;
}

export interface QueryField {
    name: string;
    dataType: string;
    tableID?: number;
    columnID?: number;
    nullable?: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
}

export interface ExplainResult {
    plan: any;
    executionTime?: number;
    totalCost?: number;
    planText?: string;
}

// Schema Types
export interface Schema {
    name: string;
    owner?: string;
    tableCount?: number;
}

export interface Table {
    schema: string;
    name: string;
    type: 'table' | 'view' | 'materialized_view';
    rowCount?: number;
    size?: string;
    comment?: string;
}

export interface TableMetadata {
    schema: string;
    name: string;
    columns: Column[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
    indexes: Index[];
    rowCount?: number;
    size?: string;
}

export interface Column {
    name: string;
    dataType: string;
    maxLength?: number;
    precision?: number;
    scale?: number;
    nullable: boolean;
    defaultValue?: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    comment?: string;
}

export interface Index {
    name: string;
    columns: string[];
    unique: boolean;
    primary: boolean;
    type?: string;
}

export interface ForeignKey {
    name: string;
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
    onDelete?: string;
    onUpdate?: string;
}

// Saved Query Types
export interface SavedQuery {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
}

// Query History Types
export interface QueryHistory {
    id: string;
    workspaceId: string;
    connectionId: string;
    query: string;
    executionTime: number;
    rowCount: number;
    success: boolean;
    error?: string;
    executedBy: string;
    executedAt: Date;
}

// Database Info
export interface DatabaseInfo {
    version: string;
    serverVersion?: string;
    uptime?: number;
    currentDatabase?: string;
    currentUser?: string;
    encoding?: string;
    collation?: string;
}

// Error Types
export class BosDBError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: any
    ) {
        super(message);
        this.name = 'BosDBError';
    }
}

export class ConnectionError extends BosDBError {
    constructor(message: string, details?: any) {
        super(message, 'CONNECTION_ERROR', details);
        this.name = 'ConnectionError';
    }
}

export class QueryExecutionError extends BosDBError {
    constructor(message: string, details?: any) {
        super(message, 'QUERY_EXECUTION_ERROR', details);
        this.name = 'QueryExecutionError';
    }
}

export class SecurityError extends BosDBError {
    constructor(message: string, details?: any) {
        super(message, 'SECURITY_ERROR', details);
        this.name = 'SecurityError';
    }
}

export class ValidationError extends BosDBError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

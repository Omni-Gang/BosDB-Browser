/**
 * Core type definitions for BosDB Database Debugger
 */
export interface DebugSessionConfig {
    database: string;
    debugLevel: DebugLevel;
    autoBreakOnError: boolean;
    maxHistorySize: number;
    enableTimeTravel: boolean;
}
export declare enum DebugLevel {
    PRODUCTION = 0,
    MINIMAL = 1,
    NORMAL = 2,
    VERBOSE = 3,
    MAXIMUM = 4
}
export interface DebugSession {
    id: string;
    userId: string;
    connectionId: string;
    createdAt: Date;
    config: DebugSessionConfig;
    state: SessionState;
    metadata: SessionMetadata;
}
export interface SessionState {
    status: 'running' | 'paused' | 'stopped' | 'error';
    currentExecutionPoint?: ExecutionPoint;
    activeBreakpoints: Breakpoint[];
    callStack: StackFrame[];
}
export interface SessionMetadata {
    totalQueries: number;
    breakpointHits: number;
    totalExecutionTime: number;
}
export interface ExecutionPoint {
    id: string;
    timestamp: Date;
    queryId?: string;
    stage?: QueryStage;
    planNodeId?: string;
    lineNumber?: number;
    procedureId?: string;
}
export type QueryStage = 'parse' | 'analyze' | 'rewrite' | 'plan' | 'execute' | 'complete';
export interface Breakpoint {
    id: string;
    sessionId: string;
    type: BreakpointType;
    enabled: boolean;
    hitCount: number;
    lastHit?: Date;
    condition?: string;
    logMessage?: string;
}
export type BreakpointType = 'line' | 'query' | 'data' | 'transaction' | 'lock' | 'plan' | 'exception';
export interface LineBreakpoint extends Breakpoint {
    type: 'line';
    procedureId: string;
    lineNumber: number;
}
export interface QueryBreakpoint extends Breakpoint {
    type: 'query';
    stage: QueryStage;
    queryPattern?: RegExp;
}
export interface DataBreakpoint extends Breakpoint {
    type: 'data';
    expression: string;
    changeType: 'read' | 'write' | 'delete';
}
export interface TransactionBreakpoint extends Breakpoint {
    type: 'transaction';
    event: 'begin' | 'commit' | 'rollback' | 'deadlock';
    isolationLevel?: IsolationLevel;
}
export interface LockBreakpoint extends Breakpoint {
    type: 'lock';
    event: 'acquire' | 'wait' | 'release';
    lockType?: 'row' | 'table' | 'page';
}
export interface PlanBreakpoint extends Breakpoint {
    type: 'plan';
    nodeType?: string;
    condition?: string;
}
export interface ExecutionContext {
    sessionId: string;
    queryId: string;
    query: string;
    parameters: any[];
    startTime: Date;
    userId: string;
    connectionId: string;
    executionPoint: ExecutionPoint;
    variables: Map<string, any>;
    transactionId?: string;
}
export interface StackFrame {
    id: number;
    name: string;
    source?: {
        path: string;
        line: number;
        column: number;
    };
    scopes: Scope[];
}
export interface Scope {
    name: string;
    variablesReference: number;
    expensive: boolean;
}
export interface Variable {
    name: string;
    value: any;
    type: string;
    scope: 'local' | 'session' | 'global';
    mutable: boolean;
    children?: Variable[];
}
export type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
export interface TransactionState {
    txnId: string;
    startTime: Date;
    isolationLevel: IsolationLevel;
    status: 'active' | 'preparing' | 'prepared' | 'committing' | 'committed' | 'aborting' | 'aborted';
    locksHeld: Lock[];
    locksWaiting: Lock[];
    modifiedRows: {
        table: string;
        rowIds: string[];
    }[];
}
export interface Lock {
    id: string;
    txnId: string;
    lockType: 'row' | 'page' | 'table' | 'advisory';
    lockMode: 'shared' | 'exclusive' | 'update';
    resourceType: string;
    resourceId: string;
    status: 'acquired' | 'waiting' | 'released';
    acquiredAt?: Date;
    waitingSince?: Date;
    releasedAt?: Date;
    blockedBy?: string[];
    blocking?: string[];
}
export interface QueryExecution {
    queryId: string;
    sql: string;
    parameters: any[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'paused';
    result?: QueryResult;
    error?: Error;
}
export interface QueryResult {
    rows: any[];
    rowCount: number;
    fields: Field[];
    executionPlan?: ExecutionPlan;
}
export interface Field {
    name: string;
    type: string;
    nullable: boolean;
}
export type StatementRunner = (sql: string, params?: any[]) => Promise<QueryResult>;
export interface ExecutionPlan {
    rootNode: PlanNode;
    totalCost: number;
    estimatedRows: number;
}
export interface PlanNode {
    id: string;
    type: string;
    operation: string;
    estimatedRows: number;
    estimatedCost: number;
    actualRows?: number;
    actualCost?: number;
    children: PlanNode[];
    metadata: Record<string, any>;
}
export interface Snapshot {
    id: string;
    sessionId: string;
    timestamp: Date;
    executionPoint: ExecutionPoint;
    transactionState?: TransactionState;
    variables: Map<string, any>;
    storage: {
        storagePath: string;
        compressed: boolean;
        sizeBytes: number;
    };
}
export type DebugEvent = SessionCreatedEvent | StoppedEvent | ContinuedEvent | BreakpointHitEvent | StateChangedEvent | OutputEvent | ErrorEvent;
export interface SessionCreatedEvent {
    type: 'sessionCreated';
    sessionId: string;
}
export interface StoppedEvent {
    type: 'stopped';
    reason: StopReason;
    details: any;
}
export type StopReason = 'breakpoint' | 'step' | 'pause' | 'exception' | 'error';
export interface ContinuedEvent {
    type: 'continued';
    sessionId: string;
}
export interface BreakpointHitEvent {
    type: 'breakpointHit';
    breakpoint: Breakpoint;
    context: ExecutionContext;
}
export interface StateChangedEvent {
    type: 'stateChanged';
    state: SessionState;
}
export interface OutputEvent {
    type: 'output';
    category: 'stdout' | 'stderr' | 'log';
    output: string;
}
export interface ErrorEvent {
    type: 'error';
    error: DebugError;
}
export interface DebugError {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
    suggestedAction?: string;
}
export interface DebugOperation {
    id: string;
    sessionId: string;
    type: 'DML' | 'DDL' | 'TRANSACTION' | 'PROCEDURE';
    sql: string;
    inverseSql?: string;
    timestamp: Date;
    metadata: Record<string, any>;
}
export interface ExecutionTimeline {
    sessionId: string;
    operations: DebugOperation[];
    currentIndex: number;
}
export interface TimePoint {
    timestamp: Date;
    operationId: string;
    snapshotId?: string;
}
export interface ReplayOptions {
    mode: 'sandbox' | 'live';
    from: TimePoint;
    to: TimePoint;
    speed?: number;
}

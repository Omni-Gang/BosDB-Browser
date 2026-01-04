/**
 * Execution Controller
 * Controls query execution flow with pause/resume capabilities
 */
import { EventEmitter } from 'eventemitter3';
import { ExecutionPoint, QueryExecution, QueryResult } from './types';
import { BreakpointManager } from './breakpoint-manager';
import { SessionManager } from './session-manager';
export type ExecutionMode = 'running' | 'paused' | 'stepping' | 'stopped';
export declare class ExecutionController extends EventEmitter {
    private breakpointManager;
    private sessionManager;
    private executionMode;
    private executionHistory;
    private pendingExecutions;
    constructor(breakpointManager: BreakpointManager, sessionManager: SessionManager);
    /**
     * Execute a query with debug instrumentation
     */
    executeQuery(sessionId: string, query: string, parameters: any[] | undefined, runner: (sql: string, params?: any[]) => Promise<QueryResult>): Promise<QueryResult>;
    /**
     * Execute with instrumentation at each stage
     */
    private execWithInstrumentation;
    /**
     * Simulate stage execution (placeholder for actual execution)
     */
    private simulateStageExecution;
    /**
     * Pause execution
     */
    pause(sessionId: string, executionPoint: ExecutionPoint, reason: string, details?: any): Promise<void>;
    /**
     * Resume execution
     */
    resume(sessionId: string): void;
    /**
     * Step over (execute to next statement)
     */
    stepOver(sessionId: string): Promise<void>;
    /**
     * Step into (enter procedure/function)
     */
    stepInto(sessionId: string): Promise<void>;
    /**
     * Step out (exit current procedure/function)
     */
    stepOut(sessionId: string): Promise<void>;
    /**
     * Rewind execution (execute inverse SQL of last statement)
     */
    rewind(sessionId: string, _runner: (sql: string) => Promise<any>): Promise<void>;
    /**
     * Wait for resume signal
     */
    private waitForResume;
    /**
     * Record execution point in history
     */
    private recordExecutionPoint;
    /**
     * Get execution history
     */
    getExecutionHistory(sessionId: string): ExecutionPoint[];
    /**
     * Get current execution point
     */
    getCurrentExecutionPoint(sessionId: string): ExecutionPoint | undefined;
    /**
     * Get active queries
     */
    getActiveQueries(): QueryExecution[];
    /**
     * Clear history for session
     */
    clearHistory(sessionId: string): void;
}

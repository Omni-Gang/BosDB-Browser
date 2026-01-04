/**
 * Debug Engine
 * Main entry point that coordinates all debugger components
 */
import { EventEmitter } from 'eventemitter3';
import { DebugSession, DebugSessionConfig, Breakpoint, BreakpointType, QueryResult, Variable, Scope, TransactionState, ExecutionPoint } from './types';
export declare class DebugEngine extends EventEmitter {
    private sessionManager;
    private breakpointManager;
    private executionController;
    private stateInspector;
    private timeTravelEngine;
    constructor();
    /**
     * Create a new debug session
     */
    createSession(userId: string, connectionId: string, config?: Partial<DebugSessionConfig>): DebugSession;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): DebugSession | undefined;
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): DebugSession[];
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean;
    /**
     * Execute a query with debugging
     */
    executeQuery(sessionId: string, query: string, parameters?: any[], runner?: (sql: string, params?: any[]) => Promise<QueryResult>): Promise<QueryResult>;
    /**
     * Pause execution
     */
    pause(sessionId: string): void;
    /**
     * Resume execution
     */
    resume(sessionId: string): void;
    /**
     * Step over
     */
    stepOver(sessionId: string): Promise<void>;
    /**
     * Step into
     */
    stepInto(sessionId: string): Promise<void>;
    /**
     * Step out
     */
    stepOut(sessionId: string): Promise<void>;
    /**
     * Rewind step (reverse execution)
     */
    rewind(sessionId: string, runner: (sql: string) => Promise<any>): Promise<void>;
    /**
     * Get execution history
     */
    getExecutionHistory(sessionId: string): ExecutionPoint[];
    /**
     * Set a breakpoint
     */
    setBreakpoint(sessionId: string, type: BreakpointType, config: Partial<Breakpoint>): Breakpoint;
    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean;
    /**
     * Enable/disable a breakpoint
     */
    toggleBreakpoint(breakpointId: string, enabled: boolean): boolean;
    /**
     * Get all breakpoints for a session
     */
    getBreakpoints(sessionId: string): Breakpoint[];
    /**
     * Get variables in a scope
     */
    getVariables(sessionId: string, scope: Scope): Variable[];
    /**
     * Get session variables
     */
    getSessionVariables(sessionId: string): Variable[];
    /**
     * Get transaction state
     */
    getTransactionState(txnId: string): TransactionState | undefined;
    /**
     * Get all active transactions
     */
    getActiveTransactions(): TransactionState[];
    /**
     * Detect deadlocks
     */
    detectDeadlocks(): {
        cycles: string[][];
        count: number;
    };
    /**
     * Get global statistics
     */
    getStatistics(): {
        sessions: {
            totalSections: number;
            byStatus: Map<import("./types").SessionState["status"], number>;
            byUser: Map<string, number>;
            totalQueries: number;
            totalBreakpointHits: number;
        };
        state: {
            activeTransactions: number;
            blockedTransactions: number;
            totalLocks: number;
            detectedDeadlocks: number;
        };
    };
    /**
     * Get session-specific statistics
     */
    getSessionStatistics(sessionId: string): {
        breakpoints: {
            total: number;
            enabled: number;
            byType: Map<BreakpointType, number>;
            totalHits: number;
        };
        executionPoints: number;
    };
    /**
     * Forward events from child managers
     */
    private forwardEvents;
}
export * from './types';
export { SessionManager } from './session-manager';
export { BreakpointManager } from './breakpoint-manager';
export { ExecutionController } from './execution-controller';
export { StateInspector } from './state-inspector';

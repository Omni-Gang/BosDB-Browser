/**
 * Debug Engine
 * Main entry point that coordinates all debugger components
 */

import { EventEmitter } from 'eventemitter3';
import { SessionManager } from './session-manager';
import { BreakpointManager } from './breakpoint-manager';
import { ExecutionController } from './execution-controller';
import { StateInspector } from './state-inspector';
import { TimeTravelEngine } from './time-travel';
import {
    DebugSession,
    DebugSessionConfig,
    Breakpoint,
    BreakpointType,
    QueryResult,
    Variable,
    Scope,
    TransactionState,
    ExecutionPoint,
} from './types';

export class DebugEngine extends EventEmitter {
    private sessionManager: SessionManager;
    private breakpointManager: BreakpointManager;
    private executionController: ExecutionController;
    private stateInspector: StateInspector;
    // private _timeTravelEngine: TimeTravelEngine;

    constructor() {
        super();

        // Initialize managers
        this.sessionManager = new SessionManager();
        this.breakpointManager = new BreakpointManager();
        this.stateInspector = new StateInspector();
        // this._timeTravelEngine = new TimeTravelEngine();
        this.executionController = new ExecutionController(
            this.breakpointManager,
            this.sessionManager
        );

        // Forward events
        this.forwardEvents();
    }

    // ========== Session Management ==========

    /**
     * Create a new debug session
     */
    createSession(
        userId: string,
        connectionId: string,
        config?: Partial<DebugSessionConfig>
    ): DebugSession {
        return this.sessionManager.createSession(userId, connectionId, config);
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): DebugSession | undefined {
        return this.sessionManager.getSession(sessionId);
    }

    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): DebugSession[] {
        return this.sessionManager.getUserSessions(userId);
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean {
        // Clean up all related data
        this.breakpointManager.clearSessionBreakpoints(sessionId);
        this.executionController.clearHistory(sessionId);
        this.stateInspector.clearSessionState(sessionId);

        return this.sessionManager.deleteSession(sessionId);
    }

    // ========== Execution Control ==========

    /**
     * Execute a query with debugging
     */
    async executeQuery(
        sessionId: string,
        query: string,
        parameters?: any[],
        runner?: (sql: string, params?: any[]) => Promise<QueryResult>
    ): Promise<QueryResult> {
        if (!runner) throw new Error('StatementRunner is required for execution');
        return this.executionController.executeQuery(sessionId, query, parameters, runner);
    }

    /**
     * Pause execution
     */
    pause(sessionId: string): void {
        const execPoint = this.executionController.getCurrentExecutionPoint(sessionId);
        if (execPoint) {
            this.executionController.pause(sessionId, execPoint, 'user_requested');
        }
    }

    /**
     * Resume execution
     */
    resume(sessionId: string): void {
        this.executionController.resume(sessionId);
    }

    /**
     * Step over
     */
    async stepOver(sessionId: string): Promise<void> {
        await this.executionController.stepOver(sessionId);
    }

    /**
     * Step into
     */
    async stepInto(sessionId: string): Promise<void> {
        await this.executionController.stepInto(sessionId);
    }

    /**
     * Step out
     */
    async stepOut(sessionId: string): Promise<void> {
        await this.executionController.stepOut(sessionId);
    }

    /**
     * Rewind step (reverse execution)
     */
    async rewind(sessionId: string, runner: (sql: string) => Promise<any>): Promise<void> {
        return this.executionController.rewind(sessionId, runner);
    }

    /**
     * Get execution history
     */
    getExecutionHistory(sessionId: string): ExecutionPoint[] {
        return this.executionController.getExecutionHistory(sessionId);
    }

    // ========== Breakpoint Management ==========

    /**
     * Set a breakpoint
     */
    setBreakpoint(
        sessionId: string,
        type: BreakpointType,
        config: Partial<Breakpoint>
    ): Breakpoint {
        return this.breakpointManager.createBreakpoint(sessionId, type, config);
    }

    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean {
        return this.breakpointManager.removeBreakpoint(breakpointId);
    }

    /**
     * Enable/disable a breakpoint
     */
    toggleBreakpoint(breakpointId: string, enabled: boolean): boolean {
        return this.breakpointManager.setBreakpointEnabled(breakpointId, enabled);
    }

    /**
     * Get all breakpoints for a session
     */
    getBreakpoints(sessionId: string): Breakpoint[] {
        return this.breakpointManager.getBreakpointsForSession(sessionId);
    }

    // ========== State Inspection ==========

    /**
     * Get variables in a scope
     */
    getVariables(sessionId: string, scope: Scope): Variable[] {
        return this.stateInspector.getVariables(sessionId, scope);
    }

    /**
     * Get session variables
     */
    getSessionVariables(sessionId: string): Variable[] {
        return this.stateInspector.getSessionVariables(sessionId);
    }

    /**
     * Get transaction state
     */
    getTransactionState(txnId: string): TransactionState | undefined {
        return this.stateInspector.getTransactionState(txnId);
    }

    /**
     * Get all active transactions
     */
    getActiveTransactions(): TransactionState[] {
        return this.stateInspector.getActiveTransactions();
    }

    /**
     * Detect deadlocks
     */
    detectDeadlocks(): { cycles: string[][]; count: number } {
        return this.stateInspector.detectDeadlocks();
    }

    // ========== Statistics ==========

    /**
     * Get global statistics
     */
    getStatistics() {
        const sessionStats = this.sessionManager.getStatistics();
        const stateStats = this.stateInspector.getStatistics();

        return {
            sessions: sessionStats,
            state: stateStats,
        };
    }

    /**
     * Get session-specific statistics
     */
    getSessionStatistics(sessionId: string) {
        const breakpointStats = this.breakpointManager.getStatistics(sessionId);
        const execHistory = this.executionController.getExecutionHistory(sessionId);

        return {
            breakpoints: breakpointStats,
            executionPoints: execHistory.length,
        };
    }

    // ========== Event Forwarding ==========

    /**
     * Forward events from child managers
     */
    private forwardEvents(): void {
        // Session events
        this.sessionManager.on('sessionCreated', (session) => {
            this.emit('sessionCreated', session);
        });

        this.sessionManager.on('sessionStateChanged', (session) => {
            this.emit('sessionStateChanged', session);
        });

        this.sessionManager.on('sessionDeleted', (session) => {
            this.emit('sessionDeleted', session);
        });

        // Breakpoint events
        this.breakpointManager.on('breakpointCreated', (breakpoint) => {
            this.emit('breakpointCreated', breakpoint);
        });

        this.breakpointManager.on('breakpointHit', (breakpoint, context) => {
            this.emit('breakpointHit', { breakpoint, context });
        });

        this.breakpointManager.on('breakpointRemoved', (breakpoint) => {
            this.emit('breakpointRemoved', breakpoint);
        });

        // Execution events
        this.executionController.on('queryStarted', (execution) => {
            this.emit('queryStarted', execution);
        });

        this.executionController.on('queryCompleted', (execution) => {
            this.emit('queryCompleted', execution);
        });

        this.executionController.on('queryFailed', (execution, error) => {
            this.emit('queryFailed', { execution, error });
        });

        this.executionController.on('paused', (event) => {
            this.emit('paused', event);
        });

        this.executionController.on('resumed', (event) => {
            this.emit('resumed', event);
        });

        this.executionController.on('stepped', (event) => {
            this.emit('stepped', event);
        });
    }
}

// Export all types and classes
export * from './types';
export { SessionManager } from './session-manager';
export { BreakpointManager } from './breakpoint-manager';
export { ExecutionController } from './execution-controller';
export { StateInspector } from './state-inspector';

"use strict";
/**
 * Execution Controller
 * Controls query execution flow with pause/resume capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionController = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class ExecutionController extends eventemitter3_1.EventEmitter {
    constructor(breakpointManager, sessionManager) {
        super();
        this.breakpointManager = breakpointManager;
        this.sessionManager = sessionManager;
        this.executionMode = new Map();
        this.executionHistory = new Map();
        this.pendingExecutions = new Map();
    }
    /**
     * Execute a query with debug instrumentation
     */
    async executeQuery(sessionId, query, parameters = [], runner) {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const queryId = (0, uuid_1.v4)();
        const execution = {
            queryId,
            sql: query,
            parameters,
            startTime: new Date(),
            status: 'running',
        };
        this.pendingExecutions.set(queryId, execution);
        this.emit('queryStarted', execution);
        try {
            // Split query into individual statements
            // Simple split by semicolon for now (ideally use a real parser)
            const statements = query.split(';').map(s => s.trim()).filter(s => s.length > 0);
            const finalResults = { rows: [], rowCount: 0, fields: [] };
            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                const lineNumber = i + 1; // Simplified mapping
                // Create execution point for each statement
                const execPoint = {
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    queryId,
                    stage: 'execute',
                    lineNumber
                };
                this.recordExecutionPoint(sessionId, execPoint);
                const context = {
                    sessionId,
                    queryId,
                    query: stmt,
                    parameters: [],
                    startTime: new Date(),
                    userId: session.userId,
                    connectionId: session.connectionId,
                    executionPoint: execPoint,
                    variables: new Map(),
                };
                // Check breakpoints
                const breakpoint = await this.breakpointManager.shouldBreak(context);
                // Also check if we are in stepping mode
                const mode = this.executionMode.get(sessionId);
                if (breakpoint || mode === 'stepping') {
                    await this.pause(sessionId, execPoint, breakpoint ? 'breakpoint' : 'step', {
                        breakpoint,
                        context,
                    });
                }
                // Execute actual statement
                const result = await runner(stmt, []);
                // Aggregrate results (mostly take the last one or accumulate)
                finalResults.rows = [...finalResults.rows, ...result.rows];
                finalResults.rowCount += result.rowCount;
                if (result.fields)
                    finalResults.fields = result.fields;
                this.emit('queryStage', {
                    sessionId,
                    queryId,
                    stage: 'execute',
                    lineNumber,
                    timestamp: new Date(),
                });
            }
            execution.status = 'completed';
            execution.endTime = new Date();
            execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
            execution.result = finalResults;
            // Update session metadata
            this.sessionManager.updateSessionMetadata(sessionId, {
                totalQueries: session.metadata.totalQueries + 1,
                totalExecutionTime: session.metadata.totalExecutionTime + execution.duration,
            });
            this.emit('queryCompleted', execution);
            return finalResults;
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error;
            this.emit('queryFailed', execution, error);
            throw error;
        }
        finally {
            this.pendingExecutions.delete(queryId);
        }
    }
    /**
     * Execute with instrumentation at each stage
     */
    async execWithInstrumentation(sessionId, queryId, query, parameters) {
        const stages = [
            'parse',
            'analyze',
            'rewrite',
            'plan',
            'execute',
            'complete',
        ];
        for (const stage of stages) {
            // Create execution point
            const execPoint = {
                id: (0, uuid_1.v4)(),
                timestamp: new Date(),
                queryId,
                stage,
            };
            // Record in history
            this.recordExecutionPoint(sessionId, execPoint);
            // Create execution context
            const context = {
                sessionId,
                queryId,
                query,
                parameters,
                startTime: new Date(),
                userId: this.sessionManager.getSession(sessionId).userId,
                connectionId: this.sessionManager.getSession(sessionId).connectionId,
                executionPoint: execPoint,
                variables: new Map(),
            };
            // Check breakpoints
            const breakpoint = await this.breakpointManager.shouldBreak(context);
            if (breakpoint) {
                await this.pause(sessionId, execPoint, 'breakpoint', {
                    breakpoint,
                    context,
                });
            }
            // Emit stage event
            this.emit('queryStage', {
                sessionId,
                queryId,
                stage,
                timestamp: new Date(),
            });
            // Simulate stage execution
            await this.simulateStageExecution(stage);
        }
    }
    /**
     * Simulate stage execution (placeholder for actual execution)
     */
    async simulateStageExecution(_stage) {
        // In production, this would call the actual database execution
        // For now, just a small delay to simulate work
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    /**
     * Pause execution
     */
    async pause(sessionId, executionPoint, reason, details) {
        this.executionMode.set(sessionId, 'paused');
        this.sessionManager.pauseSession(sessionId);
        this.sessionManager.updateSessionState(sessionId, {
            currentExecutionPoint: executionPoint,
        });
        this.emit('paused', {
            sessionId,
            reason,
            executionPoint,
            details,
        });
        // Wait until resumed
        await this.waitForResume(sessionId);
    }
    /**
     * Resume execution
     */
    resume(sessionId) {
        this.executionMode.set(sessionId, 'running');
        this.sessionManager.resumeSession(sessionId);
        this.emit('resumed', { sessionId });
    }
    /**
     * Step over (execute to next statement)
     */
    async stepOver(sessionId) {
        this.executionMode.set(sessionId, 'stepping');
        this.sessionManager.updateSessionState(sessionId, { status: 'running' });
        this.emit('stepped', { sessionId, stepType: 'over' });
        // Will automatically pause at next execution point
    }
    /**
     * Step into (enter procedure/function)
     */
    async stepInto(sessionId) {
        this.executionMode.set(sessionId, 'stepping');
        this.emit('stepped', { sessionId, stepType: 'into' });
    }
    /**
     * Step out (exit current procedure/function)
     */
    async stepOut(sessionId) {
        this.executionMode.set(sessionId, 'stepping');
        this.emit('stepped', { sessionId, stepType: 'out' });
    }
    /**
     * Rewind execution (execute inverse SQL of last statement)
     */
    async rewind(sessionId, _runner) {
        const history = this.executionHistory.get(sessionId);
        if (!history || history.length === 0)
            return;
        // Get the last execution point
        const lastPoint = history[history.length - 1];
        if (!lastPoint)
            return;
        // In a full implementation, we'd find the inverse SQL from the timeline
        // For this demo/first-pass, we'll emit an event and decrement history
        history.pop();
        this.emit('rewound', { sessionId, executionPoint: lastPoint });
        // Pause at the new "last" point
        const prevPoint = history[history.length - 1];
        if (prevPoint) {
            this.sessionManager.updateSessionState(sessionId, {
                currentExecutionPoint: prevPoint,
            });
            this.executionMode.set(sessionId, 'paused');
        }
        else {
            this.executionMode.set(sessionId, 'stopped');
        }
    }
    /**
     * Wait for resume signal
     */
    waitForResume(sessionId) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const mode = this.executionMode.get(sessionId);
                if (mode === 'running' || mode === 'stepping') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    /**
     * Record execution point in history
     */
    recordExecutionPoint(sessionId, point) {
        if (!this.executionHistory.has(sessionId)) {
            this.executionHistory.set(sessionId, []);
        }
        const history = this.executionHistory.get(sessionId);
        history.push(point);
        // Limit history size
        const session = this.sessionManager.getSession(sessionId);
        if (session && history.length > session.config.maxHistorySize) {
            history.shift(); // Remove oldest
        }
    }
    /**
     * Get execution history
     */
    getExecutionHistory(sessionId) {
        return this.executionHistory.get(sessionId) || [];
    }
    /**
     * Get current execution point
     */
    getCurrentExecutionPoint(sessionId) {
        const session = this.sessionManager.getSession(sessionId);
        return session?.state.currentExecutionPoint;
    }
    /**
     * Get active queries
     */
    getActiveQueries() {
        return Array.from(this.pendingExecutions.values());
    }
    /**
     * Clear history for session
     */
    clearHistory(sessionId) {
        this.executionHistory.delete(sessionId);
        this.executionMode.delete(sessionId);
    }
}
exports.ExecutionController = ExecutionController;

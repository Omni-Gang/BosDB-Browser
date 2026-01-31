"use strict";
/**
 * Execution Controller
 * Controls query execution flow with pause/resume capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionController = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const snapshot_engine_1 = require("./snapshot-engine");
const cursor_debugger_1 = require("./cursor-debugger");
const trigger_debugger_1 = require("./trigger-debugger");
class ExecutionController extends eventemitter3_1.EventEmitter {
    constructor(breakpointManager, sessionManager) {
        super();
        this.breakpointManager = breakpointManager;
        this.sessionManager = sessionManager;
        this.executionMode = new Map();
        this.executionHistory = new Map();
        this.pendingExecutions = new Map();
        this.snapshotEngine = new snapshot_engine_1.SnapshotEngine();
        this.cursorDebugger = new cursor_debugger_1.CursorDebugger();
        this.triggerDebugger = new trigger_debugger_1.TriggerDebugger();
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
                // Capture state before execution
                const variables = context.variables;
                const callStack = session.state.callStack || [];
                const cursors = this.cursorDebugger.getCursors(sessionId);
                // Intercept triggers for DML
                const triggerContext = await this.triggerDebugger.interceptDML(sessionId, stmt, execPoint, runner);
                this.snapshotEngine.capture(sessionId, execPoint, variables, callStack, cursors, triggerContext);
                // Execute actual statement
                const result = await runner(stmt, []);
                // Finalize trigger if intercepted
                if (triggerContext) {
                    await this.triggerDebugger.finalizeTrigger(triggerContext, runner);
                }
                // If it's a cursor operation, track it (simplified detection)
                if (stmt.toUpperCase().startsWith('OPEN ') || stmt.toUpperCase().startsWith('FETCH ')) {
                    const match = stmt.match(/(OPEN|FETCH)\s+(\w+)/i);
                    if (match) {
                        this.cursorDebugger.trackCursorAction(sessionId, match[2], stmt, execPoint, match[1].toLowerCase(), result.rows[0], result.rowCount);
                    }
                }
                // Aggregate results
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
    /*
    private async execWithInstrumentation(
        sessionId: string,
        queryId: string,
        query: string,
        parameters: any[]
    ): Promise<void> {
        const stages: QueryStage[] = [
            'parse',
            'analyze',
            'rewrite',
            'plan',
            'execute',
            'complete',
        ];

        for (const stage of stages) {
            // Create execution point
            const execPoint: ExecutionPoint = {
                id: uuidv4(),
                timestamp: new Date(),
                queryId,
                stage,
            };

            // Record in history
            this.recordExecutionPoint(sessionId, execPoint);

            // Create execution context
            const context: ExecutionContext = {
                sessionId,
                queryId,
                query,
                parameters,
                startTime: new Date(),
                userId: this.sessionManager.getSession(sessionId)!.userId,
                connectionId: this.sessionManager.getSession(sessionId)!.connectionId,
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
    */
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
        this.sessionManager.updateSessionState(sessionId, { status: 'RUNNING' });
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
     * Step back (reverse execution)
     */
    async stepBack(sessionId) {
        const history = this.executionHistory.get(sessionId);
        if (!history || history.length <= 1)
            return;
        // Current point is the last one in history
        const currentPoint = history.pop();
        if (!currentPoint)
            return;
        // The target point is the one before the current point
        const targetPoint = history[history.length - 1];
        if (!targetPoint)
            return;
        // Restore state from snapshot
        const snapshot = this.snapshotEngine.getSnapshot(sessionId, targetPoint.id);
        if (snapshot) {
            this.sessionManager.updateSessionState(sessionId, {
                currentExecutionPoint: targetPoint,
                callStack: snapshot.callStack,
            });
            // Restore cursors
            // const _restoredCursors = this.cursorDebugger.restoreCursorState(sessionId, targetPoint.id);
            // In a real implementation, we'd update some cursor manager here
            this.executionMode.set(sessionId, 'paused');
            this.emit('stepped', { sessionId, stepType: 'back', executionPoint: targetPoint });
        }
        else {
            this.emit('error', { sessionId, message: 'Snapshot not found for step-back' });
        }
    }
    /**
     * Rewind execution (alias for stepBack, keeping backward compatibility)
     */
    async rewind(sessionId, _runner) {
        return this.stepBack(sessionId);
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

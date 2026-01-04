"use strict";
/**
 * Debug Engine
 * Main entry point that coordinates all debugger components
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateInspector = exports.ExecutionController = exports.BreakpointManager = exports.SessionManager = exports.DebugEngine = void 0;
const eventemitter3_1 = require("eventemitter3");
const session_manager_1 = require("./session-manager");
const breakpoint_manager_1 = require("./breakpoint-manager");
const execution_controller_1 = require("./execution-controller");
const state_inspector_1 = require("./state-inspector");
const time_travel_1 = require("./time-travel");
class DebugEngine extends eventemitter3_1.EventEmitter {
    constructor() {
        super();
        // Initialize managers
        this.sessionManager = new session_manager_1.SessionManager();
        this.breakpointManager = new breakpoint_manager_1.BreakpointManager();
        this.stateInspector = new state_inspector_1.StateInspector();
        this.timeTravelEngine = new time_travel_1.TimeTravelEngine();
        this.executionController = new execution_controller_1.ExecutionController(this.breakpointManager, this.sessionManager);
        // Forward events
        this.forwardEvents();
    }
    // ========== Session Management ==========
    /**
     * Create a new debug session
     */
    createSession(userId, connectionId, config) {
        return this.sessionManager.createSession(userId, connectionId, config);
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessionManager.getSession(sessionId);
    }
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId) {
        return this.sessionManager.getUserSessions(userId);
    }
    /**
     * Delete a session
     */
    deleteSession(sessionId) {
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
    async executeQuery(sessionId, query, parameters, runner) {
        if (!runner)
            throw new Error('StatementRunner is required for execution');
        return this.executionController.executeQuery(sessionId, query, parameters, runner);
    }
    /**
     * Pause execution
     */
    pause(sessionId) {
        const execPoint = this.executionController.getCurrentExecutionPoint(sessionId);
        if (execPoint) {
            this.executionController.pause(sessionId, execPoint, 'user_requested');
        }
    }
    /**
     * Resume execution
     */
    resume(sessionId) {
        this.executionController.resume(sessionId);
    }
    /**
     * Step over
     */
    async stepOver(sessionId) {
        await this.executionController.stepOver(sessionId);
    }
    /**
     * Step into
     */
    async stepInto(sessionId) {
        await this.executionController.stepInto(sessionId);
    }
    /**
     * Step out
     */
    async stepOut(sessionId) {
        await this.executionController.stepOut(sessionId);
    }
    /**
     * Rewind step (reverse execution)
     */
    async rewind(sessionId, runner) {
        return this.executionController.rewind(sessionId, runner);
    }
    /**
     * Get execution history
     */
    getExecutionHistory(sessionId) {
        return this.executionController.getExecutionHistory(sessionId);
    }
    // ========== Breakpoint Management ==========
    /**
     * Set a breakpoint
     */
    setBreakpoint(sessionId, type, config) {
        return this.breakpointManager.createBreakpoint(sessionId, type, config);
    }
    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId) {
        return this.breakpointManager.removeBreakpoint(breakpointId);
    }
    /**
     * Enable/disable a breakpoint
     */
    toggleBreakpoint(breakpointId, enabled) {
        return this.breakpointManager.setBreakpointEnabled(breakpointId, enabled);
    }
    /**
     * Get all breakpoints for a session
     */
    getBreakpoints(sessionId) {
        return this.breakpointManager.getBreakpointsForSession(sessionId);
    }
    // ========== State Inspection ==========
    /**
     * Get variables in a scope
     */
    getVariables(sessionId, scope) {
        return this.stateInspector.getVariables(sessionId, scope);
    }
    /**
     * Get session variables
     */
    getSessionVariables(sessionId) {
        return this.stateInspector.getSessionVariables(sessionId);
    }
    /**
     * Get transaction state
     */
    getTransactionState(txnId) {
        return this.stateInspector.getTransactionState(txnId);
    }
    /**
     * Get all active transactions
     */
    getActiveTransactions() {
        return this.stateInspector.getActiveTransactions();
    }
    /**
     * Detect deadlocks
     */
    detectDeadlocks() {
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
    getSessionStatistics(sessionId) {
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
    forwardEvents() {
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
exports.DebugEngine = DebugEngine;
// Export all types and classes
__exportStar(require("./types"), exports);
var session_manager_2 = require("./session-manager");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_manager_2.SessionManager; } });
var breakpoint_manager_2 = require("./breakpoint-manager");
Object.defineProperty(exports, "BreakpointManager", { enumerable: true, get: function () { return breakpoint_manager_2.BreakpointManager; } });
var execution_controller_2 = require("./execution-controller");
Object.defineProperty(exports, "ExecutionController", { enumerable: true, get: function () { return execution_controller_2.ExecutionController; } });
var state_inspector_2 = require("./state-inspector");
Object.defineProperty(exports, "StateInspector", { enumerable: true, get: function () { return state_inspector_2.StateInspector; } });

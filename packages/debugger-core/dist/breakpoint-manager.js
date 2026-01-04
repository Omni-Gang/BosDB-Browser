"use strict";
/**
 * Breakpoint Manager
 * Handles creation, storage, and evaluation of breakpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakpointManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class BreakpointManager extends eventemitter3_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.breakpoints = new Map();
        this.breakpointsBySession = new Map();
    }
    /**
     * Create a new breakpoint
     */
    createBreakpoint(sessionId, type, config) {
        const breakpoint = {
            id: (0, uuid_1.v4)(),
            sessionId,
            type,
            enabled: true,
            hitCount: 0,
            ...config,
        };
        this.breakpoints.set(breakpoint.id, breakpoint);
        // Add to session index
        if (!this.breakpointsBySession.has(sessionId)) {
            this.breakpointsBySession.set(sessionId, new Set());
        }
        this.breakpointsBySession.get(sessionId).add(breakpoint.id);
        this.emit('breakpointCreated', breakpoint);
        return breakpoint;
    }
    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId) {
        const breakpoint = this.breakpoints.get(breakpointId);
        if (!breakpoint)
            return false;
        this.breakpoints.delete(breakpointId);
        this.breakpointsBySession.get(breakpoint.sessionId)?.delete(breakpointId);
        this.emit('breakpointRemoved', breakpoint);
        return true;
    }
    /**
     * Enable/disable a breakpoint
     */
    setBreakpointEnabled(breakpointId, enabled) {
        const breakpoint = this.breakpoints.get(breakpointId);
        if (!breakpoint)
            return false;
        breakpoint.enabled = enabled;
        this.emit('breakpointChanged', breakpoint);
        return true;
    }
    /**
     * Get breakpoint by ID
     */
    getBreakpoint(breakpointId) {
        return this.breakpoints.get(breakpointId);
    }
    /**
     * Get all breakpoints for a session
     */
    getBreakpointsForSession(sessionId) {
        const bpIds = this.breakpointsBySession.get(sessionId);
        if (!bpIds)
            return [];
        return Array.from(bpIds)
            .map((id) => this.breakpoints.get(id))
            .filter((bp) => bp !== undefined);
    }
    /**
     * Check if execution should break at this point
     */
    async shouldBreak(context) {
        const breakpoints = this.getBreakpointsForSession(context.sessionId);
        for (const bp of breakpoints) {
            if (!bp.enabled)
                continue;
            // Type-specific checks
            const shouldBreak = await this.evaluateBreakpoint(bp, context);
            if (shouldBreak) {
                // Update hit count
                bp.hitCount++;
                bp.lastHit = new Date();
                this.emit('breakpointHit', bp, context);
                return bp;
            }
        }
        return null;
    }
    /**
     * Evaluate if a specific breakpoint should trigger
     */
    async evaluateBreakpoint(bp, context) {
        // Check condition if exists
        if (bp.condition) {
            const conditionMet = await this.evaluateCondition(bp.condition, context);
            if (!conditionMet)
                return false;
        }
        // Type-specific evaluation
        switch (bp.type) {
            case 'query':
                return this.evaluateQueryBreakpoint(bp, context);
            case 'line':
                return this.evaluateLineBreakpoint(bp, context);
            case 'data':
                return this.evaluateDataBreakpoint(bp, context);
            case 'transaction':
                return this.evaluateTransactionBreakpoint(bp, context);
            case 'lock':
                return this.evaluateLockBreakpoint(bp, context);
            case 'plan':
                return this.evaluatePlanBreakpoint(bp, context);
            default:
                return false;
        }
    }
    /**
     * Evaluate query breakpoint
     */
    evaluateQueryBreakpoint(bp, context) {
        // Check if we're at the right stage
        if (bp.stage && context.executionPoint.stage !== bp.stage) {
            return false;
        }
        // Check query pattern if exists
        if (bp.queryPattern) {
            return bp.queryPattern.test(context.query);
        }
        return true;
    }
    /**
     * Evaluate line breakpoint (for stored procedures)
     */
    evaluateLineBreakpoint(bp, context) {
        return (context.executionPoint.procedureId === bp.procedureId &&
            context.executionPoint.lineNumber === bp.lineNumber);
    }
    /**
     * Evaluate data breakpoint (watch expressions)
     */
    evaluateDataBreakpoint(_bp, _context) {
        // This would check if the watched expression changed
        // For now, simplified implementation
        return false; // TODO: Implement data watching
    }
    /**
     * Evaluate transaction breakpoint
     */
    evaluateTransactionBreakpoint(_bp, _context) {
        // Check transaction events
        // This would be called when BEGIN, COMMIT, ROLLBACK happens
        return false; // TODO: Implement transaction event detection
    }
    /**
     * Evaluate lock breakpoint
     */
    evaluateLockBreakpoint(_bp, _context) {
        // Check lock events
        // This would be called when locks are acquired/waited/released
        return false; // TODO: Implement lock event detection
    }
    /**
     * Evaluate plan breakpoint
     */
    evaluatePlanBreakpoint(_bp, _context) {
        // Check execution plan node
        return false; // TODO: Implement plan node evaluation
    }
    /**
     * Evaluate a condition expression
     */
    async evaluateCondition(condition, context) {
        try {
            // Simple variable substitution for now
            // In production, use a safe expression evaluator
            const vars = Object.fromEntries(context.variables);
            // Create a function that evaluates the condition with context
            // This is a simplified version - in production, use a proper expression parser
            const func = new Function(...Object.keys(vars), `return ${condition};`);
            return func(...Object.values(vars));
        }
        catch (error) {
            console.error('Error evaluating breakpoint condition:', error);
            return false;
        }
    }
    /**
     * Remove all breakpoints for a session
     */
    clearSessionBreakpoints(sessionId) {
        const bpIds = this.breakpointsBySession.get(sessionId);
        if (!bpIds)
            return;
        for (const bpId of bpIds) {
            this.breakpoints.delete(bpId);
        }
        this.breakpointsBySession.delete(sessionId);
        this.emit('sessionBreakpointsCleared', sessionId);
    }
    /**
     * Get statistics
     */
    getStatistics(sessionId) {
        const breakpoints = this.getBreakpointsForSession(sessionId);
        const byType = new Map();
        let totalHits = 0;
        for (const bp of breakpoints) {
            byType.set(bp.type, (byType.get(bp.type) || 0) + 1);
            totalHits += bp.hitCount;
        }
        return {
            total: breakpoints.length,
            enabled: breakpoints.filter((bp) => bp.enabled).length,
            byType,
            totalHits,
        };
    }
}
exports.BreakpointManager = BreakpointManager;

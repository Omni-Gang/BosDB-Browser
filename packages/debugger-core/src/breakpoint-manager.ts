/**
 * Breakpoint Manager
 * Handles creation, storage, and evaluation of breakpoints
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
    Breakpoint,
    BreakpointType,
    ExecutionContext,
    QueryBreakpoint,
    LineBreakpoint,
    DataBreakpoint,
    TransactionBreakpoint,
    LockBreakpoint,
    PlanBreakpoint,
} from './types';

export class BreakpointManager extends EventEmitter {
    private breakpoints: Map<string, Breakpoint> = new Map();
    private breakpointsBySession: Map<string, Set<string>> = new Map();

    /**
     * Create a new breakpoint
     */
    createBreakpoint(
        sessionId: string,
        type: BreakpointType,
        config: Partial<Breakpoint>
    ): Breakpoint {
        const breakpoint: Breakpoint = {
            id: uuidv4(),
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
        this.breakpointsBySession.get(sessionId)!.add(breakpoint.id);

        this.emit('breakpointCreated', breakpoint);
        return breakpoint;
    }

    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean {
        const breakpoint = this.breakpoints.get(breakpointId);
        if (!breakpoint) return false;

        this.breakpoints.delete(breakpointId);
        this.breakpointsBySession.get(breakpoint.sessionId)?.delete(breakpointId);

        this.emit('breakpointRemoved', breakpoint);
        return true;
    }

    /**
     * Enable/disable a breakpoint
     */
    setBreakpointEnabled(breakpointId: string, enabled: boolean): boolean {
        const breakpoint = this.breakpoints.get(breakpointId);
        if (!breakpoint) return false;

        breakpoint.enabled = enabled;
        this.emit('breakpointChanged', breakpoint);
        return true;
    }

    /**
     * Get breakpoint by ID
     */
    getBreakpoint(breakpointId: string): Breakpoint | undefined {
        return this.breakpoints.get(breakpointId);
    }

    /**
     * Get all breakpoints for a session
     */
    getBreakpointsForSession(sessionId: string): Breakpoint[] {
        const bpIds = this.breakpointsBySession.get(sessionId);
        if (!bpIds) return [];

        return Array.from(bpIds)
            .map((id) => this.breakpoints.get(id))
            .filter((bp): bp is Breakpoint => bp !== undefined);
    }

    /**
     * Check if execution should break at this point
     */
    async shouldBreak(context: ExecutionContext): Promise<Breakpoint | null> {
        const breakpoints = this.getBreakpointsForSession(context.sessionId);

        for (const bp of breakpoints) {
            if (!bp.enabled) continue;

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
    private async evaluateBreakpoint(
        bp: Breakpoint,
        context: ExecutionContext
    ): Promise<boolean> {
        // Check condition if exists
        if (bp.condition) {
            const conditionMet = await this.evaluateCondition(bp.condition, context);
            if (!conditionMet) return false;
        }

        // Type-specific evaluation
        switch (bp.type) {
            case 'query':
                return this.evaluateQueryBreakpoint(bp as QueryBreakpoint, context);
            case 'line':
                return this.evaluateLineBreakpoint(bp as LineBreakpoint, context);
            case 'data':
                return this.evaluateDataBreakpoint(bp as DataBreakpoint, context);
            case 'transaction':
                return this.evaluateTransactionBreakpoint(
                    bp as TransactionBreakpoint,
                    context
                );
            case 'lock':
                return this.evaluateLockBreakpoint(bp as LockBreakpoint, context);
            case 'plan':
                return this.evaluatePlanBreakpoint(bp as PlanBreakpoint, context);
            default:
                return false;
        }
    }

    /**
     * Evaluate query breakpoint
     */
    private evaluateQueryBreakpoint(
        bp: QueryBreakpoint,
        context: ExecutionContext
    ): boolean {
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
    private evaluateLineBreakpoint(
        bp: LineBreakpoint,
        context: ExecutionContext
    ): boolean {
        return (
            context.executionPoint.procedureId === bp.procedureId &&
            context.executionPoint.lineNumber === bp.lineNumber
        );
    }

    /**
     * Evaluate data breakpoint (watch expressions)
     */
    private evaluateDataBreakpoint(
        _bp: DataBreakpoint,
        _context: ExecutionContext
    ): boolean {
        // This would check if the watched expression changed
        // For now, simplified implementation
        return false; // TODO: Implement data watching
    }

    /**
     * Evaluate transaction breakpoint
     */
    private evaluateTransactionBreakpoint(
        _bp: TransactionBreakpoint,
        _context: ExecutionContext
    ): boolean {
        // Check transaction events
        // This would be called when BEGIN, COMMIT, ROLLBACK happens
        return false; // TODO: Implement transaction event detection
    }

    /**
     * Evaluate lock breakpoint
     */
    private evaluateLockBreakpoint(
        _bp: LockBreakpoint,
        _context: ExecutionContext
    ): boolean {
        // Check lock events
        // This would be called when locks are acquired/waited/released
        return false; // TODO: Implement lock event detection
    }

    /**
     * Evaluate plan breakpoint
     */
    private evaluatePlanBreakpoint(
        _bp: PlanBreakpoint,
        _context: ExecutionContext
    ): boolean {
        // Check execution plan node
        return false; // TODO: Implement plan node evaluation
    }

    /**
     * Evaluate a condition expression
     */
    private async evaluateCondition(
        condition: string,
        context: ExecutionContext
    ): Promise<boolean> {
        try {
            // Simple variable substitution for now
            // In production, use a safe expression evaluator
            const vars = Object.fromEntries(context.variables);

            // Create a function that evaluates the condition with context
            // This is a simplified version - in production, use a proper expression parser
            const func = new Function(
                ...Object.keys(vars),
                `return ${condition};`
            );

            return func(...Object.values(vars));
        } catch (error) {
            console.error('Error evaluating breakpoint condition:', error);
            return false;
        }
    }

    /**
     * Remove all breakpoints for a session
     */
    clearSessionBreakpoints(sessionId: string): void {
        const bpIds = this.breakpointsBySession.get(sessionId);
        if (!bpIds) return;

        for (const bpId of bpIds) {
            this.breakpoints.delete(bpId);
        }

        this.breakpointsBySession.delete(sessionId);
        this.emit('sessionBreakpointsCleared', sessionId);
    }

    /**
     * Get statistics
     */
    getStatistics(sessionId: string): {
        total: number;
        enabled: number;
        byType: Map<BreakpointType, number>;
        totalHits: number;
    } {
        const breakpoints = this.getBreakpointsForSession(sessionId);
        const byType = new Map<BreakpointType, number>();
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

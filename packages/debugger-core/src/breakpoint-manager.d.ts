/**
 * Breakpoint Manager
 * Handles creation, storage, and evaluation of breakpoints
 */
import { EventEmitter } from 'eventemitter3';
import { Breakpoint, BreakpointType, ExecutionContext } from './types';
export declare class BreakpointManager extends EventEmitter {
    private breakpoints;
    private breakpointsBySession;
    /**
     * Create a new breakpoint
     */
    createBreakpoint(sessionId: string, type: BreakpointType, config: Partial<Breakpoint>): Breakpoint;
    /**
     * Remove a breakpoint
     */
    removeBreakpoint(breakpointId: string): boolean;
    /**
     * Enable/disable a breakpoint
     */
    setBreakpointEnabled(breakpointId: string, enabled: boolean): boolean;
    /**
     * Get breakpoint by ID
     */
    getBreakpoint(breakpointId: string): Breakpoint | undefined;
    /**
     * Get all breakpoints for a session
     */
    getBreakpointsForSession(sessionId: string): Breakpoint[];
    /**
     * Check if execution should break at this point
     */
    shouldBreak(context: ExecutionContext): Promise<Breakpoint | null>;
    /**
     * Evaluate if a specific breakpoint should trigger
     */
    private evaluateBreakpoint;
    /**
     * Evaluate query breakpoint
     */
    private evaluateQueryBreakpoint;
    /**
     * Evaluate line breakpoint (for stored procedures)
     */
    private evaluateLineBreakpoint;
    /**
     * Evaluate data breakpoint (watch expressions)
     */
    private evaluateDataBreakpoint;
    /**
     * Evaluate transaction breakpoint
     */
    private evaluateTransactionBreakpoint;
    /**
     * Evaluate lock breakpoint
     */
    private evaluateLockBreakpoint;
    /**
     * Evaluate plan breakpoint
     */
    private evaluatePlanBreakpoint;
    /**
     * Evaluate a condition expression
     */
    private evaluateCondition;
    /**
     * Remove all breakpoints for a session
     */
    clearSessionBreakpoints(sessionId: string): void;
    /**
     * Get statistics
     */
    getStatistics(sessionId: string): {
        total: number;
        enabled: number;
        byType: Map<BreakpointType, number>;
        totalHits: number;
    };
}
//# sourceMappingURL=breakpoint-manager.d.ts.map
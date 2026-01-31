import { CursorState, ExecutionPoint } from './types';
export declare class CursorDebugger {
    private cursorStates;
    /**
     * Initialize or update a cursor state
     */
    trackCursorAction(sessionId: string, cursorName: string, sql: string, executionPoint: ExecutionPoint, action: 'open' | 'fetch' | 'close', rowSnapshot?: any, rowCount?: number): CursorState;
    /**
     * Get all cursors for a session
     */
    getCursors(sessionId: string): Map<string, CursorState>;
    /**
     * Restore cursor state from history for an execution point
     */
    restoreCursorState(sessionId: string, executionPointId: string): Map<string, CursorState>;
    /**
     * Clear session cursors
     */
    clearSession(sessionId: string): void;
}
//# sourceMappingURL=cursor-debugger.d.ts.map
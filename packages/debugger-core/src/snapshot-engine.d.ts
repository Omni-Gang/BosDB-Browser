import { Snapshot, ExecutionPoint, StackFrame, CursorState, TriggerContext } from './types';
export declare class SnapshotEngine {
    private snapshots;
    /**
     * Capture a snapshot of the current state
     */
    capture(sessionId: string, executionPoint: ExecutionPoint, variables: Map<string, any>, callStack: StackFrame[], cursors: Map<string, CursorState>, triggerContext?: TriggerContext): Snapshot;
    /**
     * Get snapshot for a specific execution point
     */
    getSnapshot(sessionId: string, executionPointId: string): Snapshot | undefined;
    /**
     * Get the latest snapshot for a session
     */
    getLatestSnapshot(sessionId: string): Snapshot | undefined;
    /**
     * Get previous snapshot relative to an execution point
     */
    getPreviousSnapshot(sessionId: string, currentExecutionPointId: string): Snapshot | undefined;
    /**
     * Clear snapshots for a session
     */
    clearSession(sessionId: string): void;
    /**
     * Get all snapshots for a session (for timeline)
     */
    getSessionHistory(sessionId: string): Snapshot[];
}
//# sourceMappingURL=snapshot-engine.d.ts.map
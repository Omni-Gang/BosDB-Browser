import { Snapshot, ExecutionPoint, StackFrame, CursorState, TriggerContext } from './types';
import { v4 as uuidv4 } from 'uuid';

export class SnapshotEngine {
    private snapshots: Map<string, Snapshot[]> = new Map();

    /**
     * Capture a snapshot of the current state
     */
    capture(
        sessionId: string,
        executionPoint: ExecutionPoint,
        variables: Map<string, any>,
        callStack: StackFrame[],
        cursors: Map<string, CursorState>,
        triggerContext?: TriggerContext
    ): Snapshot {
        const snapshot: Snapshot = {
            id: uuidv4(),
            sessionId,
            timestamp: new Date(),
            executionPoint,
            variables: new Map(variables), // Shallow copy of variables
            callStack: JSON.parse(JSON.stringify(callStack)), // Deep copy stack frames
            cursors: new Map(cursors), // Shallow copy cursors
            triggerContext: triggerContext ? { ...triggerContext } : undefined,
            storage: {
                compressed: false,
                sizeBytes: 0, // In-memory for now
            },
        };

        if (!this.snapshots.has(sessionId)) {
            this.snapshots.set(sessionId, []);
        }

        this.snapshots.get(sessionId)!.push(snapshot);
        return snapshot;
    }

    /**
     * Get snapshot for a specific execution point
     */
    getSnapshot(sessionId: string, executionPointId: string): Snapshot | undefined {
        const sessionSnapshots = this.snapshots.get(sessionId);
        return sessionSnapshots?.find(s => s.executionPoint.id === executionPointId);
    }

    /**
     * Get the latest snapshot for a session
     */
    getLatestSnapshot(sessionId: string): Snapshot | undefined {
        const sessionSnapshots = this.snapshots.get(sessionId);
        return sessionSnapshots?.[sessionSnapshots.length - 1];
    }

    /**
     * Get previous snapshot relative to an execution point
     */
    getPreviousSnapshot(sessionId: string, currentExecutionPointId: string): Snapshot | undefined {
        const sessionSnapshots = this.snapshots.get(sessionId);
        if (!sessionSnapshots) return undefined;

        const index = sessionSnapshots.findIndex(s => s.executionPoint.id === currentExecutionPointId);
        if (index > 0) {
            return sessionSnapshots[index - 1];
        }
        return undefined;
    }

    /**
     * Clear snapshots for a session
     */
    clearSession(sessionId: string): void {
        this.snapshots.delete(sessionId);
    }

    /**
     * Get all snapshots for a session (for timeline)
     */
    getSessionHistory(sessionId: string): Snapshot[] {
        return this.snapshots.get(sessionId) || [];
    }
}

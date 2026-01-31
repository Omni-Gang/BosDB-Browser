"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotEngine = void 0;
const uuid_1 = require("uuid");
class SnapshotEngine {
    constructor() {
        this.snapshots = new Map();
    }
    /**
     * Capture a snapshot of the current state
     */
    capture(sessionId, executionPoint, variables, callStack, cursors, triggerContext) {
        const snapshot = {
            id: (0, uuid_1.v4)(),
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
        this.snapshots.get(sessionId).push(snapshot);
        return snapshot;
    }
    /**
     * Get snapshot for a specific execution point
     */
    getSnapshot(sessionId, executionPointId) {
        const sessionSnapshots = this.snapshots.get(sessionId);
        return sessionSnapshots?.find(s => s.executionPoint.id === executionPointId);
    }
    /**
     * Get the latest snapshot for a session
     */
    getLatestSnapshot(sessionId) {
        const sessionSnapshots = this.snapshots.get(sessionId);
        return sessionSnapshots?.[sessionSnapshots.length - 1];
    }
    /**
     * Get previous snapshot relative to an execution point
     */
    getPreviousSnapshot(sessionId, currentExecutionPointId) {
        const sessionSnapshots = this.snapshots.get(sessionId);
        if (!sessionSnapshots)
            return undefined;
        const index = sessionSnapshots.findIndex(s => s.executionPoint.id === currentExecutionPointId);
        if (index > 0) {
            return sessionSnapshots[index - 1];
        }
        return undefined;
    }
    /**
     * Clear snapshots for a session
     */
    clearSession(sessionId) {
        this.snapshots.delete(sessionId);
    }
    /**
     * Get all snapshots for a session (for timeline)
     */
    getSessionHistory(sessionId) {
        return this.snapshots.get(sessionId) || [];
    }
}
exports.SnapshotEngine = SnapshotEngine;
//# sourceMappingURL=snapshot-engine.js.map
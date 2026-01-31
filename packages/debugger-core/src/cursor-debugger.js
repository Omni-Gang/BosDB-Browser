"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CursorDebugger = void 0;
class CursorDebugger {
    constructor() {
        this.cursorStates = new Map();
    }
    /**
     * Initialize or update a cursor state
     */
    trackCursorAction(sessionId, cursorName, sql, executionPoint, action, rowSnapshot, rowCount = 0) {
        if (!this.cursorStates.has(sessionId)) {
            this.cursorStates.set(sessionId, new Map());
        }
        const sessionCursors = this.cursorStates.get(sessionId);
        let cursor = sessionCursors.get(cursorName);
        if (!cursor) {
            cursor = {
                id: `${sessionId}_${cursorName}`,
                sessionId,
                name: cursorName,
                sql,
                status: 'closed',
                rowCount: 0,
                history: [],
            };
            sessionCursors.set(cursorName, cursor);
        }
        // Update status
        if (action === 'open')
            cursor.status = 'open';
        if (action === 'close')
            cursor.status = 'closed';
        cursor.rowCount = rowCount;
        cursor.currentRow = rowSnapshot;
        // Record history
        const historyPoint = {
            timestamp: new Date(),
            executionPointId: executionPoint.id,
            action,
            rowSnapshot,
            rowCount,
        };
        cursor.history.push(historyPoint);
        return { ...cursor };
    }
    /**
     * Get all cursors for a session
     */
    getCursors(sessionId) {
        return this.cursorStates.get(sessionId) || new Map();
    }
    /**
     * Restore cursor state from history for an execution point
     */
    restoreCursorState(sessionId, executionPointId) {
        const sessionCursors = this.cursorStates.get(sessionId);
        const restored = new Map();
        if (sessionCursors) {
            for (const [name, cursor] of sessionCursors.entries()) {
                const historyPoint = [...cursor.history]
                    .reverse()
                    .find(h => h.executionPointId === executionPointId);
                if (historyPoint) {
                    restored.set(name, {
                        ...cursor,
                        status: historyPoint.action === 'close' ? 'closed' : 'open',
                        currentRow: historyPoint.rowSnapshot,
                        rowCount: historyPoint.rowCount,
                    });
                }
            }
        }
        return restored;
    }
    /**
     * Clear session cursors
     */
    clearSession(sessionId) {
        this.cursorStates.delete(sessionId);
    }
}
exports.CursorDebugger = CursorDebugger;
//# sourceMappingURL=cursor-debugger.js.map
import { CursorState, CursorHistoryPoint, ExecutionPoint } from './types';

export class CursorDebugger {
    private cursorStates: Map<string, Map<string, CursorState>> = new Map();

    /**
     * Initialize or update a cursor state
     */
    trackCursorAction(
        sessionId: string,
        cursorName: string,
        sql: string,
        executionPoint: ExecutionPoint,
        action: 'open' | 'fetch' | 'close',
        rowSnapshot?: any,
        rowCount: number = 0
    ): CursorState {
        if (!this.cursorStates.has(sessionId)) {
            this.cursorStates.set(sessionId, new Map());
        }

        const sessionCursors = this.cursorStates.get(sessionId)!;
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
        if (action === 'open') cursor.status = 'open';
        if (action === 'close') cursor.status = 'closed';

        cursor.rowCount = rowCount;
        cursor.currentRow = rowSnapshot;

        // Record history
        const historyPoint: CursorHistoryPoint = {
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
    getCursors(sessionId: string): Map<string, CursorState> {
        return this.cursorStates.get(sessionId) || new Map();
    }

    /**
     * Restore cursor state from history for an execution point
     */
    restoreCursorState(sessionId: string, executionPointId: string): Map<string, CursorState> {
        const sessionCursors = this.cursorStates.get(sessionId);
        const restored = new Map<string, CursorState>();

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
    clearSession(sessionId: string): void {
        this.cursorStates.delete(sessionId);
    }
}

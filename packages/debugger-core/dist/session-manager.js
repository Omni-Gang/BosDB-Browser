"use strict";
/**
 * Session Manager
 * Manages debug sessions and their lifecycle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const types_1 = require("./types");
class SessionManager extends eventemitter3_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.sessions = new Map();
        this.sessionsByUser = new Map();
        this.maxSessionsPerUser = 5;
    }
    /**
     * Create a new debug session
     */
    createSession(userId, connectionId, config = {}) {
        // Check user session limit
        const userSessions = this.sessionsByUser.get(userId);
        if (userSessions && userSessions.size >= this.maxSessionsPerUser) {
            throw new Error(`User has reached maximum number of debug sessions (${this.maxSessionsPerUser})`);
        }
        const session = {
            id: (0, uuid_1.v4)(),
            userId,
            connectionId,
            createdAt: new Date(),
            config: this.getDefaultConfig(config),
            state: {
                status: 'CREATED',
                activeBreakpoints: [],
                callStack: [],
            },
            metadata: this.getInitialMetadata(),
        };
        this.sessions.set(session.id, session);
        // Add to user index
        if (!this.sessionsByUser.has(userId)) {
            this.sessionsByUser.set(userId, new Set());
        }
        this.sessionsByUser.get(userId).add(session.id);
        this.emit('sessionCreated', session);
        return session;
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId) {
        const sessionIds = this.sessionsByUser.get(userId);
        if (!sessionIds)
            return [];
        return Array.from(sessionIds)
            .map((id) => this.sessions.get(id))
            .filter((session) => session !== undefined);
    }
    /**
     * Update session state
     */
    updateSessionState(sessionId, state) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.state = {
            ...session.state,
            ...state,
        };
        this.emit('sessionStateChanged', session);
        return true;
    }
    /**
     * Update session metadata
     */
    updateSessionMetadata(sessionId, metadata) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.metadata = {
            ...session.metadata,
            ...metadata,
        };
        return true;
    }
    /**
     * Terminate a session (final state)
     */
    terminateSession(sessionId) {
        return this.updateSessionState(sessionId, { status: 'TERMINATED' });
    }
    /**
     * Pause a session
     */
    pauseSession(sessionId) {
        return this.updateSessionState(sessionId, { status: 'PAUSED' });
    }
    /**
     * Resume a session
     */
    resumeSession(sessionId) {
        return this.updateSessionState(sessionId, { status: 'RUNNING' });
    }
    /**
     * Delete a session
     */
    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        this.sessions.delete(sessionId);
        this.sessionsByUser.get(session.userId)?.delete(sessionId);
        this.emit('sessionDeleted', session);
        return true;
    }
    /**
     * Clean up inactive sessions
     */
    cleanupInactiveSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        let cleaned = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            const sessionAge = now - session.createdAt.getTime();
            if ((session.state.status === 'COMPLETED' || session.state.status === 'TERMINATED' || session.state.status === 'ERROR') &&
                sessionAge > maxAgeMs) {
                this.deleteSession(sessionId);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Get session statistics
     */
    getStatistics() {
        const byStatus = new Map();
        const byUser = new Map();
        let totalQueries = 0;
        let totalBreakpointHits = 0;
        for (const session of this.sessions.values()) {
            // Count by status
            const status = session.state.status;
            byStatus.set(status, (byStatus.get(status) || 0) + 1);
            // Count by user
            byUser.set(session.userId, (byUser.get(session.userId) || 0) + 1);
            // Aggregate metadata
            totalQueries += session.metadata.totalQueries;
            totalBreakpointHits += session.metadata.breakpointHits;
        }
        return {
            totalSections: this.sessions.size,
            byStatus,
            byUser,
            totalQueries,
            totalBreakpointHits,
        };
    }
    /**
     * Get default session config
     */
    getDefaultConfig(partial) {
        return {
            database: partial.database || '',
            debugLevel: partial.debugLevel ?? types_1.DebugLevel.NORMAL,
            autoBreakOnError: partial.autoBreakOnError ?? true,
            maxHistorySize: partial.maxHistorySize ?? 1000,
            enableTimeTravel: partial.enableTimeTravel ?? true,
        };
    }
    /**
     * Get initial session state
     */
    /*
    private _getInitialState(): SessionState {
        return {
            status: 'RUNNING',
            activeBreakpoints: [],
            callStack: [],
        };
    }
    */
    /**
     * Get initial metadata
     */
    getInitialMetadata() {
        return {
            totalQueries: 0,
            breakpointHits: 0,
            totalExecutionTime: 0,
        };
    }
}
exports.SessionManager = SessionManager;

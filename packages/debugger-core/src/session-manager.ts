/**
 * Session Manager
 * Manages debug sessions and their lifecycle
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
    DebugSession,
    DebugSessionConfig,
    SessionState,
    SessionMetadata,
    DebugLevel,
} from './types';

export class SessionManager extends EventEmitter {
    private sessions: Map<string, DebugSession> = new Map();
    private sessionsByUser: Map<string, Set<string>> = new Map();
    private maxSessionsPerUser: number = 5;

    /**
     * Create a new debug session
     */
    createSession(
        userId: string,
        connectionId: string,
        config: Partial<DebugSessionConfig> = {}
    ): DebugSession {
        // Check user session limit
        const userSessions = this.sessionsByUser.get(userId);
        if (userSessions && userSessions.size >= this.maxSessionsPerUser) {
            throw new Error(
                `User has reached maximum number of debug sessions (${this.maxSessionsPerUser})`
            );
        }

        const session: DebugSession = {
            id: uuidv4(),
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
        this.sessionsByUser.get(userId)!.add(session.id);

        this.emit('sessionCreated', session);
        return session;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): DebugSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): DebugSession[] {
        const sessionIds = this.sessionsByUser.get(userId);
        if (!sessionIds) return [];

        return Array.from(sessionIds)
            .map((id) => this.sessions.get(id))
            .filter((session): session is DebugSession => session !== undefined);
    }

    /**
     * Update session state
     */
    updateSessionState(sessionId: string, state: Partial<SessionState>): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

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
    updateSessionMetadata(
        sessionId: string,
        metadata: Partial<SessionMetadata>
    ): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.metadata = {
            ...session.metadata,
            ...metadata,
        };

        return true;
    }

    /**
     * Terminate a session (final state)
     */
    terminateSession(sessionId: string): boolean {
        return this.updateSessionState(sessionId, { status: 'TERMINATED' });
    }

    /**
     * Pause a session
     */
    pauseSession(sessionId: string): boolean {
        return this.updateSessionState(sessionId, { status: 'PAUSED' });
    }

    /**
     * Resume a session
     */
    resumeSession(sessionId: string): boolean {
        return this.updateSessionState(sessionId, { status: 'RUNNING' });
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        this.sessions.delete(sessionId);
        this.sessionsByUser.get(session.userId)?.delete(sessionId);

        this.emit('sessionDeleted', session);
        return true;
    }

    /**
     * Clean up inactive sessions
     */
    cleanupInactiveSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            const sessionAge = now - session.createdAt.getTime();

            if (
                (session.state.status === 'COMPLETED' || session.state.status === 'TERMINATED' || session.state.status === 'ERROR') &&
                sessionAge > maxAgeMs
            ) {
                this.deleteSession(sessionId);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Get session statistics
     */
    getStatistics(): {
        totalSections: number;
        byStatus: Map<SessionState['status'], number>;
        byUser: Map<string, number>;
        totalQueries: number;
        totalBreakpointHits: number;
    } {
        const byStatus = new Map<SessionState['status'], number>();
        const byUser = new Map<string, number>();
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
    private getDefaultConfig(
        partial: Partial<DebugSessionConfig>
    ): DebugSessionConfig {
        return {
            database: partial.database || '',
            debugLevel: partial.debugLevel ?? DebugLevel.NORMAL,
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
    private getInitialMetadata(): SessionMetadata {
        return {
            totalQueries: 0,
            breakpointHits: 0,
            totalExecutionTime: 0,
        };
    }
}

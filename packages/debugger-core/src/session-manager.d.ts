/**
 * Session Manager
 * Manages debug sessions and their lifecycle
 */
import { EventEmitter } from 'eventemitter3';
import { DebugSession, DebugSessionConfig, SessionState, SessionMetadata } from './types';
export declare class SessionManager extends EventEmitter {
    private sessions;
    private sessionsByUser;
    private maxSessionsPerUser;
    /**
     * Create a new debug session
     */
    createSession(userId: string, connectionId: string, config?: Partial<DebugSessionConfig>): DebugSession;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): DebugSession | undefined;
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): DebugSession[];
    /**
     * Update session state
     */
    updateSessionState(sessionId: string, state: Partial<SessionState>): boolean;
    /**
     * Update session metadata
     */
    updateSessionMetadata(sessionId: string, metadata: Partial<SessionMetadata>): boolean;
    /**
     * Terminate a session (final state)
     */
    terminateSession(sessionId: string): boolean;
    /**
     * Pause a session
     */
    pauseSession(sessionId: string): boolean;
    /**
     * Resume a session
     */
    resumeSession(sessionId: string): boolean;
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean;
    /**
     * Clean up inactive sessions
     */
    cleanupInactiveSessions(maxAgeMs?: number): number;
    /**
     * Get session statistics
     */
    getStatistics(): {
        totalSections: number;
        byStatus: Map<SessionState['status'], number>;
        byUser: Map<string, number>;
        totalQueries: number;
        totalBreakpointHits: number;
    };
    /**
     * Get default session config
     */
    private getDefaultConfig;
    /**
     * Get initial session state
     */
    private _getInitialState;
    /**
     * Get initial metadata
     */
    private getInitialMetadata;
}
//# sourceMappingURL=session-manager.d.ts.map
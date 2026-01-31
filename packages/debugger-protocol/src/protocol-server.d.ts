/**
 * WebSocket Protocol Server
 * Handles real-time communication between debugger UI and engine
 */
import { EventEmitter } from 'events';
import { DebugEngine } from '@bosdb/debugger-core';
export declare class ProtocolServer extends EventEmitter {
    private debugEngine;
    private wss;
    private clients;
    private sessionToClient;
    constructor(debugEngine: DebugEngine);
    /**
     * Start WebSocket server
     */
    start(server: any): void;
    /**
     * Handle incoming client message
     */
    private handleClientMessage;
    /**
     * Set up listeners for debug engine events
     */
    private setupEngineListeners;
    /**
     * Send message to client
     */
    private send;
    /**
     * Send error message
     */
    private sendError;
    /**
     * Broadcast message to all clients attached to a session
     */
    private broadcastToSession;
    /**
     * Generate unique client ID
     */
    private generateClientId;
    /**
     * Stop the server
     */
    stop(): void;
}
//# sourceMappingURL=protocol-server.d.ts.map
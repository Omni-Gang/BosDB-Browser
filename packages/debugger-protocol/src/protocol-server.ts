/**
 * WebSocket Protocol Server
 * Handles real-time communication between debugger UI and engine
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { DebugEngine } from '@bosdb/debugger-core';
import {
    ClientMessage,
    ServerMessage,
    // SessionCreatedMessage, // Unused
    StoppedMessage,
    BreakpointHitMessage,
    // ContinuedMessage, // Unused
    // OutputMessage,   // Unused
} from './protocol-types';
import { StoppedEvent, /* BreakpointHitEvent, ContinuedEvent, */ QueryExecution } from '@bosdb/debugger-core';

export class ProtocolServer extends EventEmitter {
    private wss: WebSocket.Server | null = null;
    private clients: Map<string, WebSocket> = new Map();
    private sessionToClient: Map<string, string> = new Map();

    constructor(private debugEngine: DebugEngine) {
        super();
        this.setupEngineListeners();
    }

    /**
     * Start WebSocket server
     */
    start(server: any): void {
        this.wss = new WebSocket.Server({ server });

        this.wss.on('connection', (ws: WebSocket, _req) => {
            const clientId = this.generateClientId();
            this.clients.set(clientId, ws);

            console.log(`Debug client connected: ${clientId}`);

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const message: ClientMessage = JSON.parse(data.toString());
                    await this.handleClientMessage(clientId, message, ws);
                } catch (error) {
                    this.sendError(ws, 'PARSE_ERROR', 'Invalid message format', error);
                }
            });

            ws.on('close', () => {
                console.log(`Debug client disconnected: ${clientId}`);
                this.clients.delete(clientId);

                // Clean up session mapping
                for (const [sessionId, cId] of this.sessionToClient.entries()) {
                    if (cId === clientId) {
                        this.sessionToClient.delete(sessionId);
                    }
                }
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });
    }

    /**
     * Handle incoming client message
     */
    private async handleClientMessage(
        clientId: string,
        message: ClientMessage,
        ws: WebSocket
    ): Promise<void> {
        try {
            switch (message.type) {
                case 'createSession': {
                    const session = this.debugEngine.createSession(
                        message.userId,
                        message.connectionId,
                        message.config
                    );

                    this.sessionToClient.set(session.id, clientId);

                    this.send(ws, {
                        type: 'sessionCreated',
                        sessionId: session.id,
                    });
                    break;
                }

                case 'attach': {
                    this.sessionToClient.set(message.sessionId, clientId);
                    break;
                }

                case 'detach': {
                    this.sessionToClient.delete(message.sessionId);
                    break;
                }

                case 'continue': {
                    this.debugEngine.resume(message.sessionId);
                    this.send(ws, {
                        type: 'continued',
                        sessionId: message.sessionId,
                    });
                    break;
                }

                case 'pause': {
                    this.debugEngine.pause(message.sessionId);
                    break;
                }

                case 'stepOver': {
                    await this.debugEngine.stepOver(message.sessionId);
                    break;
                }

                case 'stepInto': {
                    await this.debugEngine.stepInto(message.sessionId);
                    break;
                }

                case 'stepOut': {
                    await this.debugEngine.stepOut(message.sessionId);
                    break;
                }

                case 'setBreakpoint': {
                    const breakpoint = this.debugEngine.setBreakpoint(
                        message.sessionId,
                        message.breakpoint.type!,
                        message.breakpoint
                    );

                    this.send(ws, {
                        type: 'output',
                        category: 'log',
                        output: `Breakpoint set: ${breakpoint.id}`,
                    });
                    break;
                }

                case 'removeBreakpoint': {
                    this.debugEngine.removeBreakpoint(message.breakpointId);
                    break;
                }

                case 'getVariables': {
                    const variables = this.debugEngine.getVariables(
                        message.sessionId,
                        message.scope
                    );

                    this.send(ws, {
                        type: 'variables',
                        sessionId: message.sessionId,
                        scope: message.scope,
                        variables,
                    });
                    break;
                }

                case 'executeQuery': {
                    const result = await this.debugEngine.executeQuery(
                        message.sessionId,
                        message.query,
                        message.parameters
                    );

                    this.send(ws, {
                        type: 'queryResult',
                        sessionId: message.sessionId,
                        queryId: 'generated-id',  // Would be from execution
                        result,
                    });
                    break;
                }

                default: {
                    this.sendError(ws, 'UNKNOWN_MESSAGE', `Unknown message type: ${(message as any).type}`);
                }
            }
        } catch (error: any) {
            this.sendError(ws, 'HANDLER_ERROR', error.message, error);
        }
    }

    /**
     * Set up listeners for debug engine events
     */
    private setupEngineListeners(): void {
        this.debugEngine.on('paused', (event: StoppedEvent) => {
            const message: StoppedMessage = {
                type: 'stopped',
                sessionId: event.details.sessionId, // Adjusted based on StoppedEvent structure
                reason: event.reason,
                details: event.details,
            };

            this.broadcastToSession(event.details.sessionId, message);
        });

        this.debugEngine.on('breakpointHit', (event: { breakpoint: any, context: any }) => {
            const message: BreakpointHitMessage = {
                type: 'breakpointHit',
                sessionId: event.context.sessionId,
                breakpoint: event.breakpoint,
                executionPoint: event.context.executionPoint,
            };

            this.broadcastToSession(event.context.sessionId, message);
        });

        this.debugEngine.on('resumed', (event: { sessionId: string }) => {
            this.broadcastToSession(event.sessionId, {
                type: 'continued',
                sessionId: event.sessionId,
            });
        });

        this.debugEngine.on('queryStarted', (execution: QueryExecution) => {
            const sessionId = execution.queryId; // Would need to track this properly
            this.broadcastToSession(sessionId, {
                type: 'output',
                category: 'log',
                output: `Query started: ${execution.sql}`,
            });
        });

        this.debugEngine.on('queryCompleted', (execution: QueryExecution) => {
            const sessionId = execution.queryId; // Would need to track this properly
            this.broadcastToSession(sessionId, {
                type: 'output',
                category: 'log',
                output: `Query completed in ${execution.duration}ms`,
            });
        });
    }

    /**
     * Send message to client
     */
    private send(ws: WebSocket, message: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error message
     */
    private sendError(ws: WebSocket, code: string, message: string, details?: any): void {
        this.send(ws, {
            type: 'error',
            code,
            message,
            details,
        });
    }

    /**
     * Broadcast message to all clients attached to a session
     */
    private broadcastToSession(sessionId: string, message: ServerMessage): void {
        const clientId = this.sessionToClient.get(sessionId);
        if (!clientId) return;

        const ws = this.clients.get(clientId);
        if (ws) {
            this.send(ws, message);
        }
    }

    /**
     * Generate unique client ID
     */
    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Stop the server
     */
    stop(): void {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        this.clients.clear();
        this.sessionToClient.clear();
    }
}

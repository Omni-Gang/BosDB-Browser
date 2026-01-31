"use strict";
/**
 * WebSocket Protocol Server
 * Handles real-time communication between debugger UI and engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolServer = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
class ProtocolServer extends events_1.EventEmitter {
    constructor(debugEngine) {
        super();
        this.debugEngine = debugEngine;
        this.wss = null;
        this.clients = new Map();
        this.sessionToClient = new Map();
        this.setupEngineListeners();
    }
    /**
     * Start WebSocket server
     */
    start(server) {
        this.wss = new ws_1.default.Server({ server });
        this.wss.on('connection', (ws, _req) => {
            const clientId = this.generateClientId();
            this.clients.set(clientId, ws);
            console.log(`Debug client connected: ${clientId}`);
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleClientMessage(clientId, message, ws);
                }
                catch (error) {
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
    async handleClientMessage(clientId, message, ws) {
        try {
            switch (message.type) {
                case 'createSession': {
                    const session = this.debugEngine.createSession(message.userId, message.connectionId, message.config);
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
                    const breakpoint = this.debugEngine.setBreakpoint(message.sessionId, message.breakpoint.type, message.breakpoint);
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
                    const variables = this.debugEngine.getVariables(message.sessionId, message.scope);
                    this.send(ws, {
                        type: 'variables',
                        sessionId: message.sessionId,
                        scope: message.scope,
                        variables,
                    });
                    break;
                }
                case 'executeQuery': {
                    const result = await this.debugEngine.executeQuery(message.sessionId, message.query, message.parameters);
                    this.send(ws, {
                        type: 'queryResult',
                        sessionId: message.sessionId,
                        queryId: 'generated-id', // Would be from execution
                        result,
                    });
                    break;
                }
                default: {
                    this.sendError(ws, 'UNKNOWN_MESSAGE', `Unknown message type: ${message.type}`);
                }
            }
        }
        catch (error) {
            this.sendError(ws, 'HANDLER_ERROR', error.message, error);
        }
    }
    /**
     * Set up listeners for debug engine events
     */
    setupEngineListeners() {
        this.debugEngine.on('paused', (event) => {
            const message = {
                type: 'stopped',
                sessionId: event.details.sessionId, // Adjusted based on StoppedEvent structure
                reason: event.reason,
                details: event.details,
            };
            this.broadcastToSession(event.details.sessionId, message);
        });
        this.debugEngine.on('breakpointHit', (event) => {
            const message = {
                type: 'breakpointHit',
                sessionId: event.context.sessionId,
                breakpoint: event.breakpoint,
                executionPoint: event.context.executionPoint,
            };
            this.broadcastToSession(event.context.sessionId, message);
        });
        this.debugEngine.on('resumed', (event) => {
            this.broadcastToSession(event.sessionId, {
                type: 'continued',
                sessionId: event.sessionId,
            });
        });
        this.debugEngine.on('queryStarted', (execution) => {
            const sessionId = execution.queryId; // Would need to track this properly
            this.broadcastToSession(sessionId, {
                type: 'output',
                category: 'log',
                output: `Query started: ${execution.sql}`,
            });
        });
        this.debugEngine.on('queryCompleted', (execution) => {
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
    send(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    /**
     * Send error message
     */
    sendError(ws, code, message, details) {
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
    broadcastToSession(sessionId, message) {
        const clientId = this.sessionToClient.get(sessionId);
        if (!clientId)
            return;
        const ws = this.clients.get(clientId);
        if (ws) {
            this.send(ws, message);
        }
    }
    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Stop the server
     */
    stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.clients.clear();
        this.sessionToClient.clear();
    }
}
exports.ProtocolServer = ProtocolServer;
//# sourceMappingURL=protocol-server.js.map
/**
 * Protocol message types for client-server communication
 */

import {
    DebugSessionConfig,
    Breakpoint,
    QueryResult,
    Variable,
    Scope,
    ExecutionPoint,
} from '@bosdb/debugger-core';

// ========== Client to Server Messages ==========

export type ClientMessage =
    | CreateSessionMessage
    | AttachSessionMessage
    | DetachSessionMessage
    | ContinueMessage
    | PauseMessage
    | StepOverMessage
    | StepIntoMessage
    | StepOutMessage
    | SetBreakpointMessage
    | RemoveBreakpointMessage
    | EvaluateMessage
    | GetVariablesMessage
    | GetStackTraceMessage
    | ExecuteQueryMessage;

export interface CreateSessionMessage {
    type: 'createSession';
    userId: string;
    connectionId: string;
    config?: Partial<DebugSessionConfig>;
}

export interface AttachSessionMessage {
    type: 'attach';
    sessionId: string;
}

export interface DetachSessionMessage {
    type: 'detach';
    sessionId: string;
}

export interface ContinueMessage {
    type: 'continue';
    sessionId: string;
}

export interface PauseMessage {
    type: 'pause';
    sessionId: string;
}

export interface StepOverMessage {
    type: 'stepOver';
    sessionId: string;
}

export interface StepIntoMessage {
    type: 'stepInto';
    sessionId: string;
}

export interface StepOutMessage {
    type: 'stepOut';
    sessionId: string;
}

export interface SetBreakpointMessage {
    type: 'setBreakpoint';
    sessionId: string;
    breakpoint: Partial<Breakpoint>;
}

export interface RemoveBreakpointMessage {
    type: 'removeBreakpoint';
    breakpointId: string;
}

export interface EvaluateMessage {
    type: 'evaluate';
    sessionId: string;
    expression: string;
    frameId?: string;
}

export interface GetVariablesMessage {
    type: 'getVariables';
    sessionId: string;
    scope: Scope;
}

export interface GetStackTraceMessage {
    type: 'getStackTrace';
    sessionId: string;
}

export interface ExecuteQueryMessage {
    type: 'executeQuery';
    sessionId: string;
    query: string;
    parameters?: any[];
}

// ========== Server to Client Messages ==========

export type ServerMessage =
    | SessionCreatedMessage
    | StoppedMessage
    | ContinuedMessage
    | BreakpointHitMessage
    | StateChangedMessage
    | OutputMessage
    | ErrorMessage
    | QueryResultMessage
    | VariablesMessage
    | StackTraceMessage;

export interface SessionCreatedMessage {
    type: 'sessionCreated';
    sessionId: string;
}

export interface StoppedMessage {
    type: 'stopped';
    sessionId: string;
    reason: 'breakpoint' | 'step' | 'pause' | 'exception' | 'error';
    executionPoint?: ExecutionPoint;
    details?: any;
}

export interface ContinuedMessage {
    type: 'continued';
    sessionId: string;
}

export interface BreakpointHitMessage {
    type: 'breakpointHit';
    sessionId: string;
    breakpoint: Breakpoint;
    executionPoint: ExecutionPoint;
}

export interface StateChangedMessage {
    type: 'stateChanged';
    sessionId: string;
    state: {
        status: 'running' | 'paused' | 'stopped' | 'error';
        currentExecutionPoint?: ExecutionPoint;
    };
}

export interface OutputMessage {
    type: 'output';
    category: 'stdout' | 'stderr' | 'log';
    output: string;
}

export interface ErrorMessage {
    type: 'error';
    code: string;
    message: string;
    details?: any;
}

export interface QueryResultMessage {
    type: 'queryResult';
    sessionId: string;
    queryId: string;
    result: QueryResult;
}

export interface VariablesMessage {
    type: 'variables';
    sessionId: string;
    scope: Scope;
    variables: Variable[];
}

export interface StackTraceMessage {
    type: 'stackTrace';
    sessionId: string;
    frames: any[];
}

// ========== REST API Types ==========

export interface CreateSessionRequest {
    userId: string;
    connectionId: string;
    config?: Partial<DebugSessionConfig>;
}

export interface CreateSessionResponse {
    sessionId: string;
    createdAt: string;
}

export interface SetBreakpointRequest {
    type: string;
    config: Partial<Breakpoint>;
}

export interface SetBreakpointResponse {
    breakpoint: Breakpoint;
}

export interface ExecuteQueryRequest {
    query: string;
    parameters?: any[];
}

export interface ExecuteQueryResponse {
    queryId: string;
    result?: QueryResult;
}

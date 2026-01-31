/**
 * Functional Debug Engine
 * Uses @bosdb/debugger-core types and integrates with DB adapters
 */

import { log } from './console-logger';
import {
    DebugSession as CoreSession,
    SessionState,
    ExecutionPoint,
    Breakpoint,
    Variable,
    Snapshot
} from '@bosdb/debugger-core';
import { getConnectedAdapter } from './db-utils';

export interface DebugStatement {
    sql: string;
    lineNumber: number;
}

// Extend core session with web-specific needs if necessary
export interface WebDebugSession extends Omit<CoreSession, 'state'> {
    statements: DebugStatement[];
    currentStatementIndex: number;
    state: SessionState & {
        variables: Variable[];
    };
    snapshots: Snapshot[];
    connectionId: string;
    query: string;
    sandbox: boolean;
    commitOnFinish: boolean;
    transactionConnectionId?: string;
}

// Global session storage
const globalForSessions = globalThis as unknown as {
    debugSessions: Map<string, WebDebugSession>
};

const SESSIONS = globalForSessions.debugSessions || new Map<string, WebDebugSession>();

if (process.env.NODE_ENV !== 'production') {
    globalForSessions.debugSessions = SESSIONS;
}

/**
 * Parse query into statements
 */
function parseStatements(query: string): DebugStatement[] {
    const statements: DebugStatement[] = [];
    let currentSQL = '';
    let lineCounter = 1;
    let statementStartLine = 1;
    let inString = false;
    let inComment = false;
    let inBlockComment = false;
    let inDollarQuote = false;
    let dollarTag = '';

    const chars = query.split('');
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const nextChar = chars[i + 1] || '';
        const prevChar = chars[i - 1] || '';

        if (char === '\n') {
            lineCounter++;
            if (inComment) inComment = false; // End of line comment
        }

        // Handle string literals
        if (!inComment && !inBlockComment && !inDollarQuote) {
            if (char === "'" && prevChar !== '\\') {
                inString = !inString;
            }
        }

        // Handle dollar quoting ($$ or $tag$)
        if (!inString && !inComment && !inBlockComment) {
            if (char === '$' && !inDollarQuote) {
                // Potential start of dollar quote
                let j = i + 1;
                while (j < chars.length && /[a-zA-Z0-9_]/.test(chars[j])) j++;
                if (chars[j] === '$') {
                    inDollarQuote = true;
                    dollarTag = query.substring(i, j + 1);
                    i = j; // Skip tag
                    currentSQL += dollarTag;
                    continue;
                }
            } else if (inDollarQuote && char === '$') {
                // Potential end of dollar quote
                if (query.substring(i, i + dollarTag.length) === dollarTag) {
                    inDollarQuote = false;
                    currentSQL += dollarTag;
                    i += dollarTag.length - 1; // Skip tag
                    continue;
                }
            }
        }

        // Handle comments
        if (!inString && !inDollarQuote) {
            if (!inComment && !inBlockComment) {
                if (char === '-' && nextChar === '-') {
                    inComment = true;
                } else if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                }
            } else if (inBlockComment && char === '*' && nextChar === '/') {
                inBlockComment = false;
                currentSQL += '*/';
                i++;
                continue;
            }
        }

        if (!currentSQL.trim() && char.trim()) statementStartLine = lineCounter;
        currentSQL += char;

        // Split by semicolon, but only if not inside any block
        if (!inString && !inDollarQuote && !inComment && !inBlockComment && char === ';') {
            if (currentSQL.trim()) {
                statements.push({
                    sql: currentSQL.trim().replace(/;$/, ''),
                    lineNumber: statementStartLine
                });
            }
            currentSQL = '';
        }
    }

    if (currentSQL.trim()) {
        statements.push({
            sql: currentSQL.trim(),
            lineNumber: statementStartLine
        });
    }

    return statements;
}

/**
 * Create debug session
 */
export function createDebugSession(
    connectionId: string,
    query: string,
    breakpoints: number[],
    options?: { sandbox?: boolean; commitOnFinish?: boolean; userId?: string | null }
): WebDebugSession {
    const userId = options?.userId;
    const sandbox = options?.sandbox !== false; // Default to true
    const commitOnFinish = options?.commitOnFinish || false;
    const id = `debug-${Date.now()}`;
    const statements = parseStatements(query);

    const session: WebDebugSession = {
        id,
        userId: userId || 'anonymous',
        connectionId,
        query,
        createdAt: new Date(),
        config: {
            database: '',
            debugLevel: 2,
            autoBreakOnError: true,
            maxHistorySize: 50,
            enableTimeTravel: true
        },
        statements,
        currentStatementIndex: 0,
        state: {
            status: 'PAUSED',
            activeBreakpoints: [],
            callStack: [],
            variables: []
        },
        metadata: {
            totalQueries: statements.length,
            breakpointHits: 0,
        },
        snapshots: [],
        breakpoints: [], // Core session compatibility
        sandbox,
        commitOnFinish
    } as any;

    // Map initial breakpoints
    session.state.activeBreakpoints = (breakpoints || []).map(line => ({
        id: `bp-${line}`,
        sessionId: id,
        type: 'line',
        enabled: true,
        hitCount: 0,
        lineNumber: line
    } as any));

    captureSnapshot(session);
    SESSIONS.set(id, session);

    // Titan Feature: Transactional Sandbox
    // Start transaction immediately if sandbox mode is active
    if (sandbox) {
        getConnectedAdapter(connectionId).then(async ({ adapter }) => {
            try {
                const txnId = await adapter.startTransaction(connectionId);
                session.transactionConnectionId = txnId;
                log.info(`Sandbox transaction started for session ${id}: ${txnId}`);
            } catch (err) {
                log.error('Failed to start sandbox transaction', err);
                session.sandbox = false; // Disable sandbox if transaction failed
            }
        });
    }

    return session;
}

/**
 * Capture state snapshot
 */
function captureSnapshot(session: WebDebugSession): void {
    const snapshot: Snapshot & { statementIndex: number } = {
        id: `snap-${Date.now()}`,
        sessionId: session.id,
        timestamp: new Date(),
        executionPoint: {
            id: `exec-${session.currentStatementIndex}`,
            timestamp: new Date(),
            lineNumber: session.statements[session.currentStatementIndex]?.lineNumber || 0
        },
        statementIndex: session.currentStatementIndex,
        variables: new Map(session.state.variables.map(v => [v.name, v.value])),
        callStack: [],
        cursors: new Map(),
        storage: { compressed: false, sizeBytes: 0 }
    };
    session.snapshots.push(snapshot);
}

/**
 * Execute statement
 */
async function executeStatement(session: WebDebugSession, statement: DebugStatement) {
    try {
        const { adapter } = await getConnectedAdapter(session.connectionId);
        // Use transaction connection if available, otherwise fallback to pool connection
        const activeConnectionId = session.transactionConnectionId || session.connectionId;
        const result = await adapter.executeQuery({
            connectionId: activeConnectionId,
            query: statement.sql
        });

        // Update variables with result info
        const resultVar: Variable = {
            name: `last_result_line_${statement.lineNumber}`,
            value: {
                rowCount: result.rowCount,
                rows: result.rows.slice(0, 5) // Sample
            },
            type: 'object',
            scope: 'session',
            mutable: false
        };

        // Update or add variable
        const existingIdx = session.state.variables.findIndex(v => v.name === resultVar.name);
        if (existingIdx >= 0) {
            session.state.variables[existingIdx] = resultVar;
        } else {
            session.state.variables.push(resultVar);
        }

        log.debug(`Executed SQL in debug: ${statement.sql.substring(0, 30)}...`);

        // Titan Feature: Shadowed Variable Probing
        // Automatically probe for session variables after each step
        try {
            if (typeof adapter.getVariables === 'function') {
                const probedVars = await adapter.getVariables(session.connectionId);
                if (probedVars && probedVars.length > 0) {
                    // Update session variables
                    probedVars.forEach((newVar: Variable) => {
                        const existingIdx = session.state.variables.findIndex(v => v.name === newVar.name);
                        if (existingIdx >= 0) {
                            session.state.variables[existingIdx] = newVar;
                        } else {
                            session.state.variables.push(newVar);
                        }
                    });
                    log.debug(`Probed ${probedVars.length} variables for session ${session.id}`);
                }
            }
        } catch (probeError) {
            log.warn('Variable probing failed', probeError);
        }
    } catch (error: any) {
        log.error(`Debug execution failed for line ${statement.lineNumber}`, error);
        session.state.variables.push({
            name: `error_line_${statement.lineNumber}`,
            value: error.message,
            type: 'string',
            scope: 'session',
            mutable: false
        });
    }
}

/**
 * Step Over
 */
export async function stepDebugSession(sessionId: string) {
    const session = SESSIONS.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (session.currentStatementIndex >= session.statements.length) {
        session.state.status = 'COMPLETED';
        await endDebugSession(session);
        return { success: true, completed: true };
    }

    const statement = session.statements[session.currentStatementIndex];
    await executeStatement(session, statement);

    session.currentStatementIndex++;
    session.state.status = 'PAUSED';
    session.state.currentExecutionPoint = {
        id: `exec-${session.currentStatementIndex}`,
        timestamp: new Date(),
        lineNumber: session.statements[session.currentStatementIndex]?.lineNumber || statement.lineNumber
    };

    captureSnapshot(session);
    return { success: true, currentStatement: statement };
}

/**
 * Continue
 */
export async function continueDebugSession(sessionId: string) {
    const session = SESSIONS.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.state.status = 'RUNNING';

    while (session.currentStatementIndex < session.statements.length) {
        const statement = session.statements[session.currentStatementIndex];

        // Check breakpoint BEFORE executing
        const bp = session.state.activeBreakpoints.find(b => (b as any).lineNumber === statement.lineNumber);
        if (bp && bp.enabled) {
            session.state.status = 'PAUSED';
            log.debug(`Paused at breakpoint line ${statement.lineNumber}`);
            return { success: true, pausedAt: statement.lineNumber };
        }

        await executeStatement(session, statement);
        session.currentStatementIndex++;
        captureSnapshot(session);
    }

    session.state.status = 'COMPLETED';
    await endDebugSession(session);
    return { success: true, completed: true };
}

/**
 * Clean up debug session (transactions, etc.)
 */
async function endDebugSession(session: WebDebugSession) {
    if (session.transactionConnectionId) {
        try {
            const { adapter } = await getConnectedAdapter(session.connectionId);
            if (session.commitOnFinish) {
                await adapter.commitTransaction(session.transactionConnectionId);
                log.info(`Sandbox transaction COMMITTED for session ${session.id}`);
            } else {
                await adapter.rollbackTransaction(session.transactionConnectionId);
                log.info(`Sandbox transaction ROLLED BACK for session ${session.id}`);
            }
        } catch (err) {
            log.error('Failed to finalize sandbox transaction', err);
        } finally {
            delete session.transactionConnectionId;
        }
    }
}

/**
 * Rewind (Step Back)
 */
export async function rewindSession(sessionId: string) {
    const session = SESSIONS.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (session.snapshots.length <= 1) {
        session.currentStatementIndex = 0;
        return { success: true, currentStatement: session.statements[0] };
    }

    session.snapshots.pop();
    const lastSnap = session.snapshots[session.snapshots.length - 1];

    // Restore index from exec point id "exec-N"
    const idx = parseInt(lastSnap.executionPoint.id.split('-')[1]);
    session.currentStatementIndex = idx;
    session.state.currentExecutionPoint = lastSnap.executionPoint;
    session.state.variables = Array.from(lastSnap.variables.entries()).map(([name, value]) => ({
        name, value, type: typeof value, scope: 'session', mutable: false
    } as Variable));

    return { success: true, currentStatement: session.statements[idx] };
}

export function getDebugSession(id: string) {
    return SESSIONS.get(id) || null;
}

export async function deleteSession(id: string) {
    const session = SESSIONS.get(id);
    if (session) {
        await endDebugSession(session);
        SESSIONS.delete(id);
    }
}

/**
 * Compatibility Wrapper
 */
export function getDebugEngine() {
    return {
        getSession: getDebugSession,
        createSession: createDebugSession,
        stepOver: stepDebugSession,
        continue: continueDebugSession,
        rewind: rewindSession,
        deleteSession: deleteSession,
        resume: (id: string) => {
            const s = getDebugSession(id);
            if (s) s.state.status = 'RUNNING';
        },
        pause: (id: string) => {
            const s = getDebugSession(id);
            if (s) s.state.status = 'PAUSED';
        },
        setBreakpoint: (sessionId: string, type: string, config: any) => {
            const session = getDebugSession(sessionId);
            if (!session) return null;

            const line = config.line || config.lineNumber;
            if (typeof line === 'number') {
                const existing = session.state.activeBreakpoints.find(b => (b as any).lineNumber === line);
                if (!existing) {
                    session.state.activeBreakpoints.push({
                        id: `bp-${line}`,
                        sessionId,
                        type: 'line',
                        enabled: true,
                        hitCount: 0,
                        lineNumber: line
                    } as any);
                }
                return { id: `bp-${line}`, type, config: { line } };
            }
            return { id: `unknown-${Date.now()}`, type, config };
        },
        getBreakpoints: (sessionId: string) => {
            const session = getDebugSession(sessionId);
            if (!session) return [];
            return session.state.activeBreakpoints.map(b => ({
                id: b.id,
                type: b.type,
                config: { line: (b as any).lineNumber }
            }));
        }
    };
}

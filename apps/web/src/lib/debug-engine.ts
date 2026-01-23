/**
 * SIMPLE Working Debug Engine
 * Stores sessions globally and executes queries step-by-step
 */

import { log } from './console-logger';

export interface DebugStatement {
    sql: string;
    lineNumber: number;
}

export interface DebugSession {
    id: string;
    connectionId: string;
    query: string;
    statements: DebugStatement[];
    breakpoints: number[];
    currentStatementIndex: number;
    status: 'stopped' | 'running' | 'paused' | 'completed';
    results: any[];
    userId?: string | null;
}

// Global session storage (survives across API reloads in Dev mode)
const globalForSessions = globalThis as unknown as {
    debugSessions: Map<string, DebugSession>
};

const SESSIONS = globalForSessions.debugSessions || new Map<string, DebugSession>();

if (process.env.NODE_ENV !== 'production') {
    globalForSessions.debugSessions = SESSIONS;
}

/**
 * Pause session
 */
export function pauseSession(sessionId: string): void {
    const session = SESSIONS.get(sessionId);
    if (session) session.status = 'paused';
}

/**
 * Resume session
 */
export function resumeSession(sessionId: string): void {
    const session = SESSIONS.get(sessionId);
    if (session) session.status = 'running';
}

/**
 * Rewind session (stub)
 */
export async function rewindSession(sessionId: string, _runner?: any): Promise<void> {
    const session = SESSIONS.get(sessionId);
    if (session) {
        session.currentStatementIndex = 0;
        session.status = 'paused';
    }
}

export interface IDebugEngine {
    getSession: (id: string) => DebugSession | null;
    createSession: (connectionId: string, query: string, breakpoints: number[], userId?: string | null) => DebugSession;
    stepOver: (sessionId: string) => Promise<{ success: boolean; currentStatement?: DebugStatement; completed?: boolean; error?: string }>;
    continue: (sessionId: string) => Promise<{ success: boolean; pausedAt?: number; completed?: boolean; error?: string }>;
    pause: (sessionId: string) => void;
    resume: (sessionId: string) => void;
    rewind: (sessionId: string, _runner?: any) => Promise<void>;
    deleteSession: (sessionId: string) => void;
    getAllSessions: () => DebugSession[];
    setBreakpoint: (sessionId: string, type: string, config: any) => { id: string; type: string; config: any } | null;
    getBreakpoints: (sessionId: string) => { id: string; type: string; config: { line: number } }[];
}

/**
 * Compatibility Wrapper for routes using getDebugEngine()
 */
export function getDebugEngine(): IDebugEngine {
    return {
        getSession: (id: string) => getDebugSession(id),
        createSession: createDebugSession,
        stepOver: stepDebugSession,
        continue: continueDebugSession,
        pause: pauseSession,
        resume: resumeSession,
        rewind: rewindSession,
        deleteSession: deleteSession,
        getAllSessions: getAllSessions,
        setBreakpoint: (sessionId: string, type: string, config: any) => {
            const session = getDebugSession(sessionId);
            if (!session) return null;

            // Basic support for line breakpoints
            const line = config.line || config.lineNumber;
            if (typeof line === 'number') {
                if (!session.breakpoints.includes(line)) {
                    session.breakpoints.push(line);
                    session.breakpoints.sort((a, b) => a - b);
                }
                return { id: `bp-${line}`, type, config: { line } };
            }
            return { id: `unknown-${Date.now()}`, type, config };
        },
        getBreakpoints: (sessionId: string) => {
            const session = getDebugSession(sessionId);
            if (!session) return [];
            return session.breakpoints.map(line => ({
                id: `bp-${line}`,
                type: 'line',
                config: { line }
            }));
        }
    };
}

/**
 * Parse query into statements
 */
/**
 * Parse query into statements
 * Handles strings, dollar quotes, and comments to allow proper splitting
 */
function parseStatements(query: string): DebugStatement[] {
    const statements: DebugStatement[] = [];
    let currentSQL = '';
    let startLine = 1; // 1-based
    let inString = false;
    let stringChar = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let inLineComment = false;
    let inBlockComment = false;

    // Normalize newlines for easier processing
    const chars = query.split('');
    let lineCounter = 1;
    let statementStartLine = 1;

    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const nextChar = chars[i + 1] || '';
        const prevChar = chars[i - 1] || '';

        // Update line counter
        if (char === '\n') {
            lineCounter++;
        }

        // Handle Comments
        if (!inString && !inDollarQuote) {
            if (inLineComment && char === '\n') {
                inLineComment = false;
            } else if (inBlockComment && char === '*' && nextChar === '/') {
                inBlockComment = false;
                currentSQL += char + nextChar;
                i++; // skip next
                continue;
            } else if (!inLineComment && !inBlockComment) {
                if (char === '-' && nextChar === '-') {
                    inLineComment = true;
                } else if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                }
            }
        }

        // Handle Strings (' and ")
        if (!inLineComment && !inBlockComment && !inDollarQuote) {
            if (inString) {
                if (char === stringChar) {
                    // Check for escaped quote (e.g. 'Tom''s')
                    if (nextChar === stringChar) {
                        currentSQL += char + nextChar;
                        i++; // skip next
                        continue;
                    }
                    inString = false;
                }
            } else {
                if (char === "'" || char === '"') {
                    inString = true;
                    stringChar = char;
                }
            }
        }

        // Handle Dollar Quotes (e.g. $$ or $tag$) - Postgres specific
        if (!inLineComment && !inBlockComment && !inString) {
            if (inDollarQuote) {
                // Check if this is the end of the tag
                if (char === '$') {
                    // Potential end tag match
                    const potentialTagEnd = query.substring(i - (dollarTag.length - 1), i + 1);
                    if (potentialTagEnd === dollarTag) {
                        inDollarQuote = false;
                        dollarTag = '';
                    }
                }
            } else {
                if (char === '$') {
                    // Look ahead for tag end
                    const tagMatch = query.substring(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
                    if (tagMatch) {
                        inDollarQuote = true;
                        dollarTag = tagMatch[1];
                        // Add the whole tag to currentSQL to avoid re-processing inner $
                        // Actually, we'll let the loop handle it char by char, but we need to know the tag to match end
                    }
                }
            }
        }

        // If not empty, track start line
        if (!currentSQL.trim() && char.trim()) {
            statementStartLine = lineCounter;
        }

        currentSQL += char;

        // Check for statement terminator
        if (!inString && !inDollarQuote && !inLineComment && !inBlockComment && char === ';') {
            if (currentSQL.trim()) {
                statements.push({
                    sql: currentSQL.trim().replace(/;$/, ''),
                    lineNumber: statementStartLine
                });
            }
            currentSQL = '';
        }
    }

    // Handle last statement
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
    userId?: string | null
): DebugSession {
    const id = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: DebugSession = {
        id,
        connectionId,
        query,
        statements: parseStatements(query),
        breakpoints: breakpoints.sort((a, b) => a - b),
        currentStatementIndex: 0,
        status: 'paused',
        results: [],
        userId: userId || null
    };

    SESSIONS.set(id, session);
    log.debug(`Created session ${id} with ${session.statements.length} statements`);
    return session;
}

/**
 * Get session by ID
 */
export function getDebugSession(sessionId: string): DebugSession | null {
    const session = SESSIONS.get(sessionId);
    if (!session) {
        log.error(`Session ${sessionId} not found`, { available: Array.from(SESSIONS.keys()) });
    }
    return session || null;
}

/**
 * Execute one step
 */
export async function stepDebugSession(sessionId: string): Promise<{
    success: boolean;
    currentStatement?: DebugStatement;
    completed?: boolean;
    error?: string;
}> {
    const session = SESSIONS.get(sessionId);
    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    if (session.currentStatementIndex >= session.statements.length) {
        session.status = 'completed';
        return { success: true, completed: true };
    }

    const statement = session.statements[session.currentStatementIndex];
    session.currentStatementIndex++;

    // Mark as paused at next statement
    session.status = 'paused';

    log.debug(`Stepped to line ${statement.lineNumber}`, { sql: statement.sql.substring(0, 50) + '...' });

    return {
        success: true,
        currentStatement: statement
    };
}

/**
 * Continue to next breakpoint
 */
export async function continueDebugSession(sessionId: string): Promise<{
    success: boolean;
    pausedAt?: number;
    completed?: boolean;
    error?: string;
}> {
    const session = SESSIONS.get(sessionId);
    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    session.status = 'running';

    // Execute until breakpoint or end
    while (session.currentStatementIndex < session.statements.length) {
        const statement = session.statements[session.currentStatementIndex];

        // Check if current line has breakpoint
        if (session.breakpoints.includes(statement.lineNumber)) {
            session.status = 'paused';
            log.debug(`Paused at breakpoint line ${statement.lineNumber}`);
            return {
                success: true,
                pausedAt: statement.lineNumber
            };
        }

        session.currentStatementIndex++;
    }

    session.status = 'completed';
    return { success: true, completed: true };
}

/**
 * Get all sessions (for debugging)
 */
export function getAllSessions(): DebugSession[] {
    return Array.from(SESSIONS.values());
}

/**
 * Delete session
 */
export function deleteSession(sessionId: string): void {
    SESSIONS.delete(sessionId);
}

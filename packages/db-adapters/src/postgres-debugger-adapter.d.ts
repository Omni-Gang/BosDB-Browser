import { IDebuggerAdapter } from './debugger-adapter';
import { Breakpoint, Variable, ExecutionPoint, QueryResult } from '@bosdb/debugger-core';
export declare class PostgresDebuggerAdapter implements IDebuggerAdapter {
    private runner;
    constructor(runner: (sql: string) => Promise<QueryResult>);
    setBreakpoint(breakpoint: Breakpoint): Promise<void>;
    removeBreakpoint(_breakpointId: string): Promise<void>;
    getVariables(sessionId: string): Promise<Variable[]>;
    stepNext(sessionId: string): Promise<ExecutionPoint>;
    stepInto(sessionId: string): Promise<ExecutionPoint>;
    stepOut(sessionId: string): Promise<ExecutionPoint>;
    continue(sessionId: string): Promise<void>;
    getCallStack(sessionId: string): Promise<any[]>;
    private mapToExecutionPoint;
}
//# sourceMappingURL=postgres-debugger-adapter.d.ts.map
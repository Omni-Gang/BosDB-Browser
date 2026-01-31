import { Breakpoint, Variable, ExecutionPoint } from '@bosdb/debugger-core';

export interface IDebuggerAdapter {
    /**
     * Set a breakpoint in the database
     */
    setBreakpoint(breakpoint: Breakpoint): Promise<void>;

    /**
     * Remove a breakpoint from the database
     */
    removeBreakpoint(breakpointId: string): Promise<void>;

    /**
     * Get current variable values from the database session
     */
    getVariables(sessionId: string): Promise<Variable[]>;

    /**
     * Step to the next line of code
     */
    stepNext(sessionId: string): Promise<ExecutionPoint>;

    /**
     * Step into a function or procedure
     */
    stepInto(sessionId: string): Promise<ExecutionPoint>;

    /**
     * Step out of the current function or procedure
     */
    stepOut(sessionId: string): Promise<ExecutionPoint>;

    /**
     * Continue execution until the next breakpoint or completion
     */
    continue(sessionId: string): Promise<void>;

    /**
     * Get the current call stack from the database
     */
    getCallStack(sessionId: string): Promise<any[]>;
}

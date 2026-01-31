import { IDebuggerAdapter } from './debugger-adapter';
import { Breakpoint, Variable, ExecutionPoint, QueryResult } from '@bosdb/debugger-core';

export class PostgresDebuggerAdapter implements IDebuggerAdapter {
    constructor(private runner: (sql: string) => Promise<QueryResult>) { }

    async setBreakpoint(breakpoint: Breakpoint): Promise<void> {
        if (breakpoint.type === 'line') {
            const lbp = breakpoint as any;
            await this.runner(`SELECT pldbg_set_breakpoint(${lbp.sessionId}, ${lbp.procedureId}, ${lbp.lineNumber})`);
        }
    }

    async removeBreakpoint(_breakpointId: string): Promise<void> {
        // Implementation using pldbg_drop_breakpoint
    }

    async getVariables(sessionId: string): Promise<Variable[]> {
        const result = await this.runner(`SELECT * FROM pldbg_get_variables(${sessionId})`);
        return result.rows.map((row: any) => ({
            name: row.name,
            value: row.value,
            type: row.type,
            scope: 'local',
            mutable: true
        }));
    }

    async stepNext(sessionId: string): Promise<ExecutionPoint> {
        const result = await this.runner(`SELECT * FROM pldbg_step_over(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }

    async stepInto(sessionId: string): Promise<ExecutionPoint> {
        const result = await this.runner(`SELECT * FROM pldbg_step_into(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }

    async stepOut(sessionId: string): Promise<ExecutionPoint> {
        const result = await this.runner(`SELECT * FROM pldbg_step_out(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }

    async continue(sessionId: string): Promise<void> {
        await this.runner(`SELECT pldbg_continue(${sessionId})`);
    }

    async getCallStack(sessionId: string): Promise<any[]> {
        const result = await this.runner(`SELECT * FROM pldbg_get_stack(${sessionId})`);
        return result.rows;
    }

    private mapToExecutionPoint(row: any): ExecutionPoint {
        return {
            id: row.id || 'unknown',
            timestamp: new Date(),
            lineNumber: row.linenr,
            procedureId: row.funcid
        };
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDebuggerAdapter = void 0;
class PostgresDebuggerAdapter {
    constructor(runner) {
        this.runner = runner;
    }
    async setBreakpoint(breakpoint) {
        if (breakpoint.type === 'line') {
            const lbp = breakpoint;
            await this.runner(`SELECT pldbg_set_breakpoint(${lbp.sessionId}, ${lbp.procedureId}, ${lbp.lineNumber})`);
        }
    }
    async removeBreakpoint(_breakpointId) {
        // Implementation using pldbg_drop_breakpoint
    }
    async getVariables(sessionId) {
        const result = await this.runner(`SELECT * FROM pldbg_get_variables(${sessionId})`);
        return result.rows.map((row) => ({
            name: row.name,
            value: row.value,
            type: row.type,
            scope: 'local',
            mutable: true
        }));
    }
    async stepNext(sessionId) {
        const result = await this.runner(`SELECT * FROM pldbg_step_over(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }
    async stepInto(sessionId) {
        const result = await this.runner(`SELECT * FROM pldbg_step_into(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }
    async stepOut(sessionId) {
        const result = await this.runner(`SELECT * FROM pldbg_step_out(${sessionId})`);
        return this.mapToExecutionPoint(result.rows[0]);
    }
    async continue(sessionId) {
        await this.runner(`SELECT pldbg_continue(${sessionId})`);
    }
    async getCallStack(sessionId) {
        const result = await this.runner(`SELECT * FROM pldbg_get_stack(${sessionId})`);
        return result.rows;
    }
    mapToExecutionPoint(row) {
        return {
            id: row.id || 'unknown',
            timestamp: new Date(),
            lineNumber: row.linenr,
            procedureId: row.funcid
        };
    }
}
exports.PostgresDebuggerAdapter = PostgresDebuggerAdapter;
//# sourceMappingURL=postgres-debugger-adapter.js.map
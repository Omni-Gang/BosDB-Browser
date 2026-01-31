"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerDebugger = void 0;
class TriggerDebugger {
    /**
     * Intercept a DML statement to detect and track trigger execution
     */
    async interceptDML(_sessionId, dml, _executionPoint, runner) {
        const dmlType = this.detectDMLType(dml);
        if (!dmlType)
            return undefined;
        const tableName = this.detectTableName(dml);
        if (!tableName)
            return undefined;
        // Capture :OLD values before execution (for UPDATE and DELETE)
        let oldValues = undefined;
        if (dmlType === 'UPDATE' || dmlType === 'DELETE') {
            oldValues = await this.captureOldValues(tableName, dml, runner);
        }
        return {
            name: `TRG_${tableName}_${dmlType}`,
            table: tableName,
            timing: 'BEFORE', // Initial assumption, can be refined
            event: dmlType,
            oldValues,
            dml,
        };
    }
    /**
     * Finalize trigger context after execution (capture :NEW values)
     */
    async finalizeTrigger(context, runner) {
        if (context.event === 'INSERT' || context.event === 'UPDATE') {
            context.newValues = await this.captureNewValues(context.table, context.dml, runner);
        }
        context.timing = 'AFTER';
        return context;
    }
    detectDMLType(sql) {
        const s = sql.trim().toUpperCase();
        if (s.startsWith('INSERT '))
            return 'INSERT';
        if (s.startsWith('UPDATE '))
            return 'UPDATE';
        if (s.startsWith('DELETE '))
            return 'DELETE';
        return undefined;
    }
    detectTableName(sql) {
        const s = sql.trim().toUpperCase();
        const match = s.match(/(?:INTO|UPDATE|FROM)\s+["']?(\w+)["']?/i);
        return match ? match[1] : undefined;
    }
    async captureOldValues(table, dml, runner) {
        // Simplified: extract WHERE clause from DML and select from table
        const whereMatch = dml.match(/WHERE\s+(.*)/i);
        if (whereMatch) {
            const selectSql = `SELECT * FROM "${table}" WHERE ${whereMatch[1]}`;
            const result = await runner(selectSql);
            return result.rows;
        }
        return undefined;
    }
    async captureNewValues(table, dml, runner) {
        // In a real implementation, we might use RETURNING clause or session-level last inserted ID
        // For this demo, we'll try to re-query using the same WHERE clause if possible
        return this.captureOldValues(table, dml, runner);
    }
}
exports.TriggerDebugger = TriggerDebugger;
//# sourceMappingURL=trigger-debugger.js.map
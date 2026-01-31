import { TriggerContext, ExecutionPoint, QueryResult } from './types';

export class TriggerDebugger {
    /**
     * Intercept a DML statement to detect and track trigger execution
     */
    async interceptDML(
        _sessionId: string,
        dml: string,
        _executionPoint: ExecutionPoint,
        runner: (sql: string) => Promise<QueryResult>
    ): Promise<TriggerContext | undefined> {
        const dmlType = this.detectDMLType(dml);
        if (!dmlType) return undefined;

        const tableName = this.detectTableName(dml);
        if (!tableName) return undefined;

        // Capture :OLD values before execution (for UPDATE and DELETE)
        let oldValues: any = undefined;
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
    async finalizeTrigger(
        context: TriggerContext,
        runner: (sql: string) => Promise<QueryResult>
    ): Promise<TriggerContext> {
        if (context.event === 'INSERT' || context.event === 'UPDATE') {
            context.newValues = await this.captureNewValues(context.table, context.dml, runner);
        }
        context.timing = 'AFTER';
        return context;
    }

    private detectDMLType(sql: string): 'INSERT' | 'UPDATE' | 'DELETE' | undefined {
        const s = sql.trim().toUpperCase();
        if (s.startsWith('INSERT ')) return 'INSERT';
        if (s.startsWith('UPDATE ')) return 'UPDATE';
        if (s.startsWith('DELETE ')) return 'DELETE';
        return undefined;
    }

    private detectTableName(sql: string): string | undefined {
        const s = sql.trim().toUpperCase();
        const match = s.match(/(?:INTO|UPDATE|FROM)\s+["']?(\w+)["']?/i);
        return match ? match[1] : undefined;
    }

    private async captureOldValues(table: string, dml: string, runner: (sql: string) => Promise<QueryResult>): Promise<any> {
        // Simplified: extract WHERE clause from DML and select from table
        const whereMatch = dml.match(/WHERE\s+(.*)/i);
        if (whereMatch) {
            const selectSql = `SELECT * FROM "${table}" WHERE ${whereMatch[1]}`;
            const result = await runner(selectSql);
            return result.rows;
        }
        return undefined;
    }

    private async captureNewValues(table: string, dml: string, runner: (sql: string) => Promise<QueryResult>): Promise<any> {
        // In a real implementation, we might use RETURNING clause or session-level last inserted ID
        // For this demo, we'll try to re-query using the same WHERE clause if possible
        return this.captureOldValues(table, dml, runner);
    }
}

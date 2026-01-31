import { TriggerContext, ExecutionPoint, QueryResult } from './types';
export declare class TriggerDebugger {
    /**
     * Intercept a DML statement to detect and track trigger execution
     */
    interceptDML(_sessionId: string, dml: string, _executionPoint: ExecutionPoint, runner: (sql: string) => Promise<QueryResult>): Promise<TriggerContext | undefined>;
    /**
     * Finalize trigger context after execution (capture :NEW values)
     */
    finalizeTrigger(context: TriggerContext, runner: (sql: string) => Promise<QueryResult>): Promise<TriggerContext>;
    private detectDMLType;
    private detectTableName;
    private captureOldValues;
    private captureNewValues;
}
//# sourceMappingURL=trigger-debugger.d.ts.map
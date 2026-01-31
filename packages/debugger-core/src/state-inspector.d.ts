/**
 * State Inspector
 * Inspects and exposes database state during execution
 */
import { Variable, TransactionState, Lock, ExecutionContext, Scope } from './types';
export declare class StateInspector {
    private transactionStates;
    private variableScopes;
    /**
     * Get all variables for a scope
     */
    getVariables(sessionId: string, scope: Scope): Variable[];
    /**
     * Set variable in scope
     */
    setVariable(sessionId: string, scopeName: string, variable: Variable): void;
    /**
     * Get procedure variables
     */
    getProcedureVariables(sessionId: string, procedureId: string): Variable[];
    /**
     * Get session variables
     */
    getSessionVariables(sessionId: string): Variable[];
    /**
     * Get transaction state
     */
    getTransactionState(txnId: string): TransactionState | undefined;
    /**
     * Set transaction state
     */
    setTransactionState(state: TransactionState): void;
    /**
     * Get all active transactions
     */
    getActiveTransactions(): TransactionState[];
    /**
     * Get locks for transaction
     */
    getTransactionLocks(txnId: string): {
        held: Lock[];
        waiting: Lock[];
    };
    /**
     * Check if transaction is blocked
     */
    isTransactionBlocked(txnId: string): boolean;
    /**
     * Get blocking tree (who is blocking whom)
     */
    getBlockingTree(txnId: string): {
        blocked: string[];
        blockedBy: string[];
    };
    /**
     * Detect deadlocks
     */
    detectDeadlocks(): {
        cycles: string[][];
        count: number;
    };
    /**
     * Capture current execution context state  */
    captureContextState(context: ExecutionContext): {
        variables: Variable[];
        transaction?: TransactionState;
    };
    /**
     * Get statistics
     */
    getStatistics(): {
        activeTransactions: number;
        blockedTransactions: number;
        totalLocks: number;
        detectedDeadlocks: number;
    };
    /**
     * Clear state for session
     */
    clearSessionState(sessionId: string): void;
}
//# sourceMappingURL=state-inspector.d.ts.map
/**
 * State Inspector
 * Inspects and exposes database state during execution
 */

import {
    Variable,
    TransactionState,
    Lock,
    ExecutionContext,
    Scope,
} from './types';

export class StateInspector {
    private transactionStates: Map<string, TransactionState> = new Map();
    private variableScopes: Map<string, Map<string, Variable>> = new Map();

    /**
     * Get all variables for a scope
     */
    getVariables(sessionId: string, scope: Scope): Variable[] {
        const scopeVars = this.variableScopes.get(`${sessionId}:${scope.name}`);
        if (!scopeVars) return [];

        return Array.from(scopeVars.values());
    }

    /**
     * Set variable in scope
     */
    setVariable(sessionId: string, scopeName: string, variable: Variable): void {
        const key = `${sessionId}:${scopeName}`;
        if (!this.variableScopes.has(key)) {
            this.variableScopes.set(key, new Map());
        }

        this.variableScopes.get(key)!.set(variable.name, variable);
    }

    /**
     * Get procedure variables
     */
    getProcedureVariables(sessionId: string, procedureId: string): Variable[] {
        return this.getVariables(sessionId, {
            name: `procedure:${procedureId}`,
            variablesReference: 0,
            expensive: false,
        });
    }

    /**
     * Get session variables
     */
    getSessionVariables(sessionId: string): Variable[] {
        return this.getVariables(sessionId, {
            name: 'session',
            variablesReference: 0,
            expensive: false,
        });
    }

    /**
     * Get transaction state
     */
    getTransactionState(txnId: string): TransactionState | undefined {
        return this.transactionStates.get(txnId);
    }

    /**
     * Set transaction state
     */
    setTransactionState(state: TransactionState): void {
        this.transactionStates.set(state.txnId, state);
    }

    /**
     * Get all active transactions
     */
    getActiveTransactions(): TransactionState[] {
        return Array.from(this.transactionStates.values()).filter(
            (txn) => txn.status === 'active'
        );
    }

    /**
     * Get locks for transaction
     */
    getTransactionLocks(txnId: string): {
        held: Lock[];
        waiting: Lock[];
    } {
        const txn = this.transactionStates.get(txnId);
        if (!txn) {
            return { held: [], waiting: [] };
        }

        return {
            held: txn.locksHeld,
            waiting: txn.locksWaiting,
        };
    }

    /**
     * Check if transaction is blocked
     */
    isTransactionBlocked(txnId: string): boolean {
        const txn = this.transactionStates.get(txnId);
        return txn ? txn.locksWaiting.length > 0 : false;
    }

    /**
     * Get blocking tree (who is blocking whom)
     */
    getBlockingTree(txnId: string): {
        blocked: string[];
        blockedBy: string[];
    } {
        const txn = this.transactionStates.get(txnId);
        if (!txn) {
            return { blocked: [], blockedBy: [] };
        }

        const blockedBy = new Set<string>();
        const blocked = new Set<string>();

        // Check waiting locks to find who blocks us
        for (const lock of txn.locksWaiting) {
            if (lock.blockedBy) {
                lock.blockedBy.forEach((txnId) => blockedBy.add(txnId));
            }
        }

        // Check our held locks to find who we block
        for (const lock of txn.locksHeld) {
            if (lock.blocking) {
                lock.blocking.forEach((txnId) => blocked.add(txnId));
            }
        }

        return {
            blocked: Array.from(blocked),
            blockedBy: Array.from(blockedBy),
        };
    }

    /**
     * Detect deadlocks
     */
    detectDeadlocks(): {
        cycles: string[][];
        count: number;
    } {
        const activeTxns = this.getActiveTransactions();
        const graph = new Map<string, string[]>();

        // Build wait-for graph
        for (const txn of activeTxns) {
            const { blockedBy } = this.getBlockingTree(txn.txnId);
            if (blockedBy.length > 0) {
                graph.set(txn.txnId, blockedBy);
            }
        }

        // Detect cycles using DFS
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = (node: string, path: string[]): void => {
            visited.add(node);
            recStack.add(node);
            path.push(node);

            const neighbors = graph.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path]);
                } else if (recStack.has(neighbor)) {
                    // Found a cycle
                    const cycleStart = path.indexOf(neighbor);
                    const cycle = path.slice(cycleStart);
                    cycles.push(cycle);
                }
            }

            recStack.delete(node);
        };

        for (const txnId of graph.keys()) {
            if (!visited.has(txnId)) {
                dfs(txnId, []);
            }
        }

        return {
            cycles,
            count: cycles.length,
        };
    }

    /**
     * Capture current execution context state  */
    captureContextState(context: ExecutionContext): {
        variables: Variable[];
        transaction?: TransactionState;
    } {
        const variables: Variable[] = [];

        // Capture all variables from context
        for (const [name, value] of context.variables.entries()) {
            variables.push({
                name,
                value,
                type: typeof value,
                scope: 'local',
                mutable: true,
            });
        }

        // Get transaction state if exists
        const transaction = context.transactionId
            ? this.transactionStates.get(context.transactionId)
            : undefined;

        return {
            variables,
            transaction,
        };
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        activeTransactions: number;
        blockedTransactions: number;
        totalLocks: number;
        detectedDeadlocks: number;
    } {
        const activeTxns = this.getActiveTransactions();
        const blockedTxns = activeTxns.filter((txn) =>
            this.isTransactionBlocked(txn.txnId)
        );
        const totalLocks = activeTxns.reduce(
            (sum, txn) => sum + txn.locksHeld.length + txn.locksWaiting.length,
            0
        );
        const { count: deadlockCount } = this.detectDeadlocks();

        return {
            activeTransactions: activeTxns.length,
            blockedTransactions: blockedTxns.length,
            totalLocks,
            detectedDeadlocks: deadlockCount,
        };
    }

    /**
     * Clear state for session
     */
    clearSessionState(sessionId: string): void {
        // Remove all variable scopes for this session
        for (const key of this.variableScopes.keys()) {
            if (key.startsWith(`${sessionId}:`)) {
                this.variableScopes.delete(key);
            }
        }
    }
}

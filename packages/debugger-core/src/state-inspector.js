"use strict";
/**
 * State Inspector
 * Inspects and exposes database state during execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateInspector = void 0;
class StateInspector {
    constructor() {
        this.transactionStates = new Map();
        this.variableScopes = new Map();
    }
    /**
     * Get all variables for a scope
     */
    getVariables(sessionId, scope) {
        const scopeVars = this.variableScopes.get(`${sessionId}:${scope.name}`);
        if (!scopeVars)
            return [];
        return Array.from(scopeVars.values());
    }
    /**
     * Set variable in scope
     */
    setVariable(sessionId, scopeName, variable) {
        const key = `${sessionId}:${scopeName}`;
        if (!this.variableScopes.has(key)) {
            this.variableScopes.set(key, new Map());
        }
        this.variableScopes.get(key).set(variable.name, variable);
    }
    /**
     * Get procedure variables
     */
    getProcedureVariables(sessionId, procedureId) {
        return this.getVariables(sessionId, {
            name: `procedure:${procedureId}`,
            variablesReference: 0,
            expensive: false,
        });
    }
    /**
     * Get session variables
     */
    getSessionVariables(sessionId) {
        return this.getVariables(sessionId, {
            name: 'session',
            variablesReference: 0,
            expensive: false,
        });
    }
    /**
     * Get transaction state
     */
    getTransactionState(txnId) {
        return this.transactionStates.get(txnId);
    }
    /**
     * Set transaction state
     */
    setTransactionState(state) {
        this.transactionStates.set(state.txnId, state);
    }
    /**
     * Get all active transactions
     */
    getActiveTransactions() {
        return Array.from(this.transactionStates.values()).filter((txn) => txn.status === 'active');
    }
    /**
     * Get locks for transaction
     */
    getTransactionLocks(txnId) {
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
    isTransactionBlocked(txnId) {
        const txn = this.transactionStates.get(txnId);
        return txn ? txn.locksWaiting.length > 0 : false;
    }
    /**
     * Get blocking tree (who is blocking whom)
     */
    getBlockingTree(txnId) {
        const txn = this.transactionStates.get(txnId);
        if (!txn) {
            return { blocked: [], blockedBy: [] };
        }
        const blockedBy = new Set();
        const blocked = new Set();
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
    detectDeadlocks() {
        const activeTxns = this.getActiveTransactions();
        const graph = new Map();
        // Build wait-for graph
        for (const txn of activeTxns) {
            const { blockedBy } = this.getBlockingTree(txn.txnId);
            if (blockedBy.length > 0) {
                graph.set(txn.txnId, blockedBy);
            }
        }
        // Detect cycles using DFS
        const cycles = [];
        const visited = new Set();
        const recStack = new Set();
        const dfs = (node, path) => {
            visited.add(node);
            recStack.add(node);
            path.push(node);
            const neighbors = graph.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path]);
                }
                else if (recStack.has(neighbor)) {
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
    captureContextState(context) {
        const variables = [];
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
    getStatistics() {
        const activeTxns = this.getActiveTransactions();
        const blockedTxns = activeTxns.filter((txn) => this.isTransactionBlocked(txn.txnId));
        const totalLocks = activeTxns.reduce((sum, txn) => sum + txn.locksHeld.length + txn.locksWaiting.length, 0);
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
    clearSessionState(sessionId) {
        // Remove all variable scopes for this session
        for (const key of this.variableScopes.keys()) {
            if (key.startsWith(`${sessionId}:`)) {
                this.variableScopes.delete(key);
            }
        }
    }
}
exports.StateInspector = StateInspector;
//# sourceMappingURL=state-inspector.js.map
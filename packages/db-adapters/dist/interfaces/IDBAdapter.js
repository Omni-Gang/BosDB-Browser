"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDBAdapter = void 0;
/**
 * Base adapter class with common functionality
 */
class BaseDBAdapter {
    constructor() {
        this.connectionMap = new Map();
    }
    async getRecentQueries(_connectionId, _lastTimestamp) {
        return [];
    }
    async getVariables(_connectionId) {
        return [];
    }
    async startTransaction(_connectionId) {
        throw new Error('Transactions not supported by this adapter');
    }
    async commitTransaction(_transactionConnectionId) {
        // No-op
    }
    async rollbackTransaction(_transactionConnectionId) {
        // No-op
    }
    /**
     * Generate a unique connection ID
     */
    generateConnectionId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get connection from map
     */
    getConnection(connectionId) {
        const connection = this.connectionMap.get(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }
        return connection;
    }
    /**
     * Check if connection exists
     */
    hasConnection(connectionId) {
        return this.connectionMap.has(connectionId);
    }
}
exports.BaseDBAdapter = BaseDBAdapter;
//# sourceMappingURL=IDBAdapter.js.map
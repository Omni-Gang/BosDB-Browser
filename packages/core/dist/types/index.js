"use strict";
/**
 * Core type definitions for BosDB
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.SecurityError = exports.QueryExecutionError = exports.ConnectionError = exports.BosDBError = void 0;
// Error Types
class BosDBError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BosDBError';
    }
}
exports.BosDBError = BosDBError;
class ConnectionError extends BosDBError {
    constructor(message, details) {
        super(message, 'CONNECTION_ERROR', details);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
class QueryExecutionError extends BosDBError {
    constructor(message, details) {
        super(message, 'QUERY_EXECUTION_ERROR', details);
        this.name = 'QueryExecutionError';
    }
}
exports.QueryExecutionError = QueryExecutionError;
class SecurityError extends BosDBError {
    constructor(message, details) {
        super(message, 'SECURITY_ERROR', details);
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
class ValidationError extends BosDBError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=index.js.map
"use strict";
/**
 * Application-wide constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.DEFAULT_PORTS = exports.RATE_LIMIT = exports.IDLE_TIMEOUT = exports.MAX_POOL_SIZE = exports.DEFAULT_POOL_SIZE = exports.DEFAULT_CONNECTION_TIMEOUT = exports.MAX_ROWS_LIMIT = exports.DEFAULT_MAX_ROWS = exports.MAX_QUERY_TIMEOUT = exports.DEFAULT_QUERY_TIMEOUT = void 0;
// Query Limits
exports.DEFAULT_QUERY_TIMEOUT = 30000; // 30 seconds
exports.MAX_QUERY_TIMEOUT = 300000; // 5 minutes
exports.DEFAULT_MAX_ROWS = 1000;
exports.MAX_ROWS_LIMIT = 100000;
// Connection Limits
exports.DEFAULT_CONNECTION_TIMEOUT = 5000; // 5 seconds
exports.DEFAULT_POOL_SIZE = 10;
exports.MAX_POOL_SIZE = 50;
exports.IDLE_TIMEOUT = 30000; // 30 seconds
// Rate Limits
exports.RATE_LIMIT = {
    queriesPerMinute: 30,
    connectionsPerWorkspace: 10,
    maxConcurrentQueries: 5,
    savedQueriesPerWorkspace: 100,
};
// Database Default Ports
exports.DEFAULT_PORTS = {
    postgresql: 5432,
    mysql: 3306,
    mongodb: 27017,
};
// Pagination
exports.DEFAULT_PAGE_SIZE = 50;
exports.MAX_PAGE_SIZE = 1000;
//# sourceMappingURL=index.js.map
/**
 * Application-wide constants
 */
export declare const DEFAULT_QUERY_TIMEOUT = 30000;
export declare const MAX_QUERY_TIMEOUT = 300000;
export declare const DEFAULT_MAX_ROWS = 1000;
export declare const MAX_ROWS_LIMIT = 100000;
export declare const DEFAULT_CONNECTION_TIMEOUT = 5000;
export declare const DEFAULT_POOL_SIZE = 10;
export declare const MAX_POOL_SIZE = 50;
export declare const IDLE_TIMEOUT = 30000;
export declare const RATE_LIMIT: {
    readonly queriesPerMinute: 30;
    readonly connectionsPerWorkspace: 10;
    readonly maxConcurrentQueries: 5;
    readonly savedQueriesPerWorkspace: 100;
};
export declare const DEFAULT_PORTS: Record<string, number>;
export type ExportFormat = 'csv' | 'json' | 'sql';
export declare const DEFAULT_PAGE_SIZE = 50;
export declare const MAX_PAGE_SIZE = 1000;
//# sourceMappingURL=index.d.ts.map
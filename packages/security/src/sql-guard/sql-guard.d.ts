/**
 * SQL injection detection and query validation
 */
export interface ValidationResult {
    safe: boolean;
    reason?: string;
    patterns?: string[];
    severity?: 'low' | 'medium' | 'high';
}
/**
 * Validate a SQL query for potentially dangerous patterns
 * This is a defense-in-depth measure, not a replacement for parameterized queries
 */
export declare function validateQuery(query: string): ValidationResult;
/**
 * Sanitize table/column names (prevent SQL injection in identifiers)
 */
export declare function sanitizeIdentifier(identifier: string): string;
/**
 * Escape string values for SQL (use parameterized queries instead when possible)
 */
export declare function escapeString(value: string): string;
/**
 * Check if query is read-only (safe for read-only connections)
 */
export declare function isReadOnlyQuery(query: string): boolean;
//# sourceMappingURL=sql-guard.d.ts.map
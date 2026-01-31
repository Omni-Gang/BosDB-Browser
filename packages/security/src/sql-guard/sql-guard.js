"use strict";
/**
 * SQL injection detection and query validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = validateQuery;
exports.sanitizeIdentifier = sanitizeIdentifier;
exports.escapeString = escapeString;
exports.isReadOnlyQuery = isReadOnlyQuery;
/**
 * Validate a SQL query for potentially dangerous patterns
 * This is a defense-in-depth measure, not a replacement for parameterized queries
 */
function validateQuery(query) {
    // Normalize query
    const normalized = query
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .toLowerCase();
    // Check for multiple statements (SQL injection attempts)
    const statements = normalized.split(';').filter(s => s.trim().length > 0);
    const hasMultipleStatements = statements.length > 1;
    // Highly dangerous patterns (blocking level)
    const blockedPatterns = [
        { pattern: /xp_cmdshell/i, severity: 'high', desc: 'Command execution attempt' },
        { pattern: /exec\s*\(/i, severity: 'high', desc: 'Dynamic SQL execution' },
        { pattern: /into\s+outfile/i, severity: 'high', desc: 'File write attempt' },
        { pattern: /load_file/i, severity: 'high', desc: 'File read attempt' },
    ];
    // Multi-statement attacks (only block if multiple statements detected)
    const multiStatementPatterns = [
        { pattern: /;\s*drop\s+(table|database|schema)/i, severity: 'high', desc: 'DROP in multi-statement' },
        { pattern: /;\s*truncate\s+/i, severity: 'high', desc: 'TRUNCATE in multi-statement' },
        { pattern: /;\s*delete\s+from/i, severity: 'high', desc: 'DELETE in multi-statement' },
        { pattern: /;\s*shutdown/i, severity: 'high', desc: 'Shutdown command' },
    ];
    // Suspicious patterns (warning level) - only for multi-statement queries
    const suspiciousPatterns = [
        { pattern: /union\s+select/i, severity: 'medium', desc: 'UNION-based injection' },
    ];
    const detectedPatterns = [];
    let maxSeverity = 'low';
    // Check blocked patterns
    for (const { pattern, severity, desc } of blockedPatterns) {
        if (pattern.test(normalized)) {
            detectedPatterns.push(desc);
            if (severity === 'high') {
                maxSeverity = 'high';
            }
        }
    }
    // Check multi-statement patterns only if multiple statements detected
    if (hasMultipleStatements) {
        for (const { pattern, severity, desc } of multiStatementPatterns) {
            if (pattern.test(normalized)) {
                detectedPatterns.push(desc);
                if (severity === 'high') {
                    maxSeverity = 'high';
                }
            }
        }
    }
    // If high severity patterns found, block immediately
    if (maxSeverity === 'high') {
        return {
            safe: false,
            reason: 'Dangerous SQL patterns detected',
            patterns: detectedPatterns,
            severity: 'high',
        };
    }
    // Check suspicious patterns only for multi-statement queries
    if (hasMultipleStatements) {
        for (const { pattern, desc } of suspiciousPatterns) {
            if (pattern.test(normalized)) {
                detectedPatterns.push(desc);
                if (maxSeverity === 'low') {
                    maxSeverity = 'medium';
                }
            }
        }
    }
    if (detectedPatterns.length > 0) {
        return {
            safe: false,
            reason: 'Suspicious SQL patterns detected',
            patterns: detectedPatterns,
            severity: maxSeverity,
        };
    }
    return { safe: true };
}
/**
 * Sanitize table/column names (prevent SQL injection in identifiers)
 */
function sanitizeIdentifier(identifier) {
    // Only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
        throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
}
/**
 * Escape string values for SQL (use parameterized queries instead when possible)
 */
function escapeString(value) {
    return value.replace(/'/g, "''");
}
/**
 * Check if query is read-only (safe for read-only connections)
 */
function isReadOnlyQuery(query) {
    const normalized = query.trim().toLowerCase();
    // Allow SELECT, EXPLAIN, SHOW, DESCRIBE
    const readOnlyKeywords = ['select', 'explain', 'show', 'describe', 'with'];
    return readOnlyKeywords.some((keyword) => normalized.startsWith(keyword));
}
//# sourceMappingURL=sql-guard.js.map
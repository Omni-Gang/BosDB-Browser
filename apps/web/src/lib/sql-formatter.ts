/**
 * SQL Formatting Utilities
 * Format and beautify SQL queries
 */

import { format } from 'sql-formatter';

export type SQLDialect = 'sql' | 'mysql' | 'postgresql' | 'mariadb' | 'sqlite' | 'bigquery' | 'spark' | 'trino';

export interface FormatOptions {
    dialect?: SQLDialect;
    uppercase?: boolean;
    tabWidth?: number;
    keywordCase?: 'upper' | 'lower' | 'preserve';
}

/**
 * Format SQL query with beautification
 */
export function formatSQL(sql: string, options: FormatOptions = {}): string {
    const {
        dialect = 'sql',
        uppercase = true,
        tabWidth = 4,
        keywordCase = uppercase ? 'upper' : 'lower',
    } = options;

    try {
        return format(sql, {
            language: dialect,
            tabWidth,
            keywordCase,
            linesBetweenQueries: 2,
            indentStyle: 'standard',
        });
    } catch (error) {
        console.error('SQL formatting failed:', error);
        return sql; // Return original if formatting fails
    }
}

/**
 * Minify SQL query (remove extra whitespace)
 */
export function minifySQL(sql: string): string {
    return sql
        .replace(/\s+/g, ' ')
        .replace(/\s*([,()=<>])\s*/g, '$1')
        .trim();
}

/**
 * Get SQL dialect from database type
 */
export function getDialectFromDbType(dbType: string): SQLDialect {
    const dialectMap: Record<string, SQLDialect> = {
        postgresql: 'postgresql',
        postgres: 'postgresql',
        mysql: 'mysql',
        mariadb: 'mariadb',
        sqlite: 'sqlite',
        mssql: 'sql',
        sqlserver: 'sql',
    };
    return dialectMap[dbType.toLowerCase()] || 'sql';
}

/**
 * Extract table names from SQL query
 */
export function extractTableNames(sql: string): string[] {
    const tables: string[] = [];
    const patterns = [
        /FROM\s+([`"']?[\w.]+[`"']?)/gi,
        /JOIN\s+([`"']?[\w.]+[`"']?)/gi,
        /INTO\s+([`"']?[\w.]+[`"']?)/gi,
        /UPDATE\s+([`"']?[\w.]+[`"']?)/gi,
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(sql)) !== null) {
            const table = match[1].replace(/[`"']/g, '');
            if (!tables.includes(table)) {
                tables.push(table);
            }
        }
    });

    return tables;
}

/**
 * Check if query is a SELECT statement
 */
export function isSelectQuery(sql: string): boolean {
    return /^\s*(SELECT|WITH)\s/i.test(sql.trim());
}

/**
 * Check if query modifies data
 */
export function isModifyingQuery(sql: string): boolean {
    return /^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\s/i.test(sql.trim());
}

/**
 * Split multiple SQL statements
 */
export function splitStatements(sql: string): string[] {
    // Simple split by semicolon, doesn't handle strings with semicolons
    return sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/**
 * Generate EXPLAIN query prefix based on database type
 */
export function getExplainPrefix(dbType: string): string {
    switch (dbType.toLowerCase()) {
        case 'postgresql':
        case 'postgres':
            return 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ';
        case 'mysql':
        case 'mariadb':
            return 'EXPLAIN FORMAT=JSON ';
        case 'sqlite':
            return 'EXPLAIN QUERY PLAN ';
        default:
            return 'EXPLAIN ';
    }
}

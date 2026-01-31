/**
 * SQL Formatting Utilities
 * Ported from browser apps/web/src/lib/sql-formatter.ts
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

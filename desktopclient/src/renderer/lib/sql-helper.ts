/**
 * SQL Helper Utilities
 * Ported from browser apps/web/src/lib/sql-helper.ts
 */

export function generateUpdateStatement(
    schema: string,
    table: string,
    primaryKey: { [key: string]: any },
    changes: { [key: string]: any },
    _dbType: string
): string {
    const setClauses: string[] = [];

    // Safety check
    if (Object.keys(primaryKey).length === 0 || Object.keys(changes).length === 0) {
        throw new Error('Cannot generate UPDATE: Missing primary key or changes');
    }

    // Build SET clause
    for (const [col, val] of Object.entries(changes)) {
        if (val === null) {
            setClauses.push(`${col} = NULL`);
        } else if (typeof val === 'string') {
            setClauses.push(`${col} = '${val.replace(/'/g, "''")}'`);
        } else if (typeof val === 'number' || typeof val === 'boolean') {
            setClauses.push(`${col} = ${val}`);
        } else {
            setClauses.push(`${col} = '${JSON.stringify(val).replace(/'/g, "''")}'`);
        }
    }

    // Build WHERE clause
    const whereClauses: string[] = [];
    for (const [col, val] of Object.entries(primaryKey)) {
        if (typeof val === 'string') {
            whereClauses.push(`${col} = '${val.replace(/'/g, "''")}'`);
        } else {
            whereClauses.push(`${col} = ${val}`);
        }
    }

    const setClause = setClauses.join(', ');
    const whereClause = whereClauses.join(' AND ');

    return `UPDATE ${schema}.${table} SET ${setClause} WHERE ${whereClause};`;
}

export function extractTableName(query: string): string | null {
    const match = query.match(/\bfrom\s+([a-zA-Z0-9_."]+)/i);
    if (match && match[1]) {
        const parts = match[1].replace(/["`]/g, '').split('.');
        return parts[parts.length - 1];
    }
    return null;
}

export function getCurrentStatement(sql: string, offset: number): string {
    if (!sql) return '';

    let start = 0;
    let end = sql.length;

    for (let i = offset - 1; i >= 0; i--) {
        if (sql[i] === ';') {
            start = i + 1;
            break;
        }
    }

    for (let i = offset; i < sql.length; i++) {
        if (sql[i] === ';') {
            end = i;
            break;
        }
    }

    return sql.substring(start, end).trim();
}

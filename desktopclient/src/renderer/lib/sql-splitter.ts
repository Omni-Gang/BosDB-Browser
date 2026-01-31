/**
 * Smart SQL Query Splitter
 * Ported from browser apps/web/src/lib/sql-splitter.ts
 */

export function splitSQL(sql: string): string[] {
    const queries: string[] = [];
    let currentQuery = '';
    let i = 0;

    while (i < sql.length) {
        const char = sql[i];
        const nextChar = sql[i + 1];

        // Check for dollar-quoted string ($$...$$)
        if (char === '$' && nextChar === '$') {
            const dollarQuote = '$$';
            currentQuery += dollarQuote;
            i += 2;

            while (i < sql.length) {
                if (sql[i] === '$' && sql[i + 1] === '$') {
                    currentQuery += '$$';
                    i += 2;
                    break;
                }
                currentQuery += sql[i];
                i++;
            }
            continue;
        }

        // Check for single-quoted string
        if (char === "'") {
            currentQuery += char;
            i++;

            while (i < sql.length) {
                currentQuery += sql[i];

                if (sql[i] === "'" && sql[i + 1] === "'") {
                    currentQuery += sql[i + 1];
                    i += 2;
                    continue;
                }

                if (sql[i] === "'") {
                    i++;
                    break;
                }

                i++;
            }
            continue;
        }

        // Check for double-quoted identifier
        if (char === '"') {
            currentQuery += char;
            i++;

            while (i < sql.length) {
                currentQuery += sql[i];

                if (sql[i] === '"' && sql[i + 1] === '"') {
                    currentQuery += sql[i + 1];
                    i += 2;
                    continue;
                }

                if (sql[i] === '"') {
                    i++;
                    break;
                }

                i++;
            }
            continue;
        }

        // Check for single-line comment (-- ...)
        if (char === '-' && nextChar === '-') {
            currentQuery += char + nextChar;
            i += 2;

            while (i < sql.length && sql[i] !== '\n' && sql[i] !== '\r') {
                currentQuery += sql[i];
                i++;
            }

            if (i < sql.length) {
                currentQuery += sql[i];
                i++;
            }
            continue;
        }

        // Check for multi-line comment (/* ... */)
        if (char === '/' && nextChar === '*') {
            currentQuery += char + nextChar;
            i += 2;

            while (i < sql.length - 1) {
                currentQuery += sql[i];

                if (sql[i] === '*' && sql[i + 1] === '/') {
                    currentQuery += sql[i + 1];
                    i += 2;
                    break;
                }

                i++;
            }
            continue;
        }

        // Check for semicolon (statement separator)
        if (char === ';') {
            const trimmed = currentQuery.trim();
            if (trimmed.length > 0) {
                queries.push(trimmed);
            }
            currentQuery = '';
            i++;
            continue;
        }

        currentQuery += char;
        i++;
    }

    const trimmed = currentQuery.trim();
    if (trimmed.length > 0) {
        queries.push(trimmed);
    }

    return queries;
}

export function isDOBlock(query: string): boolean {
    const upper = query.toUpperCase().trim();
    return upper.startsWith('DO $$') ||
        upper.startsWith('DO $') ||
        upper.startsWith('CREATE OR REPLACE FUNCTION') ||
        upper.startsWith('CREATE FUNCTION') ||
        upper.startsWith('CREATE OR REPLACE PROCEDURE') ||
        upper.startsWith('CREATE PROCEDURE');
}

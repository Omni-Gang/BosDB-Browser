
export function generateUpdateStatement(
    schema: string,
    table: string,
    primaryKey: { [key: string]: any },
    changes: { [key: string]: any },
    _dbType: string
): string {
    const setClauses: string[] = [];
    const values: any[] = [];

    // Safety check
    if (Object.keys(primaryKey).length === 0 || Object.keys(changes).length === 0) {
        throw new Error('Cannot generate UPDATE: Missing primary key or changes');
    }

    // Build SET clause
    for (const [col, val] of Object.entries(changes)) {
        if (val === null) {
            setClauses.push(`${col} = NULL`);
        } else if (typeof val === 'string') {
            // Simple escaping for MVP - in prod use parameterized queries
            setClauses.push(`${col} = '${val.replace(/'/g, "''")}'`);
        } else if (typeof val === 'number' || typeof val === 'boolean') {
            setClauses.push(`${col} = ${val}`);
        } else {
            // Objects/Arrays/Dates
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

export function detectPrimaryKey(fields: { name: string, dataType: string }[]): string[] {
    // Naive heuristic for MVP since we don't have direct metadata access in result set yet

    // 1. Look for 'id', 'ID', 'Id'
    const idField = fields.find(f => f.name.toLowerCase() === 'id');
    if (idField) return [idField.name];

    // 2. Look for 'table_id' style
    const typeIdField = fields.find(f => f.name.toLowerCase().endsWith('_id'));
    if (typeIdField) return [typeIdField.name];

    // 3. Fallback: First column is often PK
    if (fields.length > 0) return [fields[0].name];

    return [];
}

export function extractTableName(query: string): string | null {
    // Basic regex to find FROM clause
    // Matches: FROM table | FROM schema.table | FROM "table"
    const match = query.match(/\bfrom\s+([a-zA-Z0-9_."]+)/i);
    if (match && match[1]) {
        // Strip quotes and return simple table name (ignoring schema for now if present)
        const parts = match[1].replace(/["`]/g, '').split('.');
        return parts[parts.length - 1];
    }
    return null;
}

export interface ColumnDef {
    name: string;
    type: string; // e.g., 'VARCHAR', 'INTEGER', 'BOOLEAN'
    isPrimaryKey: boolean;
    isNullable: boolean;
    defaultValue?: string;
}

export interface TableDef {
    name: string;
    columns: ColumnDef[];
}

export function generateCreateTableSQL(tableMetadata: any, schema: string = 'public', dbType: string = 'postgresql'): string {
    if (!tableMetadata.name) throw new Error('Table name is required');

    // Handle NoSQL Dialects
    if (dbType === 'mongodb') {
        const indexes = tableMetadata.indexes || [];
        const indexCmds = indexes.map((idx: any) =>
            `db.collection("${tableMetadata.name}").createIndex(${JSON.stringify(idx.key || idx.columns)}, ${JSON.stringify({ name: idx.name, unique: idx.unique })})`
        ).join(';\n');
        return `db.createCollection("${tableMetadata.name}");\n${indexCmds}`;
    }

    if (dbType === 'redis') {
        // For Redis, it's just a placeholder or we could return a restore command if we had data
        return `-- Redis key ${tableMetadata.name} recreation. Type: ${tableMetadata.columns?.[1]?.dataType || 'string'}`;
    }

    // SQL Dialects (PostgreSQL/MySQL)
    if (!tableMetadata.columns || tableMetadata.columns.length === 0) throw new Error('At least one column is required');

    const columnDefinitions = tableMetadata.columns.map((col: any) => {
        let parts = [dbType === 'mysql' ? `\`${col.name}\`` : `"${col.name}"`, col.type || col.dataType];

        if (col.isPrimaryKey) {
            parts.push('PRIMARY KEY');
        }

        if (!col.isNullable && !col.isPrimaryKey) {
            parts.push('NOT NULL');
        }

        if (col.defaultValue !== undefined && col.defaultValue !== null) {
            const isNumber = !isNaN(Number(col.defaultValue));
            const isFunction = String(col.defaultValue).toUpperCase().endsWith('()');
            if (isNumber || isFunction) {
                parts.push(`DEFAULT ${col.defaultValue}`);
            } else {
                parts.push(`DEFAULT '${String(col.defaultValue).replace(/'/g, "''")}'`);
            }
        }

        return parts.join(' ');
    });

    let sql = `CREATE TABLE ${dbType === 'mysql' ? `\`${schema}\`.\`${tableMetadata.name}\`` : `"${schema}"."${tableMetadata.name}"`} (\n    ${columnDefinitions.join(',\n    ')}`;

    // Add Foreign Keys if present
    if (tableMetadata.foreignKeys && tableMetadata.foreignKeys.length > 0) {
        const fkSql = tableMetadata.foreignKeys.map((fk: any) => {
            const cols = fk.columns.map((c: string) => dbType === 'mysql' ? `\`${c}\`` : `"${c}"`).join(', ');
            const refCols = fk.referencedColumns.map((c: string) => dbType === 'mysql' ? `\`${c}\`` : `"${c}"`).join(', ');
            return `CONSTRAINT "${fk.name}" FOREIGN KEY (${cols}) REFERENCES "${fk.referencedTable}" (${refCols})`;
        });
        sql += `,\n    ${fkSql.join(',\n    ')}`;
    }

    sql += '\n);';

    // Add Indexes separately
    if (tableMetadata.indexes && tableMetadata.indexes.length > 0) {
        const indexSql = tableMetadata.indexes
            .filter((idx: any) => !idx.primary) // Primary key handled in CREATE TABLE
            .map((idx: any) => {
                const cols = idx.columns.map((c: string) => dbType === 'mysql' ? `\`${c}\`` : `"${c}"`).join(', ');
                return `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX "${idx.name}" ON "${schema}"."${tableMetadata.name}" (${cols});`;
            });
        if (indexSql.length > 0) {
            sql += '\n' + indexSql.join('\n');
        }
    }

    return sql;
}

export function getCurrentStatement(sql: string, offset: number): string {
    if (!sql) return '';

    // Split by semicolon, but be careful about semicolons in strings or comments
    // For a robust implementation, we'd need a full lexer. 
    // For now, let's use a simpler heuristic: find the closest semicolons around the offset.

    let start = 0;
    let end = sql.length;

    // Find last semicolon before offset
    for (let i = offset - 1; i >= 0; i--) {
        if (sql[i] === ';') {
            start = i + 1;
            break;
        }
    }

    // Find next semicolon after offset
    for (let i = offset; i < sql.length; i++) {
        if (sql[i] === ';') {
            end = i;
            break;
        }
    }

    return sql.substring(start, end).trim();
}

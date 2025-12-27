
export function generateUpdateStatement(
    schema: string,
    table: string,
    primaryKey: { [key: string]: any },
    changes: { [key: string]: any },
    dbType: string
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

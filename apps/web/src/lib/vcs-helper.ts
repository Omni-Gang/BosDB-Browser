/**
 * VCS Integration Helper
 * Automatically tracks database changes for version control
 */

export interface DatabaseChange {
    id?: string;
    type: 'SCHEMA' | 'DATA' | 'ACL' | 'SYSTEM';
    operation: 'CREATE' | 'ALTER' | 'DROP' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RENAME' | 'TRUNCATE' | 'GRANT' | 'REVOKE';
    target: string;
    description: string;
    query: string;
    rollbackSQL: string | 'MANUAL';
    status: 'APPLIED' | 'REVERTED';
    tableName?: string;
    affectedRows?: number;
    metadata?: any;
    timestamp?: string;
}

/**
 * Track a database change for version control
 */
export async function trackChange(connectionId: string, change: DatabaseChange): Promise<void> {
    try {
        await fetch('/api/vcs/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, change })
        });
    } catch (error) {
        console.error('Failed to track change:', error);
    }
}

/**
 * Track a schema change (CREATE, ALTER, DROP table)
 */
export async function trackSchemaChange(
    connectionId: string,
    operation: 'create' | 'alter' | 'drop',
    tableName: string,
    sql: string,
    author: { id: string; name: string }
): Promise<void> {
    const change: DatabaseChange = {
        type: 'SCHEMA',
        operation: operation.toUpperCase() as 'CREATE' | 'ALTER' | 'DROP',
        target: tableName,
        tableName,
        description: `${operation.charAt(0).toUpperCase() + operation.slice(1)} table ${tableName} by ${author.name}`,
        query: sql,
        rollbackSQL: generateRollbackSQL(sql),
        status: 'APPLIED'
    };

    await trackChange(connectionId, change);
}

/**
 * Parse SQL query to detect change type
 */
export function parseQueryForChanges(query: string, affectedRows?: number): DatabaseChange | null {
    // Remove comments and trim
    const cleanQuery = query.replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, '').trim();
    const normalizedQuery = cleanQuery.toUpperCase();

    // Database / Schema changes
    if (normalizedQuery.match(/\bCREATE\s+(DATABASE|SCHEMA)\b/i)) {
        const type = normalizedQuery.includes('DATABASE') ? 'DATABASE' : 'SCHEMA';
        const name = normalizedQuery.match(/\bCREATE\s+(?:DATABASE|SCHEMA)\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SYSTEM',
            operation: 'CREATE',
            target: name,
            description: `Create ${type.toLowerCase()} ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.match(/\bDROP\s+(DATABASE|SCHEMA)\b/i)) {
        const type = normalizedQuery.includes('DATABASE') ? 'DATABASE' : 'SCHEMA';
        const name = normalizedQuery.match(/\bDROP\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SYSTEM',
            operation: 'DROP',
            target: name,
            description: `Drop ${type.toLowerCase()} ${name}`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    // Indices / Triggers / Sequences
    if (normalizedQuery.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i)) {
        const name = normalizedQuery.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: name,
            description: `Create index ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.match(/\bCREATE\s+TRIGGER\b/i)) {
        const name = normalizedQuery.match(/\bCREATE\s+TRIGGER\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: name,
            description: `Create trigger ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.match(/\bCREATE\s+SEQUENCE\b/i)) {
        const name = normalizedQuery.match(/\bCREATE\s+SEQUENCE\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: name,
            description: `Create sequence ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    // Table Schema changes
    if (normalizedQuery.includes('CREATE TABLE')) {
        const match = cleanQuery.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: tableName,
            tableName,
            description: `Create table ${tableName}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.includes('ALTER TABLE')) {
        const match = cleanQuery.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'ALTER',
            target: tableName,
            tableName,
            description: `Alter table ${tableName}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.includes('DROP TABLE')) {
        const match = cleanQuery.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'DROP',
            target: tableName,
            tableName,
            description: `Drop table ${tableName}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    // Procedure/Function/View/Trigger/Index Drop
    const dropObjMatch = normalizedQuery.match(/DROP\s+(PROCEDURE|FUNCTION|VIEW|TRIGGER|INDEX|SEQUENCE|ROLE)\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\2/i);
    if (dropObjMatch) {
        const type = dropObjMatch[1].toUpperCase();
        const name = dropObjMatch[3];
        return {
            type: type === 'ROLE' ? 'ACL' : 'SCHEMA',
            operation: 'DROP',
            target: name,
            description: `Drop ${type.toLowerCase()} ${name}`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.match(/\bREFRESH\s+MATERIALIZED\s+VIEW\b/i)) {
        const name = normalizedQuery.match(/\bREFRESH\s+MATERIALIZED\s+VIEW\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'ALTER' as any,
            target: name,
            description: `Refresh materialized view ${name}`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    // Materialized view drop handle
    if (normalizedQuery.match(/\bDROP\s+MATERIALIZED\s+VIEW\b/i)) {
        const name = normalizedQuery.match(/\bDROP\s+MATERIALIZED\s+VIEW\s+(?:IF\s+EXISTS\s+)?([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'DROP',
            target: name,
            description: `Drop materialized view ${name}`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }
    // Views/Procedures/Functions
    const procMatch = cleanQuery.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|VIEW|MATERIALIZED\s+VIEW|ROUTINE)\s+([`"]?)(\w+)\2/i);
    if (procMatch) {
        const type = procMatch[1].toUpperCase();
        const name = procMatch[3];
        return {
            type: 'SCHEMA',
            operation: 'CREATE',
            target: name,
            description: `Create ${type.toLowerCase()} ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    // ACL changes
    if (normalizedQuery.startsWith('GRANT') || normalizedQuery.startsWith('REVOKE')) {
        return {
            type: 'ACL',
            operation: normalizedQuery.startsWith('GRANT') ? 'GRANT' : 'REVOKE',
            target: 'permissions',
            description: `${normalizedQuery.startsWith('GRANT') ? 'Grant' : 'Revoke'} permissions`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    // Comments
    if (normalizedQuery.startsWith('COMMENT ON')) {
        return {
            type: 'SCHEMA',
            operation: 'ALTER',
            target: 'comment',
            description: `Update comment`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    // Data changes (DML)
    if (normalizedQuery.startsWith('INSERT INTO') || normalizedQuery.startsWith('MERGE')) {
        const isMerge = normalizedQuery.startsWith('MERGE');
        const match = cleanQuery.match(/(?:INSERT\s+INTO|MERGE\s+INTO?)\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: isMerge ? 'ALTER' as any : 'INSERT',
            target: tableName,
            tableName,
            description: `${isMerge ? 'Merge' : 'Insert'} ${affectedRows || 1} row(s) into ${tableName}`,
            query,
            affectedRows,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.match(/\bALTER\s+(SEQUENCE|INDEX)\b/i)) {
        const type = normalizedQuery.includes('SEQUENCE') ? 'SEQUENCE' : 'INDEX';
        const name = normalizedQuery.match(/\bALTER\s+(?:SEQUENCE|INDEX)\s+([`"]?)(\w+)\1/i)?.[2] || 'unknown';
        return {
            type: 'SCHEMA',
            operation: 'ALTER',
            target: name,
            description: `Alter ${type.toLowerCase()} ${name}`,
            query,
            rollbackSQL: generateRollbackSQL(query),
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.startsWith('REINDEX') || normalizedQuery.startsWith('VACUUM') || normalizedQuery.startsWith('ANALYZE')) {
        const op = normalizedQuery.split(' ')[0];
        return {
            type: 'SYSTEM',
            operation: 'ALTER' as any,
            target: 'database',
            description: `Run ${op.toLowerCase()}`,
            query,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.startsWith('UPDATE')) {
        const match = cleanQuery.match(/UPDATE\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: 'UPDATE',
            target: tableName,
            tableName,
            description: `Update ${affectedRows || 'unknown'} row(s) in ${tableName}`,
            query,
            affectedRows,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    if (normalizedQuery.startsWith('DELETE FROM')) {
        const match = cleanQuery.match(/DELETE\s+FROM\s+([`"]?)(\w+)\1/i);
        const tableName = match ? match[2] : 'unknown';
        return {
            type: 'DATA',
            operation: 'DELETE',
            target: tableName,
            tableName,
            description: `Delete ${affectedRows || 'unknown'} row(s) from ${tableName}`,
            query,
            affectedRows,
            rollbackSQL: 'MANUAL',
            status: 'APPLIED'
        };
    }

    return null;
}

/**
 * Detect DDL/DML and generate rollback SQL using regex patterns
 * Covers the MASTER SQL OPERATION MATRIX
 */
export function generateRollbackSQL(query: string, metadata?: any): string | 'MANUAL' {
    const q = query.trim().replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, '').trim();
    const upper = q.toUpperCase();

    // Helper to get name from common regex groups
    const getMatch = (regex: RegExp, groupIndex: number = 2) => {
        const match = q.match(regex);
        return match ? match[groupIndex] : null;
    };

    // 1 & 2. DATABASE / SCHEMA LEVEL
    if (upper.startsWith('CREATE DATABASE')) return `DROP DATABASE ${getMatch(/CREATE\s+DATABASE\s+([`"]?)(\w+)\1/i, 2)};`;
    if (upper.startsWith('DROP DATABASE')) return 'MANUAL';

    if (upper.startsWith('CREATE SCHEMA')) return `DROP SCHEMA ${getMatch(/CREATE\s+SCHEMA\s+([`"]?)(\w+)\1/i, 2)};`;
    if (upper.startsWith('DROP SCHEMA')) return 'MANUAL';

    if (upper.match(/(ALTER\s+DATABASE|ALTER\s+SCHEMA)\s+([`"]?)(\w+)\2\s+RENAME\s+TO\s+([`"]?)(\w+)\4/i)) {
        const m = q.match(/(ALTER\s+DATABASE|ALTER\s+SCHEMA)\s+([`"]?)(\w+)\2\s+RENAME\s+TO\s+([`"]?)(\w+)\4/i);
        return m ? `${m[1]} ${m[5]} RENAME TO ${m[3]};` : 'MANUAL';
    }

    if (upper.match(/(ALTER\s+DATABASE|ALTER\s+SCHEMA)\s+([`"]?)(\w+)\2\s+OWNER\s+TO\s+([`"]?)(\w+)\4/i)) {
        if (metadata?.oldOwner) {
            const m = q.match(/(ALTER\s+DATABASE|ALTER\s+SCHEMA)\s+([`"]?)(\w+)\2\s+OWNER\s+TO\s+/i);
            return m ? `${m[1]} ${m[3]} OWNER TO ${metadata.oldOwner};` : 'MANUAL';
        }
        return 'MANUAL';
    }

    // 3. TABLE OPERATIONS
    if (upper.startsWith('CREATE TABLE')) {
        const name = getMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"]?)(\w+)\1/i);
        return name ? `DROP TABLE IF EXISTS ${name};` : 'MANUAL';
    }
    if (upper.startsWith('DROP TABLE')) return metadata?.originalCreateSQL || 'MANUAL';
    if (upper.startsWith('TRUNCATE')) return 'MANUAL';

    if (upper.match(/(RENAME\s+TABLE|ALTER\s+TABLE)\s+([`"]?)(\w+)\2\s+RENAME\s+TO\s+([`"]?)(\w+)\4/i)) {
        const m = q.match(/(RENAME\s+TABLE|ALTER\s+TABLE)\s+([`"]?)(\w+)\2\s+RENAME\s+TO\s+([`"]?)(\w+)\4/i);
        return m ? `ALTER TABLE ${m[5]} RENAME TO ${m[3]};` : 'MANUAL';
    }

    if (upper.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+OWNER\s+TO\s+/i)) {
        if (metadata?.oldOwner) {
            const m = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1/i);
            return m ? `ALTER TABLE ${m[2]} OWNER TO ${metadata.oldOwner};` : 'MANUAL';
        }
        return 'MANUAL';
    }

    // 4. COLUMN OPERATIONS
    if (upper.includes('ALTER TABLE') && upper.includes('ADD')) {
        const mt = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+ADD\s+(?:COLUMN\s+)?([`"]?)(\w+)\3/i);
        return mt ? `ALTER TABLE ${mt[2]} DROP COLUMN ${mt[4]};` : 'MANUAL';
    }
    if (upper.includes('ALTER TABLE') && upper.includes('DROP COLUMN')) {
        const mt = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+DROP\s+COLUMN\s+([`"]?)(\w+)\3/i);
        return (mt && metadata?.columnDefinition) ? `ALTER TABLE ${mt[2]} ADD COLUMN ${metadata.columnDefinition};` : 'MANUAL';
    }
    if (upper.includes('ALTER TABLE') && upper.includes('RENAME COLUMN')) {
        const mt = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+RENAME\s+COLUMN\s+([`"]?)(\w+)\3\s+TO\s+([`"]?)(\w+)\5/i);
        return mt ? `ALTER TABLE ${mt[2]} RENAME COLUMN ${mt[6]} TO ${mt[4]};` : 'MANUAL';
    }
    if (upper.includes('ALTER COLUMN') || upper.includes('MODIFY')) {
        const mt = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+(?:ALTER\s+COLUMN|MODIFY)\s+([`"]?)(\w+)\3/i);
        if (mt) {
            if (upper.includes('SET DEFAULT')) return metadata?.oldDefault !== undefined ? `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} SET DEFAULT ${metadata.oldDefault};` : `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} DROP DEFAULT;`;
            if (upper.includes('DROP DEFAULT')) return metadata?.oldDefault !== undefined ? `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} SET DEFAULT ${metadata.oldDefault};` : 'MANUAL';
            if (upper.includes('SET NOT NULL')) return `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} DROP NOT NULL;`;
            if (upper.includes('DROP NOT NULL')) return `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} SET NOT NULL;`;
            if (metadata?.oldColumnState) return `ALTER TABLE ${mt[2]} ALTER COLUMN ${mt[4]} ${metadata.oldColumnState};`;
        }
        return 'MANUAL';
    }

    // 5. CONSTRAINTS
    if (upper.includes('ADD PRIMARY KEY') || upper.includes('ADD CONSTRAINT')) {
        const mt = q.match(/ALTER\s+TABLE\s+([`"]?)(\w+)\1\s+ADD\s+(?:CONSTRAINT\s+([`"]?)(\w+)\3\s+)?(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)/i);
        const name = mt ? (mt[4] || 'pk') : null; // Need to know constraint name to drop it
        return (mt && name) ? `ALTER TABLE ${mt[2]} DROP CONSTRAINT ${name};` : 'MANUAL';
    }

    // 6. INDEXES
    if (upper.startsWith('CREATE') && upper.includes('INDEX')) {
        const name = getMatch(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+([`"]?)(\w+)\1/i);
        return name ? `DROP INDEX ${name};` : 'MANUAL';
    }
    if (upper.startsWith('DROP INDEX')) return metadata?.originalIndexSQL || 'MANUAL';
    if (upper.includes('ALTER INDEX') && upper.includes('RENAME TO')) {
        const m = q.match(/ALTER\s+INDEX\s+([`"]?)(\w+)\1\s+RENAME\s+TO\s+([`"]?)(\w+)\3/i);
        return m ? `ALTER INDEX ${m[3]} RENAME TO ${m[1]};` : 'MANUAL';
    }

    // 7 & 8. VIEWS
    if (upper.startsWith('CREATE') && (upper.includes('VIEW') || upper.includes('MATERIALIZED VIEW'))) {
        const isMat = upper.includes('MATERIALIZED');
        const name = getMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+([`"]?)(\w+)\1/i);
        if (upper.includes('REPLACE') && metadata?.oldViewDefinition) return metadata.oldViewDefinition;
        return name ? `DROP ${isMat ? 'MATERIALIZED ' : ''}VIEW ${name};` : 'MANUAL';
    }
    if (upper.startsWith('REFRESH MATERIALIZED VIEW')) return 'MANUAL';

    // 9. FUNCTIONS / PROCEDURES
    if (upper.startsWith('CREATE') && (upper.includes('FUNCTION') || upper.includes('PROCEDURE'))) {
        const type = upper.includes('FUNCTION') ? 'FUNCTION' : 'PROCEDURE';
        if (upper.includes('REPLACE') && metadata?.oldBody) return metadata.oldBody;
        const name = getMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?(FUNCTION|PROCEDURE)\s+([`"]?)(\w+)\2/i, 3);
        return name ? `DROP ${type} ${name};` : 'MANUAL';
    }

    // 10. TRIGGERS
    if (upper.startsWith('CREATE TRIGGER')) {
        const m = q.match(/CREATE\s+TRIGGER\s+([`"]?)(\w+)\1\s+ON\s+([`"]?)(\w+)\3/i);
        return m ? `DROP TRIGGER ${m[2]} ON ${m[4]};` : 'MANUAL';
    }
    if (upper.includes('ENABLE TRIGGER') || upper.includes('DISABLE TRIGGER')) {
        const isEnable = upper.includes('ENABLE');
        const m = q.match(/(ENABLE|DISABLE)\s+TRIGGER\s+([`"]?)(\w+)\3\s+ON\s+([`"]?)(\w+)\5/i);
        return m ? `ALTER TABLE ${m[5]} ${isEnable ? 'DISABLE' : 'ENABLE'} TRIGGER ${m[3]};` : 'MANUAL';
    }

    // 11. SEQUENCES
    if (upper.startsWith('CREATE SEQUENCE')) return `DROP SEQUENCE ${getMatch(/CREATE\s+SEQUENCE\s+([`"]?)(\w+)\1/i, 2)};`;
    if (upper.startsWith('DROP SEQUENCE')) return metadata?.originalSeqSQL || 'MANUAL';
    if (upper.startsWith('ALTER SEQUENCE')) {
        const name = getMatch(/ALTER\s+SEQUENCE\s+([`"]?)(\w+)\1/i, 2);
        if (upper.includes('RESTART')) return 'MANUAL'; // value lost unless we have it
        return metadata?.oldSeqState ? `ALTER SEQUENCE ${name} ${metadata.oldSeqState};` : 'MANUAL';
    }

    // 12. DATA (DML)
    if (upper.startsWith('MERGE')) return 'MANUAL'; // Complex inverse
    if (upper.startsWith('INSERT INTO')) {
        const match = q.match(/INSERT\s+INTO\s+([`"]?)(\w+)\1/i);
        if (match && metadata?.primaryKey) {
            const pk = metadata.primaryKey;
            const conds = Object.entries(pk).map(([c, v]) => `${c} = ${typeof v === 'string' ? `'${v}'` : v}`).join(' AND ');
            return `DELETE FROM ${match[2]} WHERE ${conds};`;
        }
        return 'MANUAL';
    }
    if (upper.startsWith('DELETE FROM')) {
        const match = q.match(/DELETE\s+FROM\s+([`"]?)(\w+)\1/i);
        if (match && metadata?.rows) {
            return metadata.rows.map((row: any) => {
                const cols = Object.keys(row).join(', ');
                const vals = Object.values(row).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
                return `INSERT INTO ${match[2]} (${cols}) VALUES (${vals});`;
            }).join('\n');
        }
        return 'MANUAL';
    }
    if (upper.startsWith('UPDATE')) {
        const match = q.match(/UPDATE\s+([`"]?)(\w+)\1/i);
        if (match && metadata?.oldRows) {
            return metadata.oldRows.map((row: any) => {
                const pk = metadata.primaryKeyFields.reduce((acc: any, f: string) => ({ ...acc, [f]: row[f] }), {});
                const set = Object.entries(row).map(([c, v]) => `${c} = ${typeof v === 'string' ? `'${v}'` : v}`).join(', ');
                const where = Object.entries(pk).map(([c, v]) => `${c} = ${typeof v === 'string' ? `'${v}'` : v}`).join(' AND ');
                return `UPDATE ${match[2]} SET ${set} WHERE ${where};`;
            }).join('\n');
        }
        return 'MANUAL';
    }

    // 14. PERMISSIONS / ACL
    if (upper.startsWith('GRANT')) return q.replace(/GRANT/i, 'REVOKE').replace(/TO/i, 'FROM');
    if (upper.startsWith('REVOKE')) return q.replace(/REVOKE/i, 'GRANT').replace(/FROM/i, 'TO');
    if (upper.startsWith('CREATE ROLE')) return `DROP ROLE ${getMatch(/CREATE\s+ROLE\s+([`"]?)(\w+)\1/i, 2)};`;

    // 20. COMMENTS
    if (upper.startsWith('COMMENT ON')) {
        const m = q.match(/COMMENT\s+ON\s+(TABLE|COLUMN)\s+([\s\S]+?)\s+IS/i);
        if (m && metadata?.oldComment !== undefined) return `COMMENT ON ${m[1]} ${m[2]} IS ${metadata.oldComment === null ? 'NULL' : `'${metadata.oldComment}'`};`;
        return 'MANUAL';
    }

    return 'MANUAL';
}

/**
 * Get pending changes for a connection
 */
export async function getPendingChanges(connectionId: string): Promise<DatabaseChange[]> {
    try {
        const response = await fetch(`/api/vcs/pending?connectionId=${connectionId}`);
        const data = await response.json();
        return data.changes || [];
    } catch (error) {
        console.error('Failed to get pending changes:', error);
        return [];
    }
}

/**
 * Commit pending changes
 */
export async function commitChanges(
    connectionId: string,
    message: string,
    author: { name: string; email: string }
): Promise<boolean> {
    try {
        const pending = await getPendingChanges(connectionId);

        const response = await fetch('/api/vcs/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionId,
                message,
                author,
                changes: pending,
                snapshot: {
                    schema: { tables: {} },
                    data: { tables: {} },
                    timestamp: new Date()
                }
            })
        });

        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to commit changes:', error);
        return false;
    }
}

/**
 * Get commit history for a connection
 */
export async function getCommitHistory(connectionId: string) {
    try {
        const response = await fetch(`/api/vcs/commit?connectionId=${connectionId}`);
        const data = await response.json();
        return data.commits || [];
    } catch (error) {
        console.error('Failed to get commit history:', error);
        return [];
    }
}

/**
 * Get branches for a connection
 */
export async function getBranches(connectionId: string) {
    try {
        const response = await fetch(`/api/vcs/branches?connectionId=${connectionId}`);
        const data = await response.json();
        return { branches: data.branches || [], currentBranch: data.currentBranch || 'main' };
    } catch (error) {
        console.error('Failed to get branches:', error);
        return { branches: [], currentBranch: 'main' };
    }
}

/**
 * Create a new branch
 */
export async function createBranch(connectionId: string, name: string): Promise<boolean> {
    try {
        const response = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'create' })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to create branch:', error);
        return false;
    }
}

/**  
 * Checkout a branch
 */
export async function checkoutBranch(connectionId: string, name: string): Promise<boolean> {
    try {
        const response = await fetch('/api/vcs/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionId, name, action: 'checkout' })
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Failed to checkout branch:', error);
        return false;
    }
}

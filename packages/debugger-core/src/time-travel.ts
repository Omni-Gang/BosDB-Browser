/**
 * Time Travel Engine
 * Generates inverse operations for DML to allow reverse execution
 */

// import { DebugOperation, QueryResult } from './types';

export class TimeTravelEngine {
    /**
     * Generate inverse SQL for a given operation
     */
    generateInverseSQL(op: {
        type: string;
        table: string;
        pkFields: string[];
        oldRows: any[];
        newRows: any[];
    }): string {
        switch (op.type.toUpperCase()) {
            case 'INSERT':
                return this.generateInverseInsert(op.table, op.pkFields, op.newRows);
            case 'UPDATE':
                return this.generateInverseUpdate(op.table, op.pkFields, op.oldRows);
            case 'DELETE':
                return this.generateInverseDelete(op.table, op.oldRows);
            default:
                return `-- No inverse operation for ${op.type}`;
        }
    }

    private generateInverseInsert(table: string, pks: string[], rows: any[]): string {
        if (rows.length === 0) return '';
        const conditions = rows.map(row =>
            '(' + pks.map(pk => `"${pk}" = ${this.formatValue(row[pk])}`).join(' AND ') + ')'
        );
        return `DELETE FROM "${table}" WHERE ${conditions.join(' OR ')};`;
    }

    private generateInverseUpdate(table: string, pks: string[], oldRows: any[]): string {
        return oldRows.map(row => {
            const sets = Object.entries(row)
                .filter(([k]) => !pks.includes(k))
                .map(([k, v]) => `"${k}" = ${this.formatValue(v)}`)
                .join(', ');
            const where = pks.map(pk => `"${pk}" = ${this.formatValue(row[pk])}`).join(' AND ');
            return `UPDATE "${table}" SET ${sets} WHERE ${where};`;
        }).join('\n');
    }

    private generateInverseDelete(table: string, oldRows: any[]): string {
        if (oldRows.length === 0) return '';
        const columns = Object.keys(oldRows[0]);
        const values = oldRows.map(row =>
            '(' + columns.map(c => this.formatValue(row[c])).join(', ') + ')'
        ).join(',\n');

        return `INSERT INTO "${table}" ("${columns.join('", "')}")\nVALUES ${values};`;
    }

    private formatValue(v: any): string {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (v instanceof Date) return `'${v.toISOString()}'`;
        return String(v);
    }
}

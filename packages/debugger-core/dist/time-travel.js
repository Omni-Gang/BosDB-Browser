"use strict";
/**
 * Time Travel Engine
 * Generates inverse operations for DML to allow reverse execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeTravelEngine = void 0;
class TimeTravelEngine {
    /**
     * Generate inverse SQL for a given operation
     */
    generateInverseSQL(op) {
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
    generateInverseInsert(table, pks, rows) {
        if (rows.length === 0)
            return '';
        const conditions = rows.map(row => '(' + pks.map(pk => `"${pk}" = ${this.formatValue(row[pk])}`).join(' AND ') + ')');
        return `DELETE FROM "${table}" WHERE ${conditions.join(' OR ')};`;
    }
    generateInverseUpdate(table, pks, oldRows) {
        return oldRows.map(row => {
            const sets = Object.entries(row)
                .filter(([k]) => !pks.includes(k))
                .map(([k, v]) => `"${k}" = ${this.formatValue(v)}`)
                .join(', ');
            const where = pks.map(pk => `"${pk}" = ${this.formatValue(row[pk])}`).join(' AND ');
            return `UPDATE "${table}" SET ${sets} WHERE ${where};`;
        }).join('\n');
    }
    generateInverseDelete(table, oldRows) {
        if (oldRows.length === 0)
            return '';
        const columns = Object.keys(oldRows[0]);
        const values = oldRows.map(row => '(' + columns.map(c => this.formatValue(row[c])).join(', ') + ')').join(',\n');
        return `INSERT INTO "${table}" ("${columns.join('", "')}")\nVALUES ${values};`;
    }
    formatValue(v) {
        if (v === null)
            return 'NULL';
        if (typeof v === 'string')
            return `'${v.replace(/'/g, "''")}'`;
        if (v instanceof Date)
            return `'${v.toISOString()}'`;
        return String(v);
    }
}
exports.TimeTravelEngine = TimeTravelEngine;

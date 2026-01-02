/**
 * Data Export Utilities
 * Export query results to CSV, JSON, and Excel formats
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ExportOptions {
    filename?: string;
    includeHeaders?: boolean;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], columns: string[], options: ExportOptions = {}): void {
    const { filename = 'export', includeHeaders = true } = options;

    // Prepare data with only specified columns
    const rows = data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            obj[col] = row[col];
        });
        return obj;
    });

    const csv = Papa.unparse(rows, {
        header: includeHeaders,
        columns: columns,
    });

    downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], columns: string[], options: ExportOptions = {}): void {
    const { filename = 'export' } = options;

    // Filter to only include specified columns
    const filtered = data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            obj[col] = row[col];
        });
        return obj;
    });

    const json = JSON.stringify(filtered, null, 2);
    downloadFile(json, `${filename}.json`, 'application/json');
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[], columns: string[], options: ExportOptions = {}): void {
    const { filename = 'export', includeHeaders = true } = options;

    // Prepare data
    const rows = data.map(row => {
        const arr: any[] = [];
        columns.forEach(col => {
            arr.push(row[col]);
        });
        return arr;
    });

    // Add headers if requested
    if (includeHeaders) {
        rows.unshift(columns);
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Download
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Helper to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Parse CSV file for import
 */
export function parseCSV(file: File): Promise<{ data: any[]; columns: string[] }> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const columns = results.meta.fields || [];
                resolve({ data: results.data as any[], columns });
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}

/**
 * Generate INSERT statements from data
 */
export function generateInsertSQL(tableName: string, data: any[], columns: string[]): string {
    if (data.length === 0) return '';

    const statements = data.map(row => {
        const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            // Escape single quotes
            return `'${String(val).replace(/'/g, "''")}'`;
        });
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    });

    return statements.join('\n');
}

/**
 * Generate SELECT statement for a table
 */
export function generateSelectSQL(tableName: string, columns?: string[], limit?: number): string {
    const cols = columns && columns.length > 0 ? columns.join(', ') : '*';
    let sql = `SELECT ${cols} FROM ${tableName}`;
    if (limit) sql += ` LIMIT ${limit}`;
    return sql + ';';
}

/**
 * Generate UPDATE statement template
 */
export function generateUpdateSQL(tableName: string, columns: string[]): string {
    const setClauses = columns.map(col => `${col} = ?`).join(',\n    ');
    return `UPDATE ${tableName}\nSET\n    ${setClauses}\nWHERE id = ?;`;
}

/**
 * Generate DELETE statement template
 */
export function generateDeleteSQL(tableName: string): string {
    return `DELETE FROM ${tableName} WHERE id = ?;`;
}

/**
 * Generate CREATE TABLE statement from columns
 */
export function generateCreateTableSQL(tableName: string, columns: { name: string; type: string }[]): string {
    const colDefs = columns.map(col => `    ${col.name} ${col.type}`).join(',\n');
    return `CREATE TABLE ${tableName} (\n${colDefs}\n);`;
}

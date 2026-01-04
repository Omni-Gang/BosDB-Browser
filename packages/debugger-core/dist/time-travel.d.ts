/**
 * Time Travel Engine
 * Generates inverse operations for DML to allow reverse execution
 */
export declare class TimeTravelEngine {
    /**
     * Generate inverse SQL for a given operation
     */
    generateInverseSQL(op: {
        type: string;
        table: string;
        pkFields: string[];
        oldRows: any[];
        newRows: any[];
    }): string;
    private generateInverseInsert;
    private generateInverseUpdate;
    private generateInverseDelete;
    private formatValue;
}

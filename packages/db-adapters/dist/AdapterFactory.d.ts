import type { DatabaseType } from '@bosdb/core';
import type { IDBAdapter } from './interfaces/IDBAdapter';
/**
 * Factory for creating database adapter instances
 */
export declare class AdapterFactory {
    /**
     * Create a database adapter instance based on the database type
     * @param type Database type ('postgresql', 'mysql', 'mongodb', 'redis', 'mariadb', etc.)
     * @returns Database adapter instance
     */
    static create(type: string): IDBAdapter;
    /**
     * Get list of supported database types
     */
    static getSupportedTypes(): DatabaseType[];
}
//# sourceMappingURL=AdapterFactory.d.ts.map
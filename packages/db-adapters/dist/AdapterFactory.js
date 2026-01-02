"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterFactory = void 0;
const PostgreSQLAdapter_1 = require("./adapters/postgresql/PostgreSQLAdapter");
const MySQLAdapter_1 = require("./adapters/mysql/MySQLAdapter");
const MongoDBAdapter_1 = require("./adapters/mongodb/MongoDBAdapter");
const RedisAdapter_1 = require("./adapters/redis/RedisAdapter");
/**
 * Factory for creating database adapter instances
 */
class AdapterFactory {
    /**
     * Create a database adapter instance based on the database type
     * @param type Database type ('postgresql', 'mysql', 'mongodb', 'redis', 'mariadb', etc.)
     * @returns Database adapter instance
     */
    static create(type) {
        switch (type.toLowerCase()) {
            case 'postgresql':
            case 'postgres':
                return new PostgreSQLAdapter_1.PostgreSQLAdapter();
            case 'mysql':
                return new MySQLAdapter_1.MySQLAdapter();
            case 'mariadb':
                // MariaDB is MySQL-compatible, use MySQL adapter
                return new MySQLAdapter_1.MySQLAdapter();
            case 'mongodb':
            case 'mongo':
                return new MongoDBAdapter_1.MongoDBAdapter();
            case 'redis':
                return new RedisAdapter_1.RedisAdapter();
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }
    /**
     * Get list of supported database types
     */
    static getSupportedTypes() {
        return ['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis'];
    }
}
exports.AdapterFactory = AdapterFactory;
//# sourceMappingURL=AdapterFactory.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAdapter = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
const utils_1 = require("@bosdb/utils");
const logger = new utils_1.Logger('RedisAdapter');
/**
 * Redis Database Adapter
 * Redis is a key-value store, not a traditional SQL database
 * Query format: JSON with Redis commands
 * Example: {"command": "GET", "args": ["key"]}
 */
class RedisAdapter extends IDBAdapter_1.BaseDBAdapter {
    constructor() {
        super(...arguments);
        this.clients = new Map();
    }
    async connect(config) {
        const connectionId = this.generateConnectionId('redis');
        try {
            const client = new ioredis_1.default({
                host: config.host,
                port: config.port || 6379,
                password: config.password,
                db: parseInt(config.database || '0'),
                connectTimeout: config.connectionTimeout || 10000,
            });
            // Test connection
            await client.ping();
            this.clients.set(connectionId, client);
            logger.info(`Connected to Redis: ${config.host}:${config.port}`);
            return {
                connectionId,
                success: true,
                version: await client.info('server').then(info => {
                    const match = info.match(/redis_version:([^\r\n]+)/);
                    return match ? match[1] : 'unknown';
                }),
            };
        }
        catch (error) {
            logger.error(`Redis connection failed: ${error.message}`, error);
            return {
                connectionId: '',
                success: false,
                error: error.message,
            };
        }
    }
    async disconnect(connectionId) {
        const client = this.clients.get(connectionId);
        if (client) {
            await client.quit();
            this.clients.delete(connectionId);
            logger.info(`Disconnected from Redis: ${connectionId}`);
        }
    }
    async testConnection(config) {
        const startTime = Date.now();
        try {
            const client = new ioredis_1.default({
                host: config.host,
                port: config.port || 6379,
                password: config.password,
                db: parseInt(config.database || '0'),
                connectTimeout: 5000,
            });
            await client.ping();
            await client.quit();
            return {
                success: true,
                message: 'Redis connection successful',
                latency: Date.now() - startTime,
            };
        }
        catch (error) {
            logger.error(`Redis test connection failed: ${error.message}`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async listSchemas(connectionId) {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            // Redis has databases 0-15 by default
            const dbCount = 16;
            const schemas = [];
            for (let i = 0; i < dbCount; i++) {
                // Switch to database
                await client.select(i);
                const keyCount = await client.dbsize();
                schemas.push({
                    name: `db${i}`,
                    tableCount: keyCount,
                });
            }
            // Return to original database
            const originalDb = parseInt(client.options.db?.toString() || '0', 10) || 0;
            await client.select(originalDb);
            return schemas;
        }
        catch (error) {
            logger.error(`Failed to list Redis databases: ${error.message}`, error);
            throw new Error(`Failed to list databases: ${error.message}`);
        }
    }
    async listTables(connectionId, schemaName) {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            // Get all keys (limited to 1000 for performance)
            const keys = await client.keys('*');
            const limitedKeys = keys.slice(0, 1000);
            const tables = await Promise.all(limitedKeys.map(async (key) => {
                const type = await client.type(key);
                return {
                    schema: schemaName || 'db0',
                    name: key,
                    type: type,
                    rowCount: type === 'list' ? await client.llen(key) :
                        type === 'set' ? await client.scard(key) :
                            type === 'zset' ? await client.zcard(key) :
                                type === 'hash' ? await client.hlen(key) : 1,
                };
            }));
            return tables;
        }
        catch (error) {
            logger.error(`Failed to list Redis keys: ${error.message}`, error);
            throw new Error(`Failed to list keys: ${error.message}`);
        }
    }
    async describeTable(connectionId, schemaName, tableName) {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const type = await client.type(tableName);
            const ttl = await client.ttl(tableName);
            const columns = [
                {
                    name: 'key',
                    dataType: 'string',
                    nullable: false,
                    isPrimaryKey: true,
                    isForeignKey: false,
                },
                {
                    name: 'type',
                    dataType: type,
                    nullable: false,
                    isPrimaryKey: false,
                    isForeignKey: false,
                },
                {
                    name: 'ttl',
                    dataType: 'integer',
                    nullable: true,
                    defaultValue: ttl.toString(),
                    isPrimaryKey: false,
                    isForeignKey: false,
                },
            ];
            return {
                schema: schemaName,
                name: tableName,
                columns,
                primaryKeys: ['key'],
                foreignKeys: [],
                indexes: [],
                rowCount: 1,
            };
        }
        catch (error) {
            logger.error(`Failed to describe Redis key: ${error.message}`, error);
            throw new Error(`Failed to describe key: ${error.message}`);
        }
    }
    async getIndexes(_connectionId, _schemaName, _tableName) {
        // Redis doesn't have traditional indexes
        return [];
    }
    async executeQuery(request) {
        const client = this.clients.get(request.connectionId);
        if (!client) {
            throw new Error(`Connection ${request.connectionId} not found`);
        }
        const startTime = Date.now();
        try {
            // Parse Redis command (JSON format)
            // Example: {"command": "GET", "args": ["mykey"]}
            // Or: {"command": "KEYS", "args": ["*"]}
            const queryObj = JSON.parse(request.query);
            if (!queryObj.command) {
                throw new Error('Query must have "command" field. Example: {"command": "GET", "args": ["mykey"]}');
            }
            const command = queryObj.command.toUpperCase();
            const args = queryObj.args || [];
            // Execute Redis command
            const result = await client[command.toLowerCase()](...args);
            // Format result for display
            let rows = [];
            let fields = [];
            if (Array.isArray(result)) {
                rows = result.map((value, index) => ({ index, value }));
                fields = [{ name: 'index' }, { name: 'value' }];
            }
            else if (typeof result === 'object' && result !== null) {
                rows = [result];
                fields = Object.keys(result).map(key => ({ name: key }));
            }
            else {
                rows = [{ result }];
                fields = [{ name: 'result' }];
            }
            const executionTime = Date.now() - startTime;
            return {
                rows,
                fields,
                rowCount: rows.length,
                executionTime,
                hasMore: false,
            };
        }
        catch (error) {
            logger.error(`Redis command execution failed: ${error.message}`, error);
            throw new Error(`Command execution failed: ${error.message}`);
        }
    }
    async explainQuery(_connectionId, _query) {
        // Redis doesn't have EXPLAIN functionality
        return {
            plan: { message: 'Redis does not support query plans' },
            planText: 'Redis is a key-value store and does not have SQL-style query plans.',
        };
    }
    async getVersion(connectionId) {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const info = await client.info('server');
            const match = info.match(/redis_version:([^\r\n]+)/);
            return match ? match[1] : 'unknown';
        }
        catch (error) {
            logger.error(`Failed to get Redis version: ${error.message}`, error);
            throw new Error(`Failed to get version: ${error.message}`);
        }
    }
    async getDatabaseInfo(connectionId) {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }
        try {
            const info = await client.info();
            const serverInfo = await client.info('server');
            const versionMatch = serverInfo.match(/redis_version:([^\r\n]+)/);
            const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
            return {
                version: versionMatch ? versionMatch[1] : 'unknown',
                serverVersion: versionMatch ? versionMatch[1] : 'unknown',
                uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0,
                currentDatabase: `db${client.options.db || 0}`,
            };
        }
        catch (error) {
            logger.error(`Failed to get Redis database info: ${error.message}`, error);
            throw new Error(`Failed to get database info: ${error.message}`);
        }
    }
}
exports.RedisAdapter = RedisAdapter;
//# sourceMappingURL=RedisAdapter.js.map
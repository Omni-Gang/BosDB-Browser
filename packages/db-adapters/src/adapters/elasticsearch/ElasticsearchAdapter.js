"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElasticsearchAdapter = void 0;
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
/**
 * Elasticsearch Database Adapter
 */
class ElasticsearchAdapter extends IDBAdapter_1.BaseDBAdapter {
    async connect(config) {
        const connectionId = this.generateConnectionId('elasticsearch');
        try {
            // Dynamic import to avoid build issues
            const { Client } = await Promise.resolve().then(() => __importStar(require('@elastic/elasticsearch')));
            const client = new Client({
                node: `http${config.ssl ? 's' : ''}://${config.host}:${config.port}`,
                auth: config.username && config.password ? {
                    username: config.username,
                    password: config.password,
                } : undefined,
            });
            const info = await client.info();
            this.connectionMap.set(connectionId, client);
            return {
                connectionId,
                success: true,
                version: `Elasticsearch ${info.version?.number}`
            };
        }
        catch (error) {
            return { connectionId, success: false, error: error.message };
        }
    }
    async disconnect(connectionId) {
        const client = this.getConnection(connectionId);
        await client.close();
        this.connectionMap.delete(connectionId);
    }
    async testConnection(config) {
        const start = Date.now();
        try {
            const { Client } = await Promise.resolve().then(() => __importStar(require('@elastic/elasticsearch')));
            const client = new Client({
                node: `http${config.ssl ? 's' : ''}://${config.host}:${config.port}`,
                auth: config.username && config.password ? {
                    username: config.username,
                    password: config.password,
                } : undefined,
            });
            await client.ping();
            await client.close();
            return {
                success: true,
                message: 'Connection successful',
                latency: Date.now() - start
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async listSchemas(_connectionId) {
        // Elasticsearch doesn't have schemas, return empty
        return [{ name: 'default' }];
    }
    async listTables(connectionId, _schema) {
        const client = this.getConnection(connectionId);
        // In Elasticsearch, indices are like tables
        const indices = await client.cat.indices({ format: 'json' });
        return indices.map((index) => ({
            schema: 'default',
            name: index.index,
            type: 'table',
            rowCount: parseInt(index['docs.count'] || '0'),
            size: index['store.size'],
        }));
    }
    async describeTable(connectionId, schema, table) {
        const client = this.getConnection(connectionId);
        const mapping = await client.indices.getMapping({ index: table });
        const properties = mapping[table]?.mappings?.properties || {};
        const columns = Object.entries(properties).map(([name, prop]) => ({
            name,
            dataType: prop.type || 'object',
            nullable: true,
            isPrimaryKey: name === '_id',
            isForeignKey: false,
        }));
        return {
            schema,
            name: table,
            columns,
            primaryKeys: ['_id'],
            foreignKeys: [],
            indexes: [],
        };
    }
    async getIndexes(_connectionId, _schema, _table) {
        // Elasticsearch manages indexes internally
        return [];
    }
    async executeQuery(request) {
        const client = this.getConnection(request.connectionId);
        const start = Date.now();
        // Parse the query - expecting JSON or SQL
        let result;
        try {
            // Try SQL query first (if SQL plugin is available)
            result = await client.sql.query({ query: request.query });
            return {
                rows: result.rows || [],
                fields: result.columns?.map((col) => ({
                    name: col.name,
                    dataType: col.type
                })) || [],
                rowCount: result.rows?.length || 0,
                executionTime: Date.now() - start,
            };
        }
        catch {
            // Fall back to DSL query
            try {
                const queryBody = JSON.parse(request.query);
                const index = queryBody.index || '_all';
                delete queryBody.index;
                result = await client.search({
                    index,
                    body: queryBody,
                });
                const hits = result.hits?.hits || [];
                return {
                    rows: hits.map((hit) => ({ _id: hit._id, ...hit._source })),
                    fields: hits.length > 0
                        ? Object.keys(hits[0]._source || {}).map(name => ({ name, dataType: 'unknown' }))
                        : [],
                    rowCount: hits.length,
                    executionTime: Date.now() - start,
                };
            }
            catch (parseError) {
                throw new Error(`Invalid query format. Use SQL or JSON DSL. Error: ${parseError.message}`);
            }
        }
    }
    async explainQuery(connectionId, query) {
        const client = this.getConnection(connectionId);
        try {
            const queryBody = JSON.parse(query);
            const index = queryBody.index || '_all';
            delete queryBody.index;
            const result = await client.search({
                index,
                body: queryBody,
                explain: true,
            });
            return {
                plan: result.hits?.hits?.map((hit) => hit._explanation),
                planText: JSON.stringify(result.hits?.hits?.[0]?._explanation, null, 2),
            };
        }
        catch {
            return {
                plan: { message: 'EXPLAIN requires JSON DSL query format' },
                planText: 'Provide query in JSON DSL format to see execution plan',
            };
        }
    }
    async getVersion(connectionId) {
        const client = this.getConnection(connectionId);
        const info = await client.info();
        return `Elasticsearch ${info.version?.number}`;
    }
    async getDatabaseInfo(connectionId) {
        const client = this.getConnection(connectionId);
        const info = await client.info();
        return {
            version: info.version?.number || 'Unknown',
            serverVersion: info.version?.build_hash,
        };
    }
}
exports.ElasticsearchAdapter = ElasticsearchAdapter;
//# sourceMappingURL=ElasticsearchAdapter.js.map
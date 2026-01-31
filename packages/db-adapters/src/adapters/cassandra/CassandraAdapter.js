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
exports.CassandraAdapter = void 0;
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
/**
 * Apache Cassandra Database Adapter
 */
class CassandraAdapter extends IDBAdapter_1.BaseDBAdapter {
    async connect(config) {
        const connectionId = this.generateConnectionId('cassandra');
        try {
            // Dynamic import to avoid build issues when cassandra-driver is not installed
            const cassandra = await Promise.resolve().then(() => __importStar(require('cassandra-driver')));
            const authProvider = config.username && config.password
                ? new cassandra.auth.PlainTextAuthProvider(config.username, config.password)
                : undefined;
            const client = new cassandra.Client({
                contactPoints: [`${config.host}:${config.port}`],
                localDataCenter: 'datacenter1',
                keyspace: config.database || undefined,
                authProvider,
            });
            await client.connect();
            this.connectionMap.set(connectionId, client);
            const result = await client.execute('SELECT release_version FROM system.local');
            const version = result.rows[0]?.release_version || 'Cassandra';
            return { connectionId, success: true, version };
        }
        catch (error) {
            return { connectionId, success: false, error: error.message };
        }
    }
    async disconnect(connectionId) {
        const client = this.getConnection(connectionId);
        await client.shutdown();
        this.connectionMap.delete(connectionId);
    }
    async testConnection(config) {
        const start = Date.now();
        try {
            const cassandra = await Promise.resolve().then(() => __importStar(require('cassandra-driver')));
            const authProvider = config.username && config.password
                ? new cassandra.auth.PlainTextAuthProvider(config.username, config.password)
                : undefined;
            const client = new cassandra.Client({
                contactPoints: [`${config.host}:${config.port}`],
                localDataCenter: 'datacenter1',
                authProvider,
            });
            await client.connect();
            await client.execute('SELECT now() FROM system.local');
            await client.shutdown();
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
    async listSchemas(connectionId) {
        const client = this.getConnection(connectionId);
        const result = await client.execute('SELECT keyspace_name FROM system_schema.keyspaces');
        return result.rows.map((row) => ({
            name: row.keyspace_name,
        }));
    }
    async listTables(connectionId, schema) {
        const client = this.getConnection(connectionId);
        const keyspace = schema || client.keyspace;
        if (!keyspace) {
            return [];
        }
        const result = await client.execute('SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?', [keyspace]);
        return result.rows.map((row) => ({
            schema: keyspace,
            name: row.table_name,
            type: 'table',
        }));
    }
    async describeTable(connectionId, schema, table) {
        const client = this.getConnection(connectionId);
        const result = await client.execute('SELECT column_name, type, kind FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?', [schema, table]);
        const columns = result.rows.map((row) => ({
            name: row.column_name,
            dataType: row.type,
            nullable: true,
            isPrimaryKey: row.kind === 'partition_key' || row.kind === 'clustering',
            isForeignKey: false,
        }));
        const primaryKeys = result.rows
            .filter((row) => row.kind === 'partition_key' || row.kind === 'clustering')
            .map((row) => row.column_name);
        return {
            schema,
            name: table,
            columns,
            primaryKeys,
            foreignKeys: [],
            indexes: [],
        };
    }
    async getIndexes(connectionId, schema, table) {
        const client = this.getConnection(connectionId);
        const result = await client.execute('SELECT index_name, options FROM system_schema.indexes WHERE keyspace_name = ? AND table_name = ?', [schema, table]);
        return result.rows.map((row) => ({
            name: row.index_name,
            columns: [row.options?.target || ''],
            unique: false,
            primary: false,
        }));
    }
    async executeQuery(request) {
        const client = this.getConnection(request.connectionId);
        const start = Date.now();
        const result = await client.execute(request.query);
        return {
            rows: result.rows || [],
            fields: result.columns?.map((col) => ({
                name: col.name,
                dataType: col.type.code?.toString() || 'unknown'
            })) || [],
            rowCount: result.rowLength || 0,
            executionTime: Date.now() - start,
        };
    }
    async explainQuery(_connectionId, _query) {
        // Cassandra doesn't have traditional EXPLAIN
        return {
            plan: { message: 'EXPLAIN not supported in Cassandra' },
            planText: 'Query execution plans are not available in Cassandra',
        };
    }
    async getVersion(connectionId) {
        const client = this.getConnection(connectionId);
        const result = await client.execute('SELECT release_version FROM system.local');
        return result.rows[0]?.release_version || 'Cassandra';
    }
    async getDatabaseInfo(connectionId) {
        const client = this.getConnection(connectionId);
        const result = await client.execute('SELECT cluster_name, release_version FROM system.local');
        return {
            version: result.rows[0]?.release_version || 'Cassandra',
            currentDatabase: client.keyspace,
        };
    }
}
exports.CassandraAdapter = CassandraAdapter;
//# sourceMappingURL=CassandraAdapter.js.map
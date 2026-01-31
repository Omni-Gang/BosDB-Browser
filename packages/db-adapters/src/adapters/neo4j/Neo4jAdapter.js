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
exports.Neo4jAdapter = void 0;
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
/**
 * Neo4j Graph Database Adapter
 */
class Neo4jAdapter extends IDBAdapter_1.BaseDBAdapter {
    async connect(config) {
        const connectionId = this.generateConnectionId('neo4j');
        try {
            // Dynamic import to avoid build issues
            const neo4j = await Promise.resolve().then(() => __importStar(require('neo4j-driver')));
            const driver = neo4j.default.driver(`neo4j://${config.host}:${config.port}`, neo4j.default.auth.basic(config.username, config.password));
            // Verify connectivity
            const session = driver.session({ database: config.database || 'neo4j' });
            const result = await session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version');
            const record = result.records[0];
            const version = `${record?.get('name')} ${record?.get('version')}`;
            await session.close();
            this.connectionMap.set(connectionId, { driver, database: config.database || 'neo4j' });
            return { connectionId, success: true, version };
        }
        catch (error) {
            return { connectionId, success: false, error: error.message };
        }
    }
    async disconnect(connectionId) {
        const { driver } = this.getConnection(connectionId);
        await driver.close();
        this.connectionMap.delete(connectionId);
    }
    async testConnection(config) {
        const start = Date.now();
        try {
            const neo4j = await Promise.resolve().then(() => __importStar(require('neo4j-driver')));
            const driver = neo4j.default.driver(`neo4j://${config.host}:${config.port}`, neo4j.default.auth.basic(config.username, config.password));
            const session = driver.session({ database: config.database || 'neo4j' });
            await session.run('RETURN 1');
            await session.close();
            await driver.close();
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
        const { driver } = this.getConnection(connectionId);
        const session = driver.session({ database: 'system' });
        try {
            const result = await session.run('SHOW DATABASES');
            return result.records.map((record) => ({
                name: record.get('name'),
            }));
        }
        finally {
            await session.close();
        }
    }
    async listTables(connectionId, schema) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database: schema || database });
        try {
            // In Neo4j, "tables" are node labels
            const result = await session.run('CALL db.labels() YIELD label RETURN label');
            return result.records.map((record) => ({
                schema: schema || database,
                name: record.get('label'),
                type: 'table',
            }));
        }
        finally {
            await session.close();
        }
    }
    async describeTable(connectionId, schema, table) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database: schema || database });
        try {
            // Get properties for nodes with this label
            const result = await session.run(`
                MATCH (n:${table})
                WITH n LIMIT 100
                UNWIND keys(n) as key
                RETURN DISTINCT key as property
            `);
            const columns = result.records.map((record) => ({
                name: record.get('property'),
                dataType: 'any',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
            }));
            return {
                schema,
                name: table,
                columns,
                primaryKeys: [],
                foreignKeys: [],
                indexes: [],
            };
        }
        finally {
            await session.close();
        }
    }
    async getIndexes(connectionId, schema, table) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database: schema || database });
        try {
            const result = await session.run('SHOW INDEXES');
            return result.records
                .filter((record) => record.get('labelsOrTypes')?.includes(table))
                .map((record) => ({
                name: record.get('name'),
                columns: record.get('properties') || [],
                unique: record.get('uniqueness') === 'UNIQUE',
                primary: false,
            }));
        }
        finally {
            await session.close();
        }
    }
    async executeQuery(request) {
        const { driver, database } = this.getConnection(request.connectionId);
        const session = driver.session({ database });
        const start = Date.now();
        try {
            const result = await session.run(request.query);
            // Convert Neo4j records to plain objects
            const rows = result.records.map((record) => {
                const obj = {};
                record.keys.forEach((key) => {
                    const value = record.get(key);
                    // Convert Neo4j objects to plain values
                    obj[key] = this.convertNeo4jValue(value);
                });
                return obj;
            });
            const fields = result.records.length > 0
                ? result.records[0].keys.map((key) => ({ name: key, dataType: 'any' }))
                : [];
            return {
                rows,
                fields,
                rowCount: rows.length,
                executionTime: Date.now() - start,
            };
        }
        finally {
            await session.close();
        }
    }
    convertNeo4jValue(value) {
        if (value === null || value === undefined) {
            return value;
        }
        // Handle Neo4j Integer
        if (value.toNumber) {
            return value.toNumber();
        }
        // Handle Neo4j Node
        if (value.labels && value.properties) {
            return {
                _id: value.identity?.toNumber?.() || value.identity,
                _labels: value.labels,
                ...value.properties,
            };
        }
        // Handle Neo4j Relationship
        if (value.type && value.properties && value.start && value.end) {
            return {
                _id: value.identity?.toNumber?.() || value.identity,
                _type: value.type,
                _start: value.start?.toNumber?.() || value.start,
                _end: value.end?.toNumber?.() || value.end,
                ...value.properties,
            };
        }
        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(v => this.convertNeo4jValue(v));
        }
        return value;
    }
    async explainQuery(connectionId, query) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database });
        try {
            const result = await session.run(`EXPLAIN ${query}`);
            return {
                plan: result.summary.plan,
                planText: JSON.stringify(result.summary.plan, null, 2),
            };
        }
        finally {
            await session.close();
        }
    }
    async getVersion(connectionId) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database });
        try {
            const result = await session.run('CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version');
            const record = result.records[0];
            return `${record?.get('name')} ${record?.get('version')}`;
        }
        finally {
            await session.close();
        }
    }
    async getDatabaseInfo(connectionId) {
        const { driver, database } = this.getConnection(connectionId);
        const session = driver.session({ database });
        try {
            const result = await session.run('CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] as version, edition');
            const record = result.records[0];
            return {
                version: record?.get('version') || 'Unknown',
                serverVersion: `${record?.get('name')} ${record?.get('edition')}`,
                currentDatabase: database,
            };
        }
        finally {
            await session.close();
        }
    }
}
exports.Neo4jAdapter = Neo4jAdapter;
//# sourceMappingURL=Neo4jAdapter.js.map
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
exports.OracleAdapter = void 0;
const IDBAdapter_1 = require("../../interfaces/IDBAdapter");
/**
 * Oracle Database Adapter
 */
class OracleAdapter extends IDBAdapter_1.BaseDBAdapter {
    async connect(config) {
        const connectionId = this.generateConnectionId('oracle');
        try {
            // Dynamic import to avoid build issues when oracledb is not installed
            // @ts-ignore
            const oracledb = await Promise.resolve().then(() => __importStar(require('oracledb')));
            const connection = await oracledb.default.getConnection({
                user: config.username,
                password: config.password,
                connectString: `${config.host}:${config.port}/${config.database}`,
            });
            this.connectionMap.set(connectionId, connection);
            const result = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
            const version = result.rows?.[0]?.[0] || 'Oracle Database';
            return { connectionId, success: true, version };
        }
        catch (error) {
            console.error('[OracleAdapter] Connection error:', error);
            return { connectionId, success: false, error: error.message };
        }
    }
    async disconnect(connectionId) {
        const connection = this.getConnection(connectionId);
        await connection.close();
        this.connectionMap.delete(connectionId);
    }
    async testConnection(config) {
        const start = Date.now();
        try {
            // @ts-ignore
            const oracledb = await Promise.resolve().then(() => __importStar(require('oracledb')));
            const connection = await oracledb.default.getConnection({
                user: config.username,
                password: config.password,
                connectString: `${config.host}:${config.port}/${config.database}`,
            });
            await connection.execute('SELECT 1 FROM DUAL');
            await connection.close();
            return {
                success: true,
                message: 'Connection successful',
                latency: Date.now() - start
            };
        }
        catch (error) {
            console.error('[OracleAdapter] Test failed:', error);
            return { success: false, error: error.message };
        }
    }
    async listSchemas(connectionId) {
        const connection = this.getConnection(connectionId);
        const result = await connection.execute(`
            SELECT username as schema_name
            FROM all_users
            ORDER BY username
        `);
        return (result.rows || []).map((row) => ({
            name: row[0],
        }));
    }
    async listTables(connectionId, schema) {
        const connection = this.getConnection(connectionId);
        const ownerFilter = schema ? `WHERE owner = '${schema.toUpperCase()}'` : '';
        const result = await connection.execute(`
            SELECT owner, table_name, 'table' as table_type
            FROM all_tables
            ${ownerFilter}
            UNION ALL
            SELECT owner, view_name, 'view' as table_type
            FROM all_views
            ${ownerFilter ? ownerFilter.replace('table_name', 'view_name') : ''}
            ORDER BY 1, 2
        `);
        return (result.rows || []).map((row) => ({
            schema: row[0],
            name: row[1],
            type: row[2],
        }));
    }
    async describeTable(connectionId, schema, table) {
        const connection = this.getConnection(connectionId);
        const columnsResult = await connection.execute(`
            SELECT 
                column_name,
                data_type,
                data_length,
                data_precision,
                data_scale,
                nullable
            FROM all_tab_columns
            WHERE owner = '${schema.toUpperCase()}' AND table_name = '${table.toUpperCase()}'
            ORDER BY column_id
        `);
        const columns = (columnsResult.rows || []).map((row) => ({
            name: row[0],
            dataType: row[1],
            maxLength: row[2],
            precision: row[3],
            scale: row[4],
            nullable: row[5] === 'Y',
            defaultValue: undefined,
            isPrimaryKey: false,
            isForeignKey: false,
        }));
        return {
            schema,
            name: table,
            columns,
            primaryKeys: [],
            foreignKeys: [],
            indexes: await this.getIndexes(connectionId, schema, table),
        };
    }
    async getIndexes(connectionId, schema, table) {
        const connection = this.getConnection(connectionId);
        const result = await connection.execute(`
            SELECT index_name, uniqueness
            FROM all_indexes
            WHERE owner = '${schema.toUpperCase()}' AND table_name = '${table.toUpperCase()}'
        `);
        return (result.rows || []).map((row) => ({
            name: row[0],
            columns: [],
            unique: row[1] === 'UNIQUE',
            primary: false,
        }));
    }
    async executeQuery(request) {
        const connection = this.getConnection(request.connectionId);
        const start = Date.now();
        const result = await connection.execute(request.query, [], { outFormat: 2 }); // OUT_FORMAT_OBJECT
        return {
            rows: result.rows || [],
            fields: result.metaData?.map((meta) => ({
                name: meta.name,
                dataType: meta.dbTypeName || 'unknown'
            })) || [],
            rowCount: result.rows?.length || 0,
            executionTime: Date.now() - start,
        };
    }
    async explainQuery(connectionId, query) {
        const connection = this.getConnection(connectionId);
        await connection.execute(`EXPLAIN PLAN FOR ${query}`);
        const result = await connection.execute('SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY())');
        return {
            plan: result.rows,
            planText: (result.rows || []).map((r) => r[0]).join('\n'),
        };
    }
    async getVersion(connectionId) {
        const connection = this.getConnection(connectionId);
        const result = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
        return result.rows?.[0]?.[0] || 'Oracle Database';
    }
    async getDatabaseInfo(connectionId) {
        const connection = this.getConnection(connectionId);
        const versionResult = await connection.execute('SELECT * FROM V$VERSION WHERE BANNER LIKE \'Oracle%\'');
        const userResult = await connection.execute('SELECT SYS_CONTEXT(\'USERENV\', \'CURRENT_USER\') FROM DUAL');
        const dbResult = await connection.execute('SELECT SYS_CONTEXT(\'USERENV\', \'DB_NAME\') FROM DUAL');
        return {
            version: versionResult.rows?.[0]?.[0] || 'Oracle Database',
            currentDatabase: dbResult.rows?.[0]?.[0],
            currentUser: userResult.rows?.[0]?.[0],
        };
    }
}
exports.OracleAdapter = OracleAdapter;
//# sourceMappingURL=OracleAdapter.js.map
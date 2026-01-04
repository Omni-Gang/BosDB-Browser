import { MongoClient, Db, Document } from 'mongodb';
import { BaseDBAdapter } from '../../interfaces/IDBAdapter';
import type {
    ConnectionConfig,
    ConnectionResult,
    TestResult,
    QueryRequest,
    QueryResult,
    Schema,
    Table,
    TableMetadata,
    Column,
    Index,

    DatabaseInfo,
    ExplainResult,
} from '@bosdb/core';
import { Logger } from '@bosdb/utils';

const logger = new Logger('MongoDBAdapter');

/**
 * MongoDB Database Adapter
 * Implements IDBAdapter for MongoDB databases
 * 
 * Note: MongoDB is document-oriented (NoSQL), so some SQL concepts don't apply:
 * - Schemas -> Databases
 * - Tables -> Collections
 * - Columns -> Document fields (dynamic)
 * - Query -> Aggregation pipelines or find operations
 */
export class MongoDBAdapter extends BaseDBAdapter {
    private clients: Map<string, MongoClient> = new Map();
    private databases: Map<string, Db> = new Map();

    async connect(config: ConnectionConfig): Promise<ConnectionResult> {
        const connectionId = this.generateConnectionId('mongodb');

        try {
            // Build MongoDB connection string
            const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}?authSource=admin`;

            const client = new MongoClient(uri, {
                connectTimeoutMS: config.connectionTimeout || 10000,
                serverSelectionTimeoutMS: config.connectionTimeout || 10000,
            });

            await client.connect();
            const db = client.db(config.database);

            // Test connection by running a simple command
            const adminDb = client.db('admin');
            const serverInfo = await adminDb.command({ serverStatus: 1 });

            this.clients.set(connectionId, client);
            this.databases.set(connectionId, db);

            logger.info(`Connected to MongoDB: ${config.host}:${config.port}/${config.database}`);

            return {
                connectionId,
                success: true,
                version: serverInfo.version,
            };
        } catch (error: any) {
            logger.error(`MongoDB connection failed: ${error.message}`, error);
            return {
                connectionId: '',
                success: false,
                error: error.message,
            };
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const client = this.clients.get(connectionId);
        if (client) {
            await client.close();
            this.clients.delete(connectionId);
            this.databases.delete(connectionId);
            logger.info(`Disconnected from MongoDB: ${connectionId}`);
        }
    }

    async testConnection(config: ConnectionConfig): Promise<TestResult> {
        const startTime = Date.now();
        try {
            const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}?authSource=admin`;

            const client = new MongoClient(uri, {
                connectTimeoutMS: 5000,
                serverSelectionTimeoutMS: 5000,
            });

            await client.connect();
            await client.db('admin').command({ ping: 1 });
            await client.close();

            return {
                success: true,
                message: 'MongoDB connection successful',
                latency: Date.now() - startTime,
            };
        } catch (error: any) {
            logger.error(`MongoDB test connection failed: ${error.message}`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async listSchemas(connectionId: string): Promise<Schema[]> {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const adminDb = client.db('admin');
            const result = await adminDb.command({ listDatabases: 1 });

            const schemas: Schema[] = [];
            for (const dbInfo of result.databases) {
                if (['admin', 'local', 'config'].includes(dbInfo.name)) {
                    continue; // Skip system databases
                }

                // Get collection count for each database
                const db = client.db(dbInfo.name);
                const collections = await db.listCollections().toArray();

                schemas.push({
                    name: dbInfo.name,
                    tableCount: collections.length,
                });
            }

            return schemas;
        } catch (error: any) {
            logger.error(`Failed to list MongoDB databases: ${error.message}`, error);
            throw new Error(`Failed to list databases: ${error.message}`);
        }
    }

    async listTables(connectionId: string, schemaName?: string): Promise<Table[]> {
        const db = this.databases.get(connectionId);
        const client = this.clients.get(connectionId);
        if (!db || !client) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        const dbName = schemaName || db.databaseName;
        const targetDb = client.db(dbName);

        try {
            const collections = await targetDb.listCollections().toArray();

            const tables: Table[] = [];
            for (const coll of collections) {
                // Get document count
                const collection = targetDb.collection(coll.name);
                const count = await collection.estimatedDocumentCount();

                tables.push({
                    schema: dbName,
                    name: coll.name,
                    type: coll.type === 'view' ? 'view' : 'table',
                    rowCount: count,
                });
            }

            return tables;
        } catch (error: any) {
            logger.error(`Failed to list MongoDB collections: ${error.message}`, error);
            throw new Error(`Failed to list collections: ${error.message}`);
        }
    }

    async describeTable(connectionId: string, schemaName: string, tableName: string): Promise<TableMetadata> {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const db = client.db(schemaName);
            const collection = db.collection(tableName);

            // Sample documents to infer schema (MongoDB has dynamic schema)
            const sampleDocs = await collection.find({}).limit(100).toArray();

            // Infer fields from sample documents
            const fieldSet = new Set<string>();
            for (const doc of sampleDocs) {
                Object.keys(doc).forEach(key => fieldSet.add(key));
            }

            const columns: Column[] = Array.from(fieldSet).map(fieldName => ({
                name: fieldName,
                dataType: this.inferMongoType(sampleDocs, fieldName),
                nullable: true, // MongoDB fields are always optional by default
                defaultValue: undefined,
                isPrimaryKey: fieldName === '_id',
                isForeignKey: false,
            }));

            // Get indexes
            const indexes = await this.getIndexes(connectionId, schemaName, tableName);

            // Get document count
            const rowCount = await collection.estimatedDocumentCount();

            return {
                schema: schemaName,
                name: tableName,
                columns,
                primaryKeys: ['_id'],
                foreignKeys: [], // MongoDB doesn't have enforced foreign keys
                indexes,
                rowCount,
            };
        } catch (error: any) {
            logger.error(`Failed to describe MongoDB collection: ${error.message}`, error);
            throw new Error(`Failed to describe collection: ${error.message}`);
        }
    }

    async getIndexes(connectionId: string, schemaName: string, tableName: string): Promise<Index[]> {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const db = client.db(schemaName);
            const collection = db.collection(tableName);
            const indexInfo = await collection.indexes();

            return indexInfo.map(idx => ({
                name: idx.name || 'unknown',
                columns: Object.keys(idx.key),
                unique: idx.unique || false,
                primary: idx.name === '_id_',
                type: 'btree',
            }));
        } catch (error: any) {
            logger.error(`Failed to get MongoDB indexes: ${error.message}`, error);
            throw new Error(`Failed to get indexes: ${error.message}`);
        }
    }

    async executeQuery(request: QueryRequest): Promise<QueryResult> {
        const db = this.databases.get(request.connectionId);
        if (!db) {
            throw new Error(`Connection ${request.connectionId} not found`);
        }

        const startTime = Date.now();

        try {
            // Parse MongoDB query (JSON format)
            // Supports: { "find": "collection", "filter": {...}, "limit": 10 }
            // Or aggregation: { "aggregate": "collection", "pipeline": [...] }
            const queryObj = JSON.parse(request.query);

            let rows: any[] = [];
            let fields: any[] = [];

            if (queryObj.find) {
                // Find operation
                const collection = db.collection(queryObj.find);
                const filter = queryObj.filter || {};
                const options: any = {};

                if (queryObj.sort) options.sort = queryObj.sort;
                if (queryObj.limit) options.limit = queryObj.limit;
                if (queryObj.skip) options.skip = queryObj.skip;

                rows = await collection.find(filter, options).toArray();
            } else if (queryObj.aggregate) {
                // Aggregation pipeline
                const collection = db.collection(queryObj.aggregate);
                const pipeline = queryObj.pipeline || [];
                rows = await collection.aggregate(pipeline).toArray();
            } else if (queryObj.drop) {
                // Drop collection
                const success = await db.collection(queryObj.drop).drop();
                rows = [{ success }];
                fields = [{ name: 'success', dataType: 'boolean' }];
            } else {
                throw new Error('Invalid query format. Use {"find": "collection", "filter": {...}}, {"aggregate": "collection", "pipeline": [...]}, or {"drop": "collection"}');
            }

            // Infer fields from results
            if (rows.length > 0) {
                const fieldNames = new Set<string>();
                rows.forEach(row => Object.keys(row).forEach(key => fieldNames.add(key)));
                fields = Array.from(fieldNames).map(name => ({
                    name,
                    dataType: 'mixed',
                }));
            }

            const executionTime = Date.now() - startTime;

            return {
                rows: rows.slice(0, request.maxRows || 1000),
                fields,
                rowCount: rows.length,
                executionTime,
                hasMore: rows.length > (request.maxRows || 1000),
            };
        } catch (error: any) {
            logger.error(`MongoDB query execution failed: ${error.message}`, error);
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    async explainQuery(connectionId: string, query: string): Promise<ExplainResult> {
        const db = this.databases.get(connectionId);
        if (!db) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const queryObj = JSON.parse(query);

            if (queryObj.find) {
                const collection = db.collection(queryObj.find);
                const explainResult = await collection.find(queryObj.filter || {}).explain();
                return {
                    plan: explainResult,
                    planText: JSON.stringify(explainResult, null, 2),
                };
            } else if (queryObj.aggregate) {
                const collection = db.collection(queryObj.aggregate);
                const explainResult = await collection.aggregate(queryObj.pipeline || [], { explain: true }).toArray();
                return {
                    plan: explainResult,
                    planText: JSON.stringify(explainResult, null, 2),
                };
            }

            throw new Error('Cannot explain this query type');
        } catch (error: any) {
            logger.error(`MongoDB EXPLAIN failed: ${error.message}`, error);
            throw new Error(`EXPLAIN failed: ${error.message}`);
        }
    }

    async getVersion(connectionId: string): Promise<string> {
        const client = this.clients.get(connectionId);
        if (!client) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const adminDb = client.db('admin');
            const buildInfo = await adminDb.command({ buildInfo: 1 });
            return buildInfo.version;
        } catch (error: any) {
            logger.error(`Failed to get MongoDB version: ${error.message}`, error);
            throw new Error(`Failed to get version: ${error.message}`);
        }
    }

    async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo> {
        const client = this.clients.get(connectionId);
        const db = this.databases.get(connectionId);
        if (!client || !db) {
            throw new Error(`Connection ${connectionId} not found`);
        }

        try {
            const adminDb = client.db('admin');
            const serverStatus = await adminDb.command({ serverStatus: 1 });

            return {
                version: serverStatus.version,
                serverVersion: serverStatus.version,
                uptime: serverStatus.uptime,
                currentDatabase: db.databaseName,
                currentUser: serverStatus.connections?.current?.toString(),
            };
        } catch (error: any) {
            logger.error(`Failed to get MongoDB database info: ${error.message}`, error);
            throw new Error(`Failed to get database info: ${error.message}`);
        }
    }

    /**
     * Infer MongoDB field type from sample documents
     */
    private inferMongoType(docs: Document[], fieldName: string): string {
        const types = new Set<string>();

        for (const doc of docs) {
            const value = doc[fieldName];
            if (value === null || value === undefined) continue;

            const type = Array.isArray(value) ? 'array' : typeof value;
            types.add(type);
        }

        if (types.size === 0) return 'null';
        if (types.size === 1) return Array.from(types)[0];
        return 'mixed';
    }
}

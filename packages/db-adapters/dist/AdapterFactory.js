"use strict";
// Database adapter factory - creates adapter instances based on database type
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterFactory = void 0;
const PostgreSQLAdapter_1 = require("./adapters/postgresql/PostgreSQLAdapter");
const MySQLAdapter_1 = require("./adapters/mysql/MySQLAdapter");
const MongoDBAdapter_1 = require("./adapters/mongodb/MongoDBAdapter");
const RedisAdapter_1 = require("./adapters/redis/RedisAdapter");
// Dynamically imported adapters (now supported!)
const SQLServerAdapter_1 = require("./adapters/sqlserver/SQLServerAdapter");
const OracleAdapter_1 = require("./adapters/oracle/OracleAdapter");
const CassandraAdapter_1 = require("./adapters/cassandra/CassandraAdapter");
const ElasticsearchAdapter_1 = require("./adapters/elasticsearch/ElasticsearchAdapter");
const Neo4jAdapter_1 = require("./adapters/neo4j/Neo4jAdapter");
/**
 * Factory for creating database adapter instances
 */
class AdapterFactory {
    /**
     * Create a database adapter instance based on the database type
     * @param type Database type ('postgresql', 'mysql', 'mongodb', 'redis', 'mssql', etc.)
     * @returns Database adapter instance
     */
    static create(type) {
        switch (type.toLowerCase()) {
            // PostgreSQL-compatible databases
            case 'postgresql':
            case 'postgres':
            case 'cockroachdb':
            case 'yugabyte':
            case 'timescaledb':
            case 'greenplum':
            case 'cratedb':
                return new PostgreSQLAdapter_1.PostgreSQLAdapter();
            // MySQL-compatible databases
            case 'mysql':
            case 'mariadb':
            case 'tidb':
            case 'singlestore':
            case 'cubrid':
                return new MySQLAdapter_1.MySQLAdapter();
            // MongoDB-compatible databases
            case 'mongodb':
            case 'mongo':
            case 'ferretdb':
            case 'documentdb':
            case 'cosmosdb':
                return new MongoDBAdapter_1.MongoDBAdapter();
            // Redis-compatible databases
            case 'redis':
            case 'memcached':
                return new RedisAdapter_1.RedisAdapter();
            // SQL Server
            case 'mssql':
            case 'sqlserver':
            case 'azuresql':
            case 'babelfish':
                return new SQLServerAdapter_1.SQLServerAdapter();
            // Oracle
            case 'oracle':
            case 'adw':
            case 'atp':
            case 'ajd':
                return new OracleAdapter_1.OracleAdapter();
            // Cassandra
            case 'cassandra':
            case 'scylladb':
            case 'keyspaces':
                return new CassandraAdapter_1.CassandraAdapter();
            // Elasticsearch
            case 'elasticsearch':
            case 'opensearch':
            case 'solr':
                return new ElasticsearchAdapter_1.ElasticsearchAdapter();
            // Graph databases
            case 'neo4j':
            case 'orientdb': // OrientDB has similar graph structure, can use Neo4j adapter for basics or fallback
                return new Neo4jAdapter_1.Neo4jAdapter();
            // Analytics & others (fallback to PostgreSQL for now until specific adapters exist)
            case 'clickhouse':
            case 'duckdb':
            case 'trino':
            case 'presto':
            case 'influxdb':
                return new PostgreSQLAdapter_1.PostgreSQLAdapter();
            default:
                throw new Error(`Unsupported database type: ${type}. Contact support to add this database.`);
        }
    }
    /**
     * Get list of supported database types
     */
    static getSupportedTypes() {
        return [
            // Relational
            'postgresql', 'mysql', 'mariadb', 'mssql', 'oracle',
            'cockroachdb', 'yugabyte', 'tidb', 'timescaledb',
            // NoSQL
            'mongodb', 'cassandra', 'redis', 'ferretdb', 'scylladb',
            // Graph & Search
            'neo4j', 'elasticsearch', 'opensearch'
        ];
    }
}
exports.AdapterFactory = AdapterFactory;
//# sourceMappingURL=AdapterFactory.js.map
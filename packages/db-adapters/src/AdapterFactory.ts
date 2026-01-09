// Database adapter factory - creates adapter instances based on database type

import type { IDBAdapter } from './interfaces/IDBAdapter';
import { PostgreSQLAdapter } from './adapters/postgresql/PostgreSQLAdapter';
import { MySQLAdapter } from './adapters/mysql/MySQLAdapter';
import { MongoDBAdapter } from './adapters/mongodb/MongoDBAdapter';
import { RedisAdapter } from './adapters/redis/RedisAdapter';

// Dynamically imported adapters (now supported!)
import { SQLServerAdapter } from './adapters/sqlserver/SQLServerAdapter';
import { OracleAdapter } from './adapters/oracle/OracleAdapter';
import { CassandraAdapter } from './adapters/cassandra/CassandraAdapter';
import { ElasticsearchAdapter } from './adapters/elasticsearch/ElasticsearchAdapter';
import { Neo4jAdapter } from './adapters/neo4j/Neo4jAdapter';

/**
 * Factory for creating database adapter instances
 */
export class AdapterFactory {
    /**
     * Create a database adapter instance based on the database type
     * @param type Database type ('postgresql', 'mysql', 'mongodb', 'redis', 'mssql', etc.)
     * @returns Database adapter instance
     */
    static create(type: string): IDBAdapter {
        switch (type.toLowerCase()) {
            // PostgreSQL-compatible databases
            case 'postgresql':
            case 'postgres':
            case 'cockroachdb':
            case 'yugabyte':
            case 'timescaledb':
            case 'greenplum':
            case 'cratedb':
                return new PostgreSQLAdapter();

            // MySQL-compatible databases
            case 'mysql':
            case 'mariadb':
            case 'tidb':
            case 'singlestore':
            case 'cubrid':
                return new MySQLAdapter();

            // MongoDB-compatible databases
            case 'mongodb':
            case 'mongo':
            case 'ferretdb':
            case 'documentdb':
            case 'cosmosdb':
                return new MongoDBAdapter();

            // Redis-compatible databases
            case 'redis':
            case 'memcached':
                return new RedisAdapter();

            // SQL Server
            case 'mssql':
            case 'sqlserver':
            case 'azuresql':
            case 'babelfish':
                return new SQLServerAdapter();

            // Oracle
            case 'oracle':
            case 'adw':
            case 'atp':
            case 'ajd':
                return new OracleAdapter();

            // Cassandra
            case 'cassandra':
            case 'scylladb':
            case 'keyspaces':
                return new CassandraAdapter();

            // Elasticsearch
            case 'elasticsearch':
            case 'opensearch':
            case 'solr':
                return new ElasticsearchAdapter();

            // Graph databases
            case 'neo4j':
            case 'orientdb': // OrientDB has similar graph structure, can use Neo4j adapter for basics or fallback
                return new Neo4jAdapter();

            // Analytics & others (fallback to PostgreSQL for now until specific adapters exist)
            case 'clickhouse':
            case 'duckdb':
            case 'trino':
            case 'presto':
            case 'influxdb':
                return new PostgreSQLAdapter();

            default:
                throw new Error(`Unsupported database type: ${type}. Contact support to add this database.`);
        }
    }

    /**
     * Get list of supported database types
     */
    static getSupportedTypes(): string[] {
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

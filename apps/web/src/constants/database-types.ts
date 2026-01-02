export type DatabaseType =
    // Relational
    | 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'oracle' | 'firebird' | 'cubrid' | 'duckdb'
    | 'cockroachdb' | 'yugabyte' | 'tidb' | 'timescaledb' | 'sqlite' | 'h2' | 'derby'

    // NoSQL & Key/Value
    | 'mongodb' | 'couchbase' | 'couchdb' | 'ferretdb' | 'cosmosdb'
    | 'cassandra' | 'redis' | 'memcached' | 'rabbitmq' | 'minio'
    | 'scylladb' | 'surrealdb'

    // Graph
    | 'neo4j' | 'orientdb'

    // Search / Analytics
    | 'elasticsearch' | 'opensearch' | 'solr' | 'clickhouse' | 'influxdb' | 'prometheus';

export const VALID_DATABASE_TYPES: DatabaseType[] = [
    // Relational
    'postgres', 'mysql', 'mariadb', 'mssql', 'oracle', 'firebird', 'cubrid', 'duckdb',
    'cockroachdb', 'yugabyte', 'tidb', 'timescaledb', 'sqlite', 'h2', 'derby',

    // NoSQL
    'mongodb', 'couchbase', 'couchdb', 'ferretdb', 'cosmosdb',
    'cassandra', 'redis', 'memcached', 'rabbitmq', 'minio',
    'scylladb', 'neo4j', 'orientdb', 'surrealdb',

    // Search / Analytics (Solid Docker Support)
    'elasticsearch', 'opensearch', 'solr', 'clickhouse', 'influxdb', 'prometheus'
];

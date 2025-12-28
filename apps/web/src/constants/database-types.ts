export type DatabaseType =
    // Relational
    | 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'oracle' | 'db2' | 'maxdb' | 'informix' | 'sybase' | 'mimer'
    | 'cache' | 'iris' | 'firebird' | 'ingres' | 'yellowbrick' | 'babelfish' | 'yugabyte' | 'virtuoso' | 'cubrid' | 'duckdb'
    | 'calcite' | 'kylin' | 'risingwave' | 'denodo' | 'dremio' | 'edb' | 'spanner' | 'h2gis' | 'hsqldb' | 'trino'
    | 'cratedb' | 'monetdb' | 'oceanbase' | 'heavydb' | 'openedge' | 'pervasive' | 'salesforce' | 'sqream' | 'fujitsu' | 'materialize'
    | 'tidb' | 'ksqldb' | 'dameng' | 'altibase' | 'gaussdb' | 'cloudberry' | 'gbase' | 'dsql' | 'kingbase' | 'greengage'
    // Analytical
    | 'greenplum' | 'exasol' | 'vertica' | 'teradata' | 'hana' | 'netezza' | 'databricks' | 'ocient' | 'prestodb' | 'clickhouse' | 'starrocks' | 'arrow'
    // NoSQL
    | 'mongodb' | 'couchbase' | 'couchdb' | 'ferretdb' | 'cosmosdb'
    // Cloud/Managed
    | 'athena' | 'redshift' | 'dynamodb' | 'aurora' | 'documentdb' | 'keyspaces' | 'timestream' | 'bigtable' | 'bigquery' | 'neptune'
    | 'azuresql' | 'snowflake' | 'singlestore' | 'nuodb' | 'netsuite' | 'adw' | 'atp' | 'ajd' | 'cloudsql' | 'alloydb' | 'firestore' | 'databend' | 'teiid'
    // Big Data / Distributed
    | 'hive' | 'sparkhive' | 'drill' | 'phoenix' | 'impala' | 'gemfire' | 'ignite' | 'kyuubi' | 'cloudera' | 'cockroachdb' | 'snappydata' | 'scylladb'
    // Key-Value / Columnar
    | 'cassandra' | 'redis' | 'memcached' | 'rabbitmq' | 'minio' | 'dgraph'
    // Time Series
    | 'timescaledb' | 'influxdb' | 'machbase' | 'tdengine' | 'timecho' | 'dolphindb'
    // Graph
    | 'neo4j' | 'orientdb'
    // Search
    | 'elasticsearch' | 'solr' | 'opensearch' | 'opensearchdistro'
    // Embedded / File
    | 'sqlite' | 'h2' | 'derby' | 'access' | 'csv' | 'wmi' | 'dbf' | 'raima' | 'libsql' | 'surrealdb';

export const VALID_DATABASE_TYPES: DatabaseType[] = [
    // Relational
    'postgres', 'mysql', 'mariadb', 'mssql', 'oracle', 'db2', 'maxdb', 'informix', 'sybase', 'mimer',
    'cache', 'iris', 'firebird', 'ingres', 'yellowbrick', 'babelfish', 'yugabyte', 'virtuoso', 'cubrid', 'duckdb',
    'calcite', 'kylin', 'risingwave', 'denodo', 'dremio', 'edb', 'spanner', 'h2gis', 'hsqldb', 'trino',
    'cratedb', 'monetdb', 'oceanbase', 'heavydb', 'openedge', 'pervasive', 'salesforce', 'sqream', 'fujitsu', 'materialize',
    'tidb', 'ksqldb', 'dameng', 'altibase', 'gaussdb', 'cloudberry', 'gbase', 'dsql', 'kingbase', 'greengage',
    // Analytical
    'greenplum', 'exasol', 'vertica', 'teradata', 'hana', 'netezza', 'databricks', 'ocient', 'prestodb', 'clickhouse', 'starrocks', 'arrow',
    // NoSQL
    'mongodb', 'couchbase', 'couchdb', 'ferretdb', 'cosmosdb',
    // Cloud/Managed
    'athena', 'redshift', 'dynamodb', 'aurora', 'documentdb', 'keyspaces', 'timestream', 'bigtable', 'bigquery', 'neptune',
    'azuresql', 'snowflake', 'singlestore', 'nuodb', 'netsuite', 'adw', 'atp', 'ajd', 'cloudsql', 'alloydb', 'firestore', 'databend', 'teiid',
    // Big Data / Distributed
    'hive', 'sparkhive', 'drill', 'phoenix', 'impala', 'gemfire', 'ignite', 'kyuubi', 'cloudera', 'cockroachdb', 'snappydata', 'scylladb',
    // Key-Value / Columnar
    'cassandra', 'redis', 'memcached', 'rabbitmq', 'minio', 'dgraph',
    // Time Series
    'timescaledb', 'influxdb', 'machbase', 'tdengine', 'timecho', 'dolphindb',
    // Graph
    'neo4j', 'orientdb',
    // Search
    'elasticsearch', 'solr', 'opensearch', 'opensearchdistro',
    // Embedded / File
    'sqlite', 'h2', 'derby', 'access', 'csv', 'wmi', 'dbf', 'raima', 'libsql', 'surrealdb'
];

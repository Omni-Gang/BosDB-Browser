/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: process.env.VERCEL ? undefined : 'standalone', // Standalone for Docker, Standard for Vercel
    transpilePackages: [],
    onDemandEntries: {
        // Suppress lockfile patching warnings
        maxInactiveAge: 60 * 1000,
        pagesBufferLength: 5,
    },
    experimental: {
        instrumentationHook: false,
        serverComponentsExternalPackages: [
            'pg',
            'mysql2',
            'lru.min',
            'seq-queue',
            'aws-ssl-profiles',
            'long',
            'named-placeholders',
            'named-placeholders',
            'dockerode',
            'ssh2',
            'docker-modem',
            'mongodb',
            'mongoose',
            // New database drivers
            'oracledb',
            'mssql',
            'cassandra-driver',
            'neo4j-driver',
            '@elastic/elasticsearch',
            // Optional native dependencies to exclude from bundling
            'kerberos',
            'snappy',
            'aws-crt',
        ],
    },
    webpack: (config, { isServer }) => {
        // Ignore optional native dependencies
        config.resolve.alias = {
            ...config.resolve.alias,
            'kerberos': false,
            'snappy': false,
            'aws-crt': false,
        };

        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                tls: false,
                net: false,
                child_process: false,
                crypto: false,
                stream: false,
                path: false,
                // Add these as well for client-side safety
                'kerberos': false,
                'snappy': false,
                'aws-crt': false,
                'oracledb': false,
                'mssql': false,
                'cassandra-driver': false,
                'neo4j-driver': false,
                '@elastic/elasticsearch': false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;

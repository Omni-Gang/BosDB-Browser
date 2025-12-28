/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone', // For Docker deployment
    transpilePackages: ['@bosdb/core', '@bosdb/db-adapters', '@bosdb/security', '@bosdb/utils', '@bosdb/version-control'],
    serverExternalPackages: [
        'pg',
        'mysql2',
        'lru.min',
        'seq-queue',
        'aws-ssl-profiles',
        'long',
        'named-placeholders',
        'bcrypt',
        'dockerode',
        'ssh2',
        'docker-modem'
    ],
    // Remove output setting to allow server-side rendering
    webpack: (config, { isServer }) => {
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
            };
        }
        return config;
    },
};

module.exports = nextConfig;

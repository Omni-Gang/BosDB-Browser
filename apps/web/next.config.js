/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone', // For Docker deployment
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
            'mongoose'
        ],
    },
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

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: 'standalone', // For Docker deployment
    transpilePackages: [], 
    experimental: {
        instrumentationHook: true,
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

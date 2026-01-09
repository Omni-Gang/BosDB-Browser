// Shared in-memory storage for connections and adapters
// With organization-scoped file-based persistence

import fs from 'fs';
import path from 'path';
import { encryptCredentials } from '@bosdb/security';

const DATA_DIR_NAME = '.bosdb-data';
const LEGACY_STORAGE_FILE_NAME = '.bosdb-connections.json';

/**
 * Port to Railway Host Mapping
 * If a connection is on localhost but uses these specific ports, it's a misconfigured Railway connection.
 */
// Port to Railway Host Mapping
const RAILWAY_PORT_MAP: Record<number, string> = {
    50346: 'switchyard.proxy.rlwy.net',
    55276: 'metro.proxy.rlwy.net',
    34540: 'centerbeam.proxy.rlwy.net',
    12858: 'mainline.proxy.rlwy.net',
    49717: 'trolley.proxy.rlwy.net',
    54136: 'metro.proxy.rlwy.net'
};

// Find project root (contains package.json and apps directory)
function findProjectRoot(current: string): string {
    let dir = current;
    try {
        while (dir !== path.parse(dir).root) {
            // Priority: Monorepo root has 'apps' folder
            if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'apps'))) {
                return dir;
            }
            dir = path.dirname(dir);
        }
    } catch (e) { }
    return current;
}

const PROJECT_ROOT = findProjectRoot(process.cwd());
const DATA_DIR = path.join(PROJECT_ROOT, DATA_DIR_NAME);
const ORGS_DIR = path.join(DATA_DIR, 'orgs');
const LEGACY_STORAGE_FILE = path.join(PROJECT_ROOT, LEGACY_STORAGE_FILE_NAME);

// Detection for serverless/read-only environments
const IS_VERCEL = process.env.VERCEL === '1' || !!process.env.NOW_REGION;

console.log(`[Store] Initialized with Project Root: ${PROJECT_ROOT} (Vercel: ${IS_VERCEL})`);

function getOrgDataDir(orgId: string): string {
    const orgDir = path.join(ORGS_DIR, orgId);
    if (!IS_VERCEL && !fs.existsSync(orgDir)) {
        try {
            fs.mkdirSync(orgDir, { recursive: true });
        } catch (e) {
            console.error(`[Store] Failed to create org dir ${orgDir}:`, e);
        }
    }
    return orgDir;
}

function getConnectionsFilePath(orgId: string): string {
    const orgDir = getOrgDataDir(orgId);
    return path.join(orgDir, 'connections.json');
}

// Internal state
let _connections: Map<string, any> = new Map();
let _adapterInstances: Map<string, any> = new Map();
const _orgConnections: Map<string, Map<string, any>> = new Map();
const _orgAdapterInstances: Map<string, Map<string, any>> = new Map();

/**
 * Safe encryption that won't crash the entire route if key is missing
 */
function safeEncrypt(data: any): string {
    try {
        return encryptCredentials(data);
    } catch (e: any) {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }
}

// ... existing code ...
import { CLOUD_DATABASES } from './cloud-provisioner';

// ...

/**
 * Injects pre-configured Railway database connections
 */
function injectRailwayConnections(map: Map<string, any>) {
    const railwayConnections = [
        {
            id: 'railway-postgres',
            name: 'Railway Postgres (Direct)',
            type: 'postgres',
            host: CLOUD_DATABASES.postgres.host,
            port: CLOUD_DATABASES.postgres.port,
            database: 'railway',
            username: CLOUD_DATABASES.postgres.adminUser,
            password: CLOUD_DATABASES.postgres.adminPassword,
        },
        {
            id: 'railway-mysql',
            name: 'Railway MySQL (Direct)',
            type: 'mysql',
            host: CLOUD_DATABASES.mysql.host,
            port: CLOUD_DATABASES.mysql.port,
            database: 'railway',
            username: CLOUD_DATABASES.mysql.adminUser,
            password: CLOUD_DATABASES.mysql.adminPassword,
        },
        {
            id: 'railway-mariadb',
            name: 'Railway MariaDB (Direct)',
            type: 'mariadb',
            host: CLOUD_DATABASES.mariadb.host,
            port: CLOUD_DATABASES.mariadb.port,
            database: 'railway',
            username: CLOUD_DATABASES.mariadb.adminUser,
            password: CLOUD_DATABASES.mariadb.adminPassword,
        },
        {
            id: 'railway-redis',
            name: 'Railway Redis (Direct)',
            type: 'redis',
            host: CLOUD_DATABASES.redis.host,
            port: CLOUD_DATABASES.redis.port,
            database: '0',
            username: 'default',
            password: CLOUD_DATABASES.redis.password,
        },
        {
            id: 'railway-mongo',
            name: 'Railway MongoDB (Direct)',
            type: 'mongodb',
            host: CLOUD_DATABASES.mongodb.host,
            port: CLOUD_DATABASES.mongodb.port,
            database: 'test',
            username: CLOUD_DATABASES.mongodb.adminUser,
            password: CLOUD_DATABASES.mongodb.adminPassword,
        },
        {
            id: 'railway-oracle',
            name: 'Railway Oracle (Direct)',
            type: 'oracle',
            host: CLOUD_DATABASES.oracle.host,
            port: CLOUD_DATABASES.oracle.port,
            database: CLOUD_DATABASES.oracle.serviceName || 'XE',
            username: CLOUD_DATABASES.oracle.adminUser,
            password: CLOUD_DATABASES.oracle.adminPassword,
        }
    ];

    railwayConnections.forEach(conn => {
        // Skip connection if password is missing (env var not set)
        if (!conn.password) return;

        const existing = map.get(conn.id);
        if (!existing || existing.ssl !== true) {
            map.set(conn.id, {
                id: conn.id,
                name: conn.name,
                type: conn.type,
                host: conn.host,
                port: conn.port,
                database: conn.database,
                credentials: safeEncrypt({
                    username: conn.username,
                    password: conn.password,
                }),
                ssl: true,
                readOnly: false,
                userEmail: 'system',
                organizationId: 'system',
                createdAt: existing?.createdAt || new Date().toISOString(),
            });
        }
    });
}

/**
 * Intercepts connection details to fix Railway misconfigurations (localhost -> proxy)
 */
function interceptAndFixConnection(conn: any, id: string): any {
    if (!conn) return conn;

    // Fix 1: Redirect localhost on Railway ports to the actual proxy
    const railwayProxy = RAILWAY_PORT_MAP[Number(conn.port)];
    if (railwayProxy && (conn.host === 'localhost' || conn.host === '127.0.0.1' || conn.host === 'host.docker.internal')) {
        console.log(`[Store] Redirecting misconfigured host for ${id}: ${conn.host} -> ${railwayProxy}`);
        conn.host = railwayProxy;
        conn.ssl = true; // Force SSL for Railway
    }

    // Fix 2: Force SSL for any Railway/Atlas host
    if (conn.host?.includes('rlwy.net') || conn.host?.includes('mongodb.net') || conn.host?.includes('railway.internal')) {
        if (conn.ssl !== true) {
            console.log(`[Store] Auto-enabling SSL for: ${id} (${conn.host})`);
            conn.ssl = true;
        }
    }

    return conn;
}

function loadLegacyConnections(): Map<string, any> {
    const combinedMap = new Map();
    const possibleLocations = [
        LEGACY_STORAGE_FILE,
        path.join(PROJECT_ROOT, 'apps', 'web', LEGACY_STORAGE_FILE_NAME),
        path.join(process.cwd(), LEGACY_STORAGE_FILE_NAME),
        path.join(process.cwd(), 'apps', 'web', LEGACY_STORAGE_FILE_NAME),
    ];

    try {
        possibleLocations.forEach(loc => {
            if (fs.existsSync(loc)) {
                try {
                    const data = fs.readFileSync(loc, 'utf-8');
                    const parsed = JSON.parse(data);
                    console.log(`[Store] Found ${Object.keys(parsed).length} connections at ${loc}`);
                    Object.entries(parsed).forEach(([k, v]) => {
                        if (!combinedMap.has(k)) {
                            combinedMap.set(k, v);
                        }
                    });
                } catch (e) {
                    console.error(`[Store] Error reading legacy file at ${loc}:`, e);
                }
            }
        });

        // Migrate back to root if we found fragmented files
        if (combinedMap.size > 0 && !IS_VERCEL && !fs.existsSync(LEGACY_STORAGE_FILE)) {
            try {
                fs.writeFileSync(LEGACY_STORAGE_FILE, JSON.stringify(Object.fromEntries(combinedMap), null, 2));
                console.log(`[Store] Migrated ${combinedMap.size} combined connections to root.`);
            } catch (e) { }
        }

    } catch (error) {
        console.error('[Store] Failed to navigate legacy connections:', error);
    }
    return combinedMap;
}

function initStore() {
    try {
        _connections = loadLegacyConnections();
        injectRailwayConnections(_connections);

        // Apply fixes to all loaded connections
        _connections.forEach((conn, id) => {
            interceptAndFixConnection(conn, id);
        });

        console.log(`[Store] Initialized with ${_connections.size} connections`);
    } catch (e) {
        console.error('[Store] CRITICAL: Store initialization failed', e);
    }
}

initStore();

// Exports
export const connections = _connections;
export const adapterInstances = _adapterInstances;

export function getConnections(): Map<string, any> {
    return _connections;
}

export function getAdapterInstances(): Map<string, any> {
    return _adapterInstances;
}

export function getConnectionsByOrg(orgId: string): Map<string, any> {
    if (!_orgConnections.has(orgId)) {
        const map = new Map();
        const filePath = getConnectionsFilePath(orgId);
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                const parsed = JSON.parse(data);
                Object.entries(parsed).forEach(([k, v]) => map.set(k, v));
            }
        } catch (e) {
            console.error(`[Store] Failed to load org ${orgId} connections:`, e);
        }
        injectRailwayConnections(map);
        map.forEach((conn, id) => interceptAndFixConnection(conn, id));
        _orgConnections.set(orgId, map);
    }
    return _orgConnections.get(orgId)!;
}

export function getAdapterInstancesByOrg(orgId: string): Map<string, any> {
    if (!_orgAdapterInstances.has(orgId)) {
        _orgAdapterInstances.set(orgId, new Map());
    }
    return _orgAdapterInstances.get(orgId)!;
}

export function saveConnections() {
    if (IS_VERCEL) return;
    try {
        const obj = Object.fromEntries(_connections);
        fs.writeFileSync(LEGACY_STORAGE_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
        console.error('[Store] Failed to save connections:', error);
    }
}

export function saveConnectionsByOrg(orgId: string, connections: Map<string, any>) {
    if (IS_VERCEL) return;
    try {
        const filePath = getConnectionsFilePath(orgId);
        const obj = Object.fromEntries(connections);
        fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
    } catch (error) {
        console.error(`[Store] Failed to save connections for org ${orgId}:`, error);
    }
}

export function clearOrgCache(orgId: string) {
    _orgConnections.delete(orgId);
    _orgAdapterInstances.delete(orgId);
}

export async function getConnection(connectionId: string): Promise<any> {
    let conn = _connections.get(connectionId);

    if (!conn) {
        for (const orgMap of _orgConnections.values()) {
            conn = orgMap.get(connectionId);
            if (conn) break;
        }
    }

    // Apply interception one more time just in case of dynamic inserts
    return interceptAndFixConnection(conn, connectionId);
}

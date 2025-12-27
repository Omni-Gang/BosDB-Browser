// Shared in-memory storage for connections and adapters
// With file-based persistence for development

import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), '.bosdb-connections.json');

// Load connections from file on startup
function loadConnections(): Map<string, any> {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            console.log(`[Store] Loaded ${Object.keys(parsed).length} connections from file`);
            return new Map(Object.entries(parsed));
        }
    } catch (error) {
        console.error('[Store] Failed to load connections:', error);
    }
    return new Map();
}

// Save connections to file
export function saveConnections() {
    try {
        const obj = Object.fromEntries(getConnections());
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2));
        console.log(`[Store] Saved ${getConnections().size} connections to file`);
    } catch (error) {
        console.error('[Store] Failed to save connections:', error);
    }
}

// Lazy initialization - only load when accessed
let _connections: Map<string, any> | null = null;
let _adapterInstances: Map<string, any> | null = null;

export function getConnections(): Map<string, any> {
    if (!_connections) {
        _connections = loadConnections();
    }
    return _connections;
}

export function getAdapterInstances(): Map<string, any> {
    if (!_adapterInstances) {
        _adapterInstances = new Map();
    }
    return _adapterInstances;
}

// Legacy exports for compatibility - these now use lazy loading with proper Map delegation
export const connections = new Proxy({} as Map<string, any>, {
    get(_target, prop) {
        const map = getConnections();
        const value = (map as any)[prop];
        // Bind methods to the actual Map instance
        if (typeof value === 'function') {
            return value.bind(map);
        }
        return value;
    },
    set(_target, prop, value) {
        (getConnections() as any)[prop] = value;
        return true;
    }
});

export const adapterInstances = new Proxy({} as Map<string, any>, {
    get(_target, prop) {
        const map = getAdapterInstances();
        const value = (map as any)[prop];
        // Bind methods to the actual Map instance
        if (typeof value === 'function') {
            return value.bind(map);
        }
        return value;
    },
    set(_target, prop, value) {
        (getAdapterInstances() as any)[prop] = value;
        return true;
    }
});

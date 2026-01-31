const { app, BrowserWindow, ipcMain, Menu, shell, safeStorage, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const http = require('http');

// Load environment variables from project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const { provisionRailway } = require('./railway');
const { generateSQL } = require('./ai');
const { setupVCSHandlers } = require('./vcs-manager');

// Project root for storage
const PROJECT_ROOT = path.join(__dirname, '../../../');
const STORAGE_FILE = path.join(PROJECT_ROOT, '.bosdb-native-connections.json');

// Deep Link Configuration
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('bosdb', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('bosdb');
}

// Enforce App Name and ID for Linux/Windows
app.setName('BosDB');
if (process.platform === 'linux' || process.platform === 'win32') {
    app.setAppUserModelId('com.bosdb.native');
}

let sessionToken = null;

function handleDeepLink(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === 'bosdb:') {
            // Support both 'auth' and 'authlisten' as hostnames
            if (parsedUrl.hostname === 'auth' || parsedUrl.hostname === 'authlisten') {
                const token = parsedUrl.searchParams.get('token');
                if (token) {
                    sessionToken = token;
                    if (mainWindow) {
                        mainWindow.webContents.send('auth:token-received', token);
                        mainWindow.focus();
                    }
                }
            }
        }
    } catch (e) {
        console.error('Deep Link Error:', e);
    }
}

// Local HTTP Relay Server for 100% Reliable Auth (Bypasses OS Protocol Blocks)
const AUTH_RELAY_PORT = 51735;
function startAuthRelay() {
    const server = http.createServer((req, res) => {
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url, `http://localhost:${AUTH_RELAY_PORT}`);
        if (url.pathname === '/auth') {
            const token = url.searchParams.get('token');
            if (token) {
                console.log('[Auth Relay] Received token via HTTP Relay');
                sessionToken = token;
                if (mainWindow) {
                    mainWindow.webContents.send('auth:token-received', token);
                    mainWindow.focus();
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                return;
            }
        }

        res.writeHead(404);
        res.end();
    });

    server.listen(AUTH_RELAY_PORT, '127.0.0.1', () => {
        console.log(`[Auth Relay] Listening on http://localhost:${AUTH_RELAY_PORT}`);
    });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('[Auth Debug] Second Instance Detected');
        console.log('[Auth Debug] Command Line:', commandLine);
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        const url = commandLine.find(arg => arg.startsWith('bosdb://'));
        if (url) {
            console.log('[Auth Debug] Found Deep Link URL:', url);
            handleDeepLink(url);
        } else {
            console.log('[Auth Debug] No Deep Link URL found in arguments.');
        }
    });

    // Handle Deep Link for primary instance (Linux/Windows)
    console.log('[Auth Debug] Primary Instance Process Args:', process.argv);
    const primaryUrl = process.argv.find(arg => arg.startsWith('bosdb://'));
    if (primaryUrl) {
        console.log('[Auth Debug] Found Primary Deep Link:', primaryUrl);
        handleDeepLink(primaryUrl);
    }
}

// macOS Protocol Handling
app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[macOS] Found Deep Link:', url);
    handleDeepLink(url);
});

// ... existing load/save helpers ...
function loadConnections() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
        }
    } catch (e) { console.error('Load Error:', e); }
    return {};
}

function saveConnections(connections) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(connections, null, 2));
    } catch (e) { console.error('Save Error:', e); }
}

// ... createWindow/createMenu ...
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'BosDB',
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0f172a', // slate-900
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    const url = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../../dist-renderer/index.html')}`;

    mainWindow.loadURL(url);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Handle window controls
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) mainWindow.maximize();
});

ipcMain.on('window-unmaximize', () => {
    if (mainWindow) mainWindow.unmaximize();
});

ipcMain.on('window-close', () => {
    if (mainWindow) app.quit();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

// Native Menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { label: 'New Connection', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new-connection') },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        { role: 'editMenu' },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
            ]
        },
        {
            label: 'Database',
            submenu: [
                { label: 'Execute Query', accelerator: 'F5', click: () => mainWindow.webContents.send('menu:execute-query') },
                { label: 'Format SQL', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow.webContents.send('menu:format-sql') },
            ]
        },
        { role: 'windowMenu' },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Documentation',
                    click: async () => {
                        await shell.openExternal('https://github.com/ayushgupta9906/BosDB-Browser');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// We'll import adapters lazily to avoid startup overhead
let AdapterFactory;
try {
    AdapterFactory = require('../../../packages/db-adapters').AdapterFactory;
} catch (e) {
    console.error('Failed to load AdapterFactory:', e);
}

// IPC Handlers
const activeAdapters = new Map();

function parseConnectionString(url, type) {
    try {
        const parsed = new URL(url);
        return {
            type,
            host: parsed.hostname,
            port: parseInt(parsed.port),
            database: parsed.pathname.split('/')[1] || '',
            username: parsed.username,
            password: parsed.password,
        };
    } catch (e) { return null; }
}

ipcMain.handle('db:list-connections', async () => {
    return loadConnections();
});

ipcMain.handle('db:save-connection', async (event, connection) => {
    const connections = loadConnections();
    connections[connection.id] = { ...connection, createdAt: new Date().toISOString() };
    saveConnections(connections);
    return { success: true };
});

ipcMain.handle('db:delete-connection', async (event, id) => {
    const connections = loadConnections();
    delete connections[id];
    saveConnections(connections);
    return { success: true };
});

ipcMain.handle('db:provision-railway', async (event, { type, name }) => {
    return provisionRailway(type, name);
});

ipcMain.handle('ai:generate-sql', async (event, config) => {
    return generateSQL(config);
});

ipcMain.handle('db:connect', async (event, config) => {
    try {
        const { type, id, url } = config;
        console.log('[Main] Connecting to:', id, type);

        if (!AdapterFactory) throw new Error('AdapterFactory not loaded');

        const adapter = AdapterFactory.create(type);
        const testResult = await adapter.testConnection(config);

        if (testResult.success) {
            activeAdapters.set(id, adapter);
            return { success: true };
        } else {
            return { success: false, error: testResult.error };
        }
    } catch (error) {
        console.error('DB Connect Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:get-token', () => {
    return sessionToken;
});

ipcMain.handle('auth:open-login', () => {
    const loginUrl = 'http://localhost:3000/login?redirect=bosdb://authlisten';
    shell.openExternal(loginUrl);
});

ipcMain.handle('db:execute', async (event, { connectionId, sql }) => {
    try {
        const adapter = activeAdapters.get(connectionId);
        if (!adapter) throw new Error('Database not connected');

        const startTime = Date.now();
        const result = await adapter.executeQuery({ sql });
        const duration = Date.now() - startTime;

        return {
            success: true,
            data: {
                ...result,
                executionTime: duration,
                rowCount: result.rows?.length || 0
            }
        };
    } catch (error) {
        console.error('DB Execute Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:explain', async (event, { connectionId, sql }) => {
    try {
        const adapter = activeAdapters.get(connectionId);
        if (!adapter) throw new Error('Database not connected');
        const result = await adapter.explainQuery(connectionId, sql);
        return { success: true, data: result };
    } catch (error) {
        console.error('DB Explain Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:list-schemas', async (event, connectionId) => {
    try {
        console.log('[Main] Listing schemas for connection:', connectionId);
        console.log('[Main] Available adapters:', Array.from(activeAdapters.keys()));
        const adapter = activeAdapters.get(connectionId);
        if (!adapter) {
            console.error('[Main] ❌ No adapter found for:', connectionId);
            throw new Error('Database not connected');
        }
        const schemas = await adapter.listSchemas(connectionId);
        return { success: true, data: schemas };
    } catch (error) {
        console.error('DB List Schemas Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:list-tables', async (event, { connectionId, schema }) => {
    try {
        const adapter = activeAdapters.get(connectionId);
        if (!adapter) throw new Error('Database not connected');
        const tables = await adapter.listTables(connectionId, schema);
        return { success: true, data: tables };
    } catch (error) {
        console.error('DB List Tables Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:list-procedures', async (event, { connectionId, schema }) => {
    try {
        const adapter = activeAdapters.get(connectionId);
        if (!adapter) throw new Error('Database not connected');

        // Check if adapter has listProcedures method
        if (typeof adapter.listProcedures !== 'function') {
            // Return empty array if not supported
            return { success: true, data: [] };
        }

        const procedures = await adapter.listProcedures(connectionId, schema);
        return { success: true, data: procedures };
    } catch (error) {
        console.error('DB List Procedures Error:', error);
        return { success: false, error: error.message };
    }
});

// File System Interface
ipcMain.handle('fs:pick-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { name: path.basename(filePath), path: filePath, content };
});

ipcMain.handle('fs:save-file', async (event, { content, defaultPath, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled || !result.filePath) return false;

    fs.writeFileSync(result.filePath, content);
    return true;
});

// Secure Vault
ipcMain.handle('vault:save', async (event, { value }) => {
    try {
        const encrypted = safeStorage.encryptString(value);
        return { success: true, data: encrypted.toString('hex') };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('vault:decrypt', async (event, { encryptedHex }) => {
    try {
        const buffer = Buffer.from(encryptedHex, 'hex');
        const decrypted = safeStorage.decryptString(buffer);
        return { success: true, data: decrypted };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Database Proxy Managers
const { DatabaseProxy } = require('./db-proxy');
const activeProxies = new Map();

ipcMain.handle('proxy:start', async (event, { connectionId, config }) => {
    try {
        if (activeProxies.has(connectionId)) {
            const proxy = activeProxies.get(connectionId);
            return { success: true, port: proxy.localPort };
        }

        const proxy = new DatabaseProxy();
        const port = await proxy.start(config);

        proxy.on('query', (query) => {
            if (mainWindow) {
                mainWindow.webContents.send('proxy:query-detected', { connectionId, query });
            }
        });

        activeProxies.set(connectionId, { proxy, localPort: port });
        return { success: true, port };
    } catch (error) {
        console.error('Proxy Start Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('proxy:stop', async (event, connectionId) => {
    try {
        const entry = activeProxies.get(connectionId);
        if (entry) {
            entry.proxy.stop();
            activeProxies.delete(connectionId);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createMenu();
    createWindow();
    startAuthRelay();
    setupVCSHandlers();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

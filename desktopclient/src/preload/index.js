const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    db: {
        connect: (config) => ipcRenderer.invoke('db:connect', config),
        execute: (connectionId, sql) => ipcRenderer.invoke('db:execute', { connectionId, sql }),
        listConnections: () => ipcRenderer.invoke('db:list-connections'),
        saveConnection: (connection) => ipcRenderer.invoke('db:save-connection', connection),
        deleteConnection: (id) => ipcRenderer.invoke('db:delete-connection', id),
        provisionRailway: (type, name) => ipcRenderer.invoke('db:provision-railway', { type, name }),
    },
    fs: {
        pickFile: (options) => ipcRenderer.invoke('fs:pick-file', options),
        saveFile: (content, defaultPath, filters) => ipcRenderer.invoke('fs:save-file', { content, defaultPath, filters }),
    },
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        unmaximize: () => ipcRenderer.send('window-unmaximize'),
        close: () => ipcRenderer.send('window-close'),
        isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    },
    vault: {
        save: (key, value) => ipcRenderer.invoke('vault:save', { key, value }),
        decrypt: (encryptedHex) => ipcRenderer.invoke('vault:decrypt', { encryptedHex }),
    },
    ai: {
        generateSQL: (config) => ipcRenderer.invoke('ai:generate-sql', config),
    },
    auth: {
        getToken: () => ipcRenderer.invoke('auth:get-token'),
        onTokenReceived: (callback) => {
            const listener = (event, token) => callback(token);
            ipcRenderer.on('auth:token-received', listener);
            return () => ipcRenderer.removeListener('auth:token-received', listener);
        },
        openLogin: () => ipcRenderer.invoke('auth:open-login'),
    },
    menu: {
        onNewConnection: (callback) => {
            const listener = () => callback();
            ipcRenderer.on('menu:new-connection', listener);
            return () => ipcRenderer.removeListener('menu:new-connection', listener);
        },
        onExecuteQuery: (callback) => {
            const listener = () => callback();
            ipcRenderer.on('menu:execute-query', listener);
            return () => ipcRenderer.removeListener('menu:execute-query', listener);
        },
        onFormatSQL: (callback) => {
            const listener = () => callback();
            ipcRenderer.on('menu:format-sql', listener);
            return () => ipcRenderer.removeListener('menu:format-sql', listener);
        },
    },
    vcs: {
        getPending: (connectionId) => ipcRenderer.invoke('vcs:get-pending', connectionId),
        trackChange: (params) => ipcRenderer.invoke('vcs:track-change', params),
        commit: (params) => ipcRenderer.invoke('vcs:commit', params),
        getHistory: (connectionId) => ipcRenderer.invoke('vcs:get-history', connectionId),
        getBranches: (connectionId) => ipcRenderer.invoke('vcs:get-branches', connectionId),
    },
    proxy: {
        start: (connectionId, config) => ipcRenderer.invoke('proxy:start', { connectionId, config }),
        stop: (connectionId) => ipcRenderer.invoke('proxy:stop', connectionId),
        onQueryDetected: (callback) => {
            const listener = (event, data) => callback(null, data);
            ipcRenderer.on('proxy:query-detected', listener);
            return () => ipcRenderer.removeListener('proxy:query-detected', listener);
        }
    }
});

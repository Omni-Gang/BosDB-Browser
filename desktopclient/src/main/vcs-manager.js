const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '../../../');
const VCS_STORAGE_FILE = path.join(PROJECT_ROOT, '.bosdb-vcs.json');

// Initialize Storage
function loadVCS() {
    try {
        if (fs.existsSync(VCS_STORAGE_FILE)) {
            return JSON.parse(fs.readFileSync(VCS_STORAGE_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[VCS Manager] Load Error:', e);
    }
    return {
        pendingChanges: {}, // connectionId -> DatabaseChange[]
        commits: {},        // connectionId -> VCSCommit[]
        branches: {},       // connectionId -> VCSBranch[]
        currentBranch: {}   // connectionId -> string (default: 'main')
    };
}

function saveVCS(data) {
    try {
        fs.writeFileSync(VCS_STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[VCS Manager] Save Error:', e);
    }
}

// VCS Logic Utility (Ported from vcs-helper.ts)
const VCS_LOGIC = {
    parseQueryForChanges(query, affectedRows = 0) {
        const q = query.trim().toUpperCase();

        // Very basic detection for now, would ideally use full parser as in vcs-helper.ts
        if (q.startsWith('CREATE TABLE')) {
            const match = query.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."`]+)/i);
            const tableName = match ? match[1] : 'unknown';
            return {
                type: 'SCHEMA',
                operation: 'CREATE',
                target: tableName,
                description: `Created table ${tableName}`,
                query: query,
                rollbackSQL: `DROP TABLE ${tableName};`
            };
        }

        if (q.startsWith('ALTER TABLE')) {
            const match = query.match(/ALTER\s+TABLE\s+([a-zA-Z0-9_."`]+)/i);
            const tableName = match ? match[1] : 'unknown';
            return {
                type: 'SCHEMA',
                operation: 'ALTER',
                target: tableName,
                description: `Modified table ${tableName}`,
                query: query,
                rollbackSQL: 'MANUAL'
            };
        }

        if (q.startsWith('DROP TABLE')) {
            const match = query.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_."`]+)/i);
            const tableName = match ? match[1] : 'unknown';
            return {
                type: 'SCHEMA',
                operation: 'DROP',
                target: tableName,
                description: `Dropped table ${tableName}`,
                query: query,
                rollbackSQL: 'MANUAL'
            };
        }

        if (q.startsWith('INSERT INTO')) {
            return {
                type: 'DATA',
                operation: 'INSERT',
                target: 'Table Data',
                description: `Inserted ${affectedRows} rows`,
                query: query,
                rollbackSQL: 'MANUAL'
            };
        }

        return null;
    }
};

// IPC Handlers
function setupVCSHandlers() {
    ipcMain.handle('vcs:get-pending', async (event, connectionId) => {
        const data = loadVCS();
        return data.pendingChanges[connectionId] || [];
    });

    ipcMain.handle('vcs:track-change', async (event, { connectionId, query, affectedRows }) => {
        const change = VCS_LOGIC.parseQueryForChanges(query, affectedRows);
        if (!change) return false;

        const data = loadVCS();
        if (!data.pendingChanges[connectionId]) data.pendingChanges[connectionId] = [];

        change.id = `change_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        change.timestamp = new Date().toISOString();

        data.pendingChanges[connectionId].push(change);
        saveVCS(data);
        return true;
    });

    ipcMain.handle('vcs:commit', async (event, { connectionId, message, author }) => {
        const data = loadVCS();
        const pending = data.pendingChanges[connectionId] || [];
        if (pending.length === 0) return false;

        const branch = data.currentBranch[connectionId] || 'main';
        const commit = {
            id: `commit_${Date.now()}`,
            connectionId,
            branch,
            message,
            author,
            changes: [...pending],
            timestamp: new Date().toISOString()
        };

        if (!data.commits[connectionId]) data.commits[connectionId] = [];
        data.commits[connectionId].unshift(commit);

        data.pendingChanges[connectionId] = [];
        saveVCS(data);
        return true;
    });

    ipcMain.handle('vcs:get-history', async (event, connectionId) => {
        const data = loadVCS();
        return data.commits[connectionId] || [];
    });

    ipcMain.handle('vcs:get-branches', async (event, connectionId) => {
        const data = loadVCS();
        return data.branches[connectionId] || [{ name: 'main' }];
    });
}

module.exports = { setupVCSHandlers };

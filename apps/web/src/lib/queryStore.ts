import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), '.bosdb-query-history.json');
const SAVED_QUERIES_FILE = path.join(process.cwd(), '.bosdb-saved-queries.json');

export interface QueryHistoryEntry {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    executedAt: string;
    executionTime: number;
    rowCount: number;
    success: boolean;
    error?: string;
    userEmail?: string; // OPTIONAL: User who executed the query
    orgId?: string;     // OPTIONAL: Organization context
}

export interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdAt: string;
    updatedAt: string;
    userEmail?: string; // OPTIONAL: User who created the query
    orgId?: string;     // OPTIONAL: Organization context
}

// Query History Management
let queryHistory: QueryHistoryEntry[] | null = null;

export function loadQueryHistory(): QueryHistoryEntry[] {
    if (queryHistory !== null) {
        return queryHistory;
    }

    queryHistory = []; //  Initialize to avoid null

    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
            const parsed: QueryHistoryEntry[] = JSON.parse(data);
            queryHistory = parsed;
            console.log(`[QueryHistory] Loaded ${parsed.length} entries`);
        }
    } catch (error) {
        console.error('[QueryHistory] Failed to load:', error);
    }
    return queryHistory;
}

export function saveQueryHistory() {
    const history = loadQueryHistory();
    try {
        // Keep only last 100 queries
        const recentHistory = history.slice(-100);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(recentHistory, null, 2));
        console.log(`[QueryHistory] Saved ${recentHistory.length} entries`);
    } catch (error) {
        console.error('[QueryHistory] Failed to save:', error);
    }
}

export function addQueryToHistory(entry: Omit<QueryHistoryEntry, 'id'>) {
    const history = loadQueryHistory();
    const historyEntry: QueryHistoryEntry = {
        ...entry,
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    history.push(historyEntry);
    saveQueryHistory();
    return historyEntry;
}

export function getQueryHistory(connectionId?: string, limit = 50): QueryHistoryEntry[] {
    const history = loadQueryHistory();

    let filtered = history;
    if (connectionId) {
        filtered = history.filter(entry => entry.connectionId === connectionId);
    }

    // Return most recent first
    return filtered.slice(-limit).reverse();
}

export function getUserQueryHistory(userEmail: string, orgId?: string, connectionId?: string, limit = 50): QueryHistoryEntry[] {
    const history = loadQueryHistory();

    let filtered = history.filter(entry => entry.userEmail === userEmail);

    // If orgId provided, ensure data matches org (strict isolation)
    if (orgId) {
        filtered = filtered.filter(entry => entry.orgId === orgId);
    }

    if (connectionId) {
        filtered = filtered.filter(entry => entry.connectionId === connectionId);
    }

    // Return most recent first
    return filtered.slice(-limit).reverse();
}

export function clearQueryHistory(connectionId?: string, userEmail?: string) {
    const history = loadQueryHistory();
    if (userEmail) {
        // Remove only entries for this user
        if (connectionId) {
            queryHistory = history.filter(entry =>
                !(entry.userEmail === userEmail && entry.connectionId === connectionId)
            );
        } else {
            queryHistory = history.filter(entry => entry.userEmail !== userEmail);
        }
    } else {
        // Legacy/Admin behavior (clear all or by connection)
        if (connectionId) {
            queryHistory = history.filter(entry => entry.connectionId !== connectionId);
        } else {
            queryHistory = [];
        }
    }
    saveQueryHistory();
}

// Saved Queries Management
let savedQueries: SavedQuery[] | null = null;

export function loadSavedQueries(): SavedQuery[] {
    if (savedQueries !== null) {
        return savedQueries;
    }

    savedQueries = []; // Initialize to avoid null

    try {
        if (fs.existsSync(SAVED_QUERIES_FILE)) {
            const data = fs.readFileSync(SAVED_QUERIES_FILE, 'utf-8');
            const parsed: SavedQuery[] = JSON.parse(data);
            savedQueries = parsed;
            console.log(`[SavedQueries] Loaded ${parsed.length} queries`);
        }
    } catch (error) {
        console.error('[SavedQueries] Failed to load:', error);
    }
    return savedQueries;
}

export function saveSavedQueries() {
    const queries = loadSavedQueries();
    try {
        fs.writeFileSync(SAVED_QUERIES_FILE, JSON.stringify(queries, null, 2));
        console.log(`[SavedQueries] Saved ${queries.length} queries`);
    } catch (error) {
        console.error('[SavedQueries] Failed to save:', error);
    }
}

export function createSavedQuery(query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>): SavedQuery {
    const queries = loadSavedQueries();
    const now = new Date().toISOString();
    const savedQuery: SavedQuery = {
        ...query,
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    queries.push(savedQuery);
    saveSavedQueries();
    return savedQuery;
}

export function getSavedQueries(connectionId?: string): SavedQuery[] {
    const queries = loadSavedQueries();

    if (connectionId) {
        return queries.filter(q => !q.connectionId || q.connectionId === connectionId);
    }

    return queries;
}

export function getUserSavedQueries(userEmail: string, orgId?: string, connectionId?: string): SavedQuery[] {
    const queries = loadSavedQueries();

    let filtered = queries.filter(q => q.userEmail === userEmail);

    // If orgId provided, strict isolation
    if (orgId) {
        filtered = filtered.filter(q => q.orgId === orgId);
    }

    if (connectionId) {
        filtered = filtered.filter(q => !q.connectionId || q.connectionId === connectionId);
    }

    return filtered;
}

export function updateSavedQuery(id: string, updates: Partial<Omit<SavedQuery, 'id' | 'createdAt'>>): SavedQuery | null {
    const queries = loadSavedQueries();
    const index = queries.findIndex(q => q.id === id);
    if (index === -1) return null;

    queries[index] = {
        ...queries[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    saveSavedQueries();
    return queries[index];
}

export function deleteSavedQuery(id: string): boolean {
    const queries = loadSavedQueries();
    const initialLength = queries.length;
    savedQueries = queries.filter(q => q.id !== id);

    if (savedQueries.length < initialLength) {
        saveSavedQueries();
        return true;
    }

    return false;
}

// NO automatic initialization - data loads only when functions are called

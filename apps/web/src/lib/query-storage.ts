/**
 * Query Storage Utility
 * Persists queries and tabs to localStorage
 */

import { QueryTab } from '@/components/QueryTabs';

const TABS_KEY_PREFIX = 'bosdb_tabs_';
const LEGACY_QUERY_KEY = 'bosdb_query_';

interface TabsState {
    tabs: QueryTab[];
    activeIndex: number;
}

// Save tabs to localStorage
export function saveTabs(connectionId: string, state: TabsState): void {
    try {
        localStorage.setItem(
            `${TABS_KEY_PREFIX}${connectionId}`,
            JSON.stringify(state)
        );
    } catch (error) {
        console.error('Failed to save tabs:', error);
    }
}

// Load tabs from localStorage
export function loadTabs(connectionId: string): TabsState | null {
    try {
        const data = localStorage.getItem(`${TABS_KEY_PREFIX}${connectionId}`);
        if (data) {
            return JSON.parse(data);
        }

        // Migrate legacy single query if exists
        const legacyQuery = localStorage.getItem(`${LEGACY_QUERY_KEY}${connectionId}`);
        if (legacyQuery) {
            localStorage.removeItem(`${LEGACY_QUERY_KEY}${connectionId}`);
            return {
                tabs: [{
                    id: 'tab-1',
                    name: 'Query 1',
                    query: legacyQuery,
                    breakpoints: []
                }],
                activeIndex: 0
            };
        }

        return null;
    } catch (error) {
        console.error('Failed to load tabs:', error);
        return null;
    }
}

// Create default tabs state
export function createDefaultTabs(dbType: string = 'postgres'): TabsState {
    let defaultQuery = 'SELECT * FROM information_schema.tables LIMIT 10;';

    if (dbType === 'mongodb') {
        defaultQuery = '{\n    "find": "collection_name",\n    "limit": 10\n}';
    } else if (dbType === 'redis') {
        defaultQuery = '{\n    "command": "KEYS",\n    "args": ["*"]\n}';
    }

    return {
        tabs: [{
            id: `tab-${Date.now()}`,
            name: 'Query 1',
            query: defaultQuery,
            breakpoints: []
        }],
        activeIndex: 0
    };
}

// Generate unique tab ID
export function generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Clear tabs for a connection
export function clearTabs(connectionId: string): void {
    try {
        localStorage.removeItem(`${TABS_KEY_PREFIX}${connectionId}`);
    } catch (error) {
        console.error('Failed to clear tabs:', error);
    }
}


import { trackChange, parseQueryForChanges } from './vcs-helper';
import { toast } from '@/components/ToastProvider';

// Singleton to manage proxy state and listeners
class ProxyManager {
    private static instance: ProxyManager;
    private activeConnections: Set<string> = new Set();
    private isInitialized = false;

    private constructor() { }

    static getInstance(): ProxyManager {
        if (!ProxyManager.instance) {
            ProxyManager.instance = new ProxyManager();
        }
        return ProxyManager.instance;
    }

    init() {
        if (this.isInitialized || typeof window === 'undefined' || !window.electron) return;

        console.log('[ProxyManager] Initializing VCS listeners...');

        window.electron.proxy.onQueryDetected((event: any, { connectionId, query }: { connectionId: string, query: string }) => {
            console.log('[ProxyManager] External Query Detected:', query);
            this.handleExternalQuery(connectionId, query);
        });

        this.isInitialized = true;
    }

    async startProxy(connectionId: string, config: any): Promise<{ success: boolean, port?: number, error?: string }> {
        if (!window.electron) return { success: false, error: 'Not running in desktop mode' };

        const result = await window.electron.proxy.start(connectionId, config);
        if (result.success) {
            this.activeConnections.add(connectionId);
        }
        return result;
    }

    async stopProxy(connectionId: string): Promise<boolean> {
        if (!window.electron) return false;

        const result = await window.electron.proxy.stop(connectionId);
        if (result.success) {
            this.activeConnections.delete(connectionId);
        }
        return result.success;
    }

    private async handleExternalQuery(connectionId: string, query: string) {
        // Parse and track
        const change = parseQueryForChanges(query, 0); // We don't know row count from sniffer yet

        if (change) {
            // Enrich with "External" metadata
            change.description = `[External] ${change.description}`;
            change.metadata = { ...change.metadata, source: 'external_proxy' };

            await trackChange(connectionId, change);

            // Notify user
            // Use a custom event or toast
            console.log(`[Proxy] Tracked external change: ${change.description}`);
            // toast.success(`Tracked external change: ${change.description}`); // Requires toast instance
        }
    }
}

export const proxyManager = ProxyManager.getInstance();

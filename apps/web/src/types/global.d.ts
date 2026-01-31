
export { };

declare global {
    interface Window {
        electron?: {
            db: any;
            vcs: any;
            auth: any;
            proxy: {
                start: (connectionId: string, config: any) => Promise<{ success: boolean; port?: number; error?: string }>;
                stop: (connectionId: string) => Promise<{ success: boolean }>;
                onQueryDetected: (callback: (event: any, data: { connectionId: string, query: string }) => void) => void;
            };
        };
    }
}

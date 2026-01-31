export interface IElectronBase {
    db: {
        execute: (connectionId: string, sql: string) => Promise<{ success: boolean; data: any }>;
        listConnections: () => Promise<any>;
        saveConnection: (connection: any) => Promise<any>;
        deleteConnection: (id: string) => Promise<{ success: boolean }>;
        listSchemas: (connectionId: string) => Promise<{ success: boolean; data: any[] }>;
        listTables: (args: { connectionId: string; schema: string }) => Promise<{ success: boolean; data: any[] }>;
        explain: (connectionId: string, sql: string) => Promise<{ success: boolean; data: any }>;
    };
    vcs: {
        trackChange: (args: { connectionId: string, query: string, affectedRows: number }) => Promise<boolean>;
        getPending: (connectionId: string) => Promise<any[]>;
        getHistory: (connectionId: string) => Promise<any[]>;
        getBranches: (connectionId: string) => Promise<any[]>;
        commit: (args: { connectionId: string, message: string, author: any }) => Promise<boolean>;
    };
    auth: {
        getToken: () => Promise<string | null>;
        openLogin: () => Promise<void>;
    };
    proxy: {
        start: (connectionId: string, config: any) => Promise<{ success: boolean; port?: number; error?: string }>;
        stop: (connectionId: string) => Promise<{ success: boolean }>;
        onQueryDetected: (callback: (event: any, data: { connectionId: string, query: string }) => void) => void;
    };
}

declare global {
    interface Window {
        electron: IElectronBase;
    }
}

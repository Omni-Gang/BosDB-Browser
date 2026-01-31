import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Shim fetch to handle /api calls via IPC
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith('/api/')) {
        console.log(`[Native Fetch Shim] Intercepting: ${url}`);

        // Handle specific API routes via IPC
        if (url.startsWith('/api/db/execute')) {
            const body = JSON.parse(init?.body as string);
            // @ts-ignore
            const result = await window.electron.db.execute(body.connectionId, body.sql);
            return new Response(JSON.stringify(result.data), {
                status: result.success ? 200 : 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add more routes as needed...
        return new Response(JSON.stringify({ error: 'Not implemented in native client yet' }), { status: 501 });
    }

    return originalFetch(input, init);
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-red-500 bg-slate-900 h-screen overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <pre className="font-mono bg-black/50 p-4 rounded text-sm text-slate-300 whitespace-pre-wrap">
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);


import { useState, useEffect } from 'react';
import { X, Copy, Check, Globe, Shield, Terminal, Server, Database as DatabaseIcon } from 'lucide-react';
import { proxyManager } from '@/lib/proxy-manager';

interface PublicAccessModalProps {
    connection: any;
    onClose: () => void;
}

export function PublicAccessModal({ connection, onClose }: PublicAccessModalProps) {
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(false);
    const [publicPort, setPublicPort] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        setIsDesktop(typeof window !== 'undefined' && !!window.electron);
    }, []);

    const connectionString = publicPort
        ? `${connection.type}://127.0.0.1:${publicPort}/${connection.database}`
        : `${connection.type}://${connection.username || 'user'}:******@${connection.host}:${connection.port}/${connection.database}`;

    const handleEnable = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await proxyManager.startProxy(connection.id, {
                type: connection.type,
                host: connection.host,
                port: connection.port,
            });

            if (res.success && res.port) {
                setActive(true);
                setPublicPort(res.port);
            } else {
                setError(res.error || 'Failed to start proxy');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        try {
            const success = await proxyManager.stopProxy(connection.id);
            if (success) {
                setActive(false);
                setPublicPort(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const textToCopy = publicPort
            ? connectionString
            : `Host: ${connection.host}\nPort: ${connection.port}\nDatabase: ${connection.database}`;

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        {isDesktop ? 'Public Database Access' : 'Connection Details'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {isDesktop ? (
                        /* DESKTOP PROXY MODE */
                        <>
                            <div className="p-4 bg-muted/50 rounded-lg border border-border">
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-400" />
                                    How it works
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    BosDB creates a local secure tunnel to your database.
                                    You can use the provided connection string in <strong>external tools</strong> or <strong>other projects</strong>.
                                    All queries will be tracked in BosDB Version Control.
                                </p>
                            </div>

                            {!active ? (
                                <div className="text-center py-4">
                                    <button
                                        onClick={handleEnable}
                                        disabled={loading}
                                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Starting...' : 'Enable Public Access'}
                                    </button>
                                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                                            Public Connection URL
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 p-3 bg-black/40 border border-white/10 rounded font-mono text-sm text-green-400 break-all">
                                                {connectionString}
                                            </code>
                                            <button
                                                onClick={copyToClipboard}
                                                className="p-3 bg-secondary hover:bg-secondary/80 rounded transition"
                                            >
                                                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <p className="text-xs text-blue-300 flex items-start gap-2">
                                            <Terminal className="w-4 h-4 mt-0.5 shrink-0" />
                                            Listening for connections... Queries will appear in VCS.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleDisable}
                                        disabled={loading}
                                        className="w-full py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition"
                                    >
                                        Disable Access
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* WEB DETAILS MODE */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Host</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Server className="w-3 h-3 text-primary" />
                                        <code className="text-xs font-mono">{connection.host}</code>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Port</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-mono">{connection.port}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Database Name</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <DatabaseIcon className="w-3 h-3 text-primary" />
                                        <code className="text-xs font-mono">{connection.database}</code>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-xs text-green-400 break-all select-all">
                                {connectionString}
                            </div>

                            <p className="text-[10px] text-muted-foreground text-center">
                                * Password hidden for security
                            </p>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(connectionString);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied String' : 'Copy Connection String'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

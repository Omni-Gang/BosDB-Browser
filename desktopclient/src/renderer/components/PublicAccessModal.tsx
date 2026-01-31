
import { useState, useEffect } from 'react';
import { X, Copy, Check, Globe, Shield, Terminal } from 'lucide-react';
import { proxyManager } from '../lib/proxy-manager';

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

    const connectionString = publicPort
        ? `${connection.type}://127.0.0.1:${publicPort}/${connection.database}`
        : '';

    useEffect(() => {
        // Here we would ideally check if it's ALREADY running
    }, []);

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
        navigator.clipboard.writeText(connectionString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 bg-[#1e293b] text-white">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Public Database Access
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-green-400" />
                            How it works
                        </h3>
                        <p className="text-xs text-gray-400">
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
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                                {loading ? 'Starting...' : 'Enable Public Access'}
                            </button>
                            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">
                                    Public Connection URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-3 bg-black/40 border border-gray-600 rounded font-mono text-sm text-green-400 break-all">
                                        {connectionString}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded transition"
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
                                className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition"
                            >
                                Disable Access
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

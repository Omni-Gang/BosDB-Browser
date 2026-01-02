import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface SaveQueryModalProps {
    query: string;
    connectionId: string;
    onClose: () => void;
    onSuccess: (savedQuery: any) => void;
}

export function SaveQueryModal({ query, connectionId, onClose, onSuccess }: SaveQueryModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const user = getCurrentUser();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (user?.email) headers['x-user-email'] = user.email;
            if (user?.organizationId) headers['x-org-id'] = user.organizationId;

            const res = await fetch('/api/saved-queries', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name,
                    description,
                    query,
                    connectionId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save query');
            }

            onSuccess(data.query);
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Save className="w-4 h-4 text-primary" />
                        Save Query
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                            placeholder="My Query"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary resize-none h-20"
                            placeholder="What does this query do?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Query Preview</label>
                        <pre className="text-xs font-mono bg-muted p-2 rounded border border-border overflow-x-auto max-h-32">
                            {query}
                        </pre>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm hover:bg-accent rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Query'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

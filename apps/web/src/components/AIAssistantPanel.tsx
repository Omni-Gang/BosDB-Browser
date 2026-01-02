'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    Send,
    X,
    Copy,
    Check,
    Play,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Database,
    Trash2,
    Settings,
    Bot,
    Zap,
    Code,
    Table,
    HelpCircle,
    Lightbulb,
    RefreshCw,
    History,
    BookOpen
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sql?: string;
    timestamp: Date;
}

interface AIAssistantPanelProps {
    connectionId: string;
    connectionInfo: {
        type: string;
        name: string;
        database: string;
    };
    schemas: string[];
    tables: { schema: string; name: string }[];
    onInsertQuery: (sql: string) => void;
    onRunQuery: (sql: string) => void;
}

type AIProvider = 'auto' | 'gemini' | 'openai' | 'anthropic' | 'huggingface';
type AIModel = string;

interface ModelConfig {
    provider: AIProvider;
    model: AIModel;
    displayName: string;
}

const MODEL_OPTIONS: ModelConfig[] = [
    { provider: 'auto', model: 'auto', displayName: '🔄 Auto (Best Available)' },
    // Hugging Face FREE models
    { provider: 'huggingface', model: 'mistral', displayName: '🆓 Mistral 7B (Fast)' },
    { provider: 'huggingface', model: 'qwen', displayName: '🆓 Qwen 2.5 7B (Smart)' },
    { provider: 'huggingface', model: 'llama', displayName: '🆓 Llama 3.2 3B (Free)' },
    { provider: 'huggingface', model: 'deepseek', displayName: '🆓 DeepSeek R1 1.5B (Fast)' },
    // Paid models
    { provider: 'gemini', model: 'gemini-1.5-flash', displayName: '⚡ Gemini Flash' },
    { provider: 'gemini', model: 'gemini-1.5-pro', displayName: '🧠 Gemini Pro' },
    { provider: 'openai', model: 'gpt-4o-mini', displayName: '🤖 GPT-4o Mini' },
    { provider: 'openai', model: 'gpt-4o', displayName: '🧠 GPT-4o' },
];

const QUICK_ACTIONS = [
    { icon: Table, label: 'List Tables', prompt: 'Show me all tables in this database' },
    { icon: Code, label: 'Sample Data', prompt: 'Show me sample data from the first table' },
    { icon: Zap, label: 'Table Counts', prompt: 'Count rows in each table' },
    { icon: HelpCircle, label: 'Schema Info', prompt: 'Describe the database schema' },
];

const EXAMPLE_CATEGORIES = [
    {
        title: '📊 Data Queries',
        prompts: [
            "Show me all users who signed up this month",
            "Count orders grouped by status",
            "Find customers with no orders",
            "List top 10 products by revenue",
        ]
    },
    {
        title: '🔧 Schema Operations',
        prompts: [
            "Create a users table with email, password, and timestamps",
            "Add a foreign key from orders to users",
            "Create an index on email column",
            "Show table schema for users",
        ]
    },
    {
        title: '📈 Analytics',
        prompts: [
            "Daily sales for the last 30 days",
            "Average order value by customer type",
            "Month over month growth comparison",
            "Find duplicate records",
        ]
    },
];

export function AIAssistantPanel({
    connectionId,
    connectionInfo,
    schemas,
    tables,
    onInsertQuery,
    onRunQuery,
}: AIAssistantPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    const [showSchema, setShowSchema] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelConfig>(MODEL_OPTIONS[0]);
    const [temperature, setTemperature] = useState(0.3);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load saved preferences
    useEffect(() => {
        const saved = localStorage.getItem('ai-assistant-preferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                if (prefs.model) {
                    const found = MODEL_OPTIONS.find(m => m.model === prefs.model);
                    if (found) setSelectedModel(found);
                }
                if (prefs.temperature) setTemperature(prefs.temperature);
            } catch { }
        }
    }, []);

    // Save preferences
    useEffect(() => {
        localStorage.setItem('ai-assistant-preferences', JSON.stringify({
            model: selectedModel.model,
            temperature,
        }));
    }, [selectedModel, temperature]);

    const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
        e?.preventDefault();
        const promptToUse = customPrompt || input.trim();
        if (!promptToUse || loading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: promptToUse,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/ai/generate-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptToUse,
                    connectionId,
                    dbType: connectionInfo.type,
                    database: connectionInfo.database,
                    schemas,
                    tables: tables.map(t => `${t.schema}.${t.name}`),
                    model: selectedModel.model,
                    provider: selectedModel.provider,
                    temperature,
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => 'No error body');
                throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 50)}`);
            }

            const contentType = res.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}...`);
            }

            // Check for API error
            if (data.error) {
                const errorMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: `❌ AI Error: ${data.error}`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
                return;
            }

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.explanation || 'Here is your response:',
                sql: data.sql || undefined,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('AI Fetch Error:', error);
            const msg = error.message === 'Failed to fetch'
                ? 'Failed to connect to AI server. Please check if the dev server is running on port 3000.'
                : error.message;

            const errorMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: `Sorry, I encountered an error: ${msg}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (sql: string, id: string) => {
        navigator.clipboard.writeText(sql);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExampleClick = (prompt: string) => {
        setInput(prompt);
        setShowExamples(false);
        inputRef.current?.focus();
    };

    const clearChat = () => {
        setMessages([]);
    };

    const regenerateLastResponse = () => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            // Remove last assistant message
            setMessages(prev => {
                const filtered = [...prev];
                const lastAssistantIdx = filtered.findLastIndex(m => m.role === 'assistant');
                if (lastAssistantIdx > -1) {
                    filtered.splice(lastAssistantIdx, 1);
                }
                return filtered;
            });
            // Resubmit
            handleSubmit(undefined, lastUserMessage.content);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-l-xl shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all z-40 flex items-center gap-2 group"
                title="AI Query Assistant"
            >
                <Sparkles className="w-5 h-5" />
                <span className="hidden group-hover:inline text-sm font-medium">Ask AI</span>
                <ChevronLeft className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="fixed right-0 top-0 h-screen w-[420px] bg-card border-l border-border shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AI Query Assistant</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {connectionInfo.name} • {connectionInfo.type.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSchema(!showSchema)}
                        className={`p-2 rounded-lg transition ${showSchema ? 'bg-purple-500/20 text-purple-500' : 'hover:bg-accent'}`}
                        title="View Schema"
                    >
                        <Table className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowExamples(!showExamples)}
                        className={`p-2 rounded-lg transition ${showExamples ? 'bg-purple-500/20 text-purple-500' : 'hover:bg-accent'}`}
                        title="Example Prompts"
                    >
                        <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition ${showSettings ? 'bg-purple-500/20 text-purple-500' : 'hover:bg-accent'}`}
                        title="Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="p-2 hover:bg-accent rounded-lg transition"
                            title="Clear chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-accent rounded-lg transition"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="p-4 border-b border-border bg-muted/30 space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        AI Model Settings
                    </h4>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                        <select
                            value={selectedModel.model}
                            onChange={(e) => {
                                const found = MODEL_OPTIONS.find(m => m.model === e.target.value);
                                if (found) setSelectedModel(found);
                            }}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-purple-500"
                        >
                            {MODEL_OPTIONS.map(m => (
                                <option key={m.model} value={m.model}>{m.displayName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 flex justify-between">
                            <span>Creativity</span>
                            <span>{temperature === 0 ? 'Precise' : temperature < 0.5 ? 'Balanced' : 'Creative'}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full accent-purple-500"
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        💡 Configure API keys in <code className="bg-background px-1 rounded">.env.local</code>
                    </p>
                </div>
            )}

            {/* Schema Panel */}
            {showSchema && (
                <div className="p-4 border-b border-border bg-muted/30 max-h-48 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Table className="w-4 h-4" />
                        Available Tables ({tables.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                        {tables.slice(0, 30).map((t, i) => (
                            <button
                                key={i}
                                onClick={() => handleExampleClick(`Show me data from ${t.schema}.${t.name}`)}
                                className="text-xs px-2 py-1 bg-background border border-border rounded hover:border-purple-500 hover:text-purple-500 transition"
                            >
                                {t.name}
                            </button>
                        ))}
                        {tables.length > 30 && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                                +{tables.length - 30} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Examples Panel */}
            {showExamples && (
                <div className="p-4 border-b border-border bg-muted/30 max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Example Prompts
                    </h4>
                    {EXAMPLE_CATEGORIES.map((cat, i) => (
                        <div key={i} className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{cat.title}</p>
                            <div className="space-y-1">
                                {cat.prompts.map((p, j) => (
                                    <button
                                        key={j}
                                        onClick={() => handleExampleClick(p)}
                                        className="w-full text-left px-2 py-1.5 text-xs bg-background border border-border rounded hover:border-purple-500 transition truncate"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            {messages.length === 0 && !showSettings && !showSchema && !showExamples && (
                <div className="p-4 border-b border-border">
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSubmit(undefined, action.prompt)}
                                className="flex items-center gap-2 p-3 bg-accent/50 hover:bg-accent rounded-lg transition text-left"
                            >
                                <action.icon className="w-4 h-4 text-purple-500" />
                                <span className="text-sm">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !showSettings && !showSchema && !showExamples ? (
                    <div className="text-center py-8">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
                        <h4 className="font-medium mb-2">Ask me anything about your database</h4>
                        <p className="text-sm text-muted-foreground">
                            I can write SQL queries, explain data, and help you work faster.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-accent'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                {msg.sql && (
                                    <div className="mt-3 bg-background rounded-lg overflow-hidden border border-border">
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b border-border">
                                            <span className="text-xs font-medium flex items-center gap-1">
                                                <Code className="w-3 h-3" />
                                                SQL
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleCopy(msg.sql!, msg.id)}
                                                    className="p-1 hover:bg-accent rounded transition"
                                                    title="Copy SQL"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => onInsertQuery(msg.sql!)}
                                                    className="p-1 hover:bg-accent rounded transition"
                                                    title="Insert into editor"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => onRunQuery(msg.sql!)}
                                                    className="p-1 hover:bg-green-500/20 text-green-500 rounded transition"
                                                    title="Run query"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-3 text-xs font-mono overflow-x-auto max-h-48">
                                            {msg.sql}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-accent/50 rounded-xl px-4 py-3 flex items-center gap-3 border border-border animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">AI is thinking...</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Using {selectedModel.displayName.replace(/[⚡🧠🔄🤖🆓]/g, '').trim()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Regenerate Button */}
            {messages.length > 0 && !loading && (
                <div className="px-4 pb-2">
                    <button
                        onClick={regenerateLastResponse}
                        className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate response
                    </button>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background/50">
                <div className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Describe what you need in plain English..."
                        rows={2}
                        className="w-full resize-none bg-accent/30 border border-border rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-50 hover:from-purple-600 hover:to-pink-600 transition"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        {selectedModel.displayName.replace(/[⚡🧠🔄🤖]/g, '').trim()}
                    </span>
                    <span>Enter to send • Shift+Enter for new line</span>
                </div>
            </form>
        </div>
    );
}

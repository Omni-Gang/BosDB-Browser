'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    Settings as SettingsIcon,
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
    { provider: 'huggingface', model: 'qwen', displayName: '🆓 Qwen 2.5 Coder (Recommended)' },
    { provider: 'huggingface', model: 'mistral', displayName: '🆓 Mistral 7B (Fast)' },
    { provider: 'huggingface', model: 'llama', displayName: '🆓 Llama 3.2 3B (Free)' },
    { provider: 'huggingface', model: 'deepseek', displayName: '🆓 DeepSeek R1 (Smart)' },
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

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
    connectionId,
    connectionInfo,
    schemas,
    tables,
    onInsertQuery,
    onRunQuery,
}) => {
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
            // NATIVE SYNC: We'll use the Electron API to call the AI service
            // @ts-ignore
            if (window.electron?.ai?.generateSQL) {
                // @ts-ignore
                const data = await window.electron.ai.generateSQL({
                    prompt: promptToUse,
                    connectionId,
                    dbType: connectionInfo.type,
                    database: connectionInfo.database,
                    schemas,
                    tables: tables.map(t => `${t.schema}.${t.name}`),
                    model: selectedModel.model,
                    provider: selectedModel.provider,
                    temperature,
                });

                if (data.error) {
                    throw new Error(data.error);
                }

                const assistantMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.explanation || 'Here is your response:',
                    sql: data.sql || undefined,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error('Native AI service not available');
            }
        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`,
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
            setMessages(prev => {
                const filtered = [...prev];
                const lastAssistantIdx = filtered.findLastIndex(m => m.role === 'assistant');
                if (lastAssistantIdx > -1) {
                    filtered.splice(lastAssistantIdx, 1);
                }
                return filtered;
            });
            handleSubmit(undefined, lastUserMessage.content);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center group border-2 border-white/20"
                title="AI Query Assistant"
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 text-sm font-bold whitespace-nowrap">Ask AI</span>
            </button>
        );
    }

    return (
        <div className="fixed right-0 top-0 h-screen w-[420px] bg-slate-900 border-l border-white/10 shadow-2xl z-[5000] flex flex-col pt-8 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-100">AI Assistant</h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                            <Database className="w-3 h-3" />
                            {connectionInfo.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSchema(!showSchema)}
                        className={`p-2 rounded-lg transition ${showSchema ? 'bg-purple-500/20 text-purple-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        title="View Schema"
                    >
                        <Table className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition ${showSettings ? 'bg-purple-500/20 text-purple-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        title="Settings"
                    >
                        <SettingsIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:bg-white/5 hover:text-white rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !showSettings && !showSchema ? (
                    <div className="text-center py-12">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
                        <h4 className="text-slate-200 font-medium mb-2">How can I help you?</h4>
                        <p className="text-xs text-slate-400 px-8">
                            I can write SQL queries, explain your database schema, and help you analyze data.
                        </p>

                        <div className="mt-8 grid grid-cols-2 gap-2">
                            {QUICK_ACTIONS.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(undefined, action.prompt)}
                                    className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition text-left group"
                                >
                                    <action.icon className="w-4 h-4 text-purple-500 group-hover:scale-110 transition" />
                                    <span className="text-xs text-slate-300">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-200 border border-white/5'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                {msg.sql && (
                                    <div className="mt-3 bg-slate-950 rounded-xl overflow-hidden border border-white/10">
                                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-white/10">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 tracking-widest">
                                                <Code className="w-3 h-3 text-purple-400" />
                                                SQL Result
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleCopy(msg.sql!, msg.id)}
                                                    className="p-1 hover:bg-white/10 rounded transition text-slate-400 hover:text-white"
                                                    title="Copy SQL"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => onRunQuery(msg.sql!)}
                                                    className="p-1 hover:bg-emerald-500/20 text-emerald-500 rounded transition"
                                                    title="Run query"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-3 text-xs font-mono overflow-x-auto max-h-48 text-indigo-300">
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
                        <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/5 animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-slate-200">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl">
                <div className="relative group">
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
                        placeholder="Ask AI to write a query..."
                        rows={2}
                        className="w-full resize-none bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-slate-200 outline-none focus:border-purple-500 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-900/40"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

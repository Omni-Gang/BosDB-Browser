import { NextRequest, NextResponse } from 'next/server';

/**
 * AI SQL Generator API
 * Converts natural language to SQL queries using AI
 * Supports multiple AI providers with model selection
 */

interface GenerateSQLRequest {
    prompt: string;
    connectionId: string;
    dbType: string;
    database: string;
    schemas: string[];
    tables: string[];
    model?: string;
    provider?: 'auto' | 'gemini' | 'openai' | 'anthropic';
    temperature?: number;
}

// Model mappings
const GEMINI_MODELS: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-2.0-flash-exp',
    'gemini-1.5-pro': 'gemini-pro',
    'auto': 'gemini-2.0-flash-exp',
};

const OPENAI_MODELS: Record<string, string> = {
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o',
    'gpt-4-turbo': 'gpt-4-turbo',
};

const ANTHROPIC_MODELS: Record<string, string> = {
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-opus': 'claude-3-opus-20240229',
};

// Hugging Face free models
const HUGGINGFACE_MODELS: Record<string, string> = {
    'mistral': 'mistralai/Mistral-7B-Instruct-v0.3',
    'codellama': 'codellama/CodeLlama-34b-Instruct-hf',
    'llama': 'meta-llama/Llama-3.2-3B-Instruct', // Using 3B for better availability
    'qwen': 'Qwen/Qwen2.5-7B-Instruct',           // Using 7B instead of 72B for free tier
    'deepseek': 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B', // 1.5B is very likely on free tier
    'auto': 'mistralai/Mistral-7B-Instruct-v0.3',
};

// System prompt for SQL generation
function buildSystemPrompt(dbType: string, database: string, tables: string[]): string {
    const tableList = tables.length > 0
        ? `Available tables: ${tables.slice(0, 50).join(', ')}${tables.length > 50 ? '...' : ''}`
        : 'No table information available';

    return `You are an expert database assistant with deep knowledge of ${dbType.toUpperCase()} and other databases.
Database: ${database}
${tableList}

You can help with:
- Writing SQL/NoSQL queries
- Explaining database concepts
- Designing schemas and tables
- Optimizing queries
- Debugging database issues
- Data modeling advice
- Best practices and recommendations

When the user asks for a query:
1. Provide a brief explanation
2. Then provide the query in a \`\`\`sql code block
3. Use proper ${dbType.toUpperCase()} syntax

When the user asks general questions:
- Answer helpfully and concisely
- Provide examples when useful
- Be friendly and professional

Always be helpful, even for non-SQL questions about databases.`;
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateSQLRequest = await request.json();
        const { prompt, dbType, database, tables, model, provider, temperature = 0.3 } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Check for API keys in environment
        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

        // Debug: Log which keys are available (safely)
        console.log('[AI API] Keys available:', {
            gemini: !!geminiKey,
            openai: !!openaiKey,
            anthropic: !!anthropicKey,
            huggingface: !!hfKey
        });

        let sql = '';
        let explanation = '';
        let usedModel = '';

        // Determine which provider to use
        const useProvider = provider === 'auto' || !provider
            ? determineProvider(geminiKey, openaiKey, anthropicKey)
            : provider;

        // Get the actual model name
        const actualModel = getActualModel(model || 'auto', useProvider);

        try {
            switch (useProvider) {
                case 'gemini':
                    if (!geminiKey) throw new Error('Gemini API key not configured');
                    const geminiResult = await callGemini(geminiKey, prompt, dbType, database, tables, actualModel, temperature);
                    sql = geminiResult.sql;
                    explanation = geminiResult.explanation;
                    usedModel = actualModel;
                    break;

                case 'openai':
                    if (!openaiKey) throw new Error('OpenAI API key not configured');
                    const openaiResult = await callOpenAI(openaiKey, prompt, dbType, database, tables, actualModel, temperature);
                    sql = openaiResult.sql;
                    explanation = openaiResult.explanation;
                    usedModel = actualModel;
                    break;

                case 'anthropic':
                    if (!anthropicKey) throw new Error('Anthropic API key not configured');
                    const anthropicResult = await callAnthropic(anthropicKey, prompt, dbType, database, tables, actualModel, temperature);
                    sql = anthropicResult.sql;
                    explanation = anthropicResult.explanation;
                    usedModel = actualModel;
                    break;

                case 'huggingface':
                    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
                    if (!hfKey) throw new Error('Hugging Face API key not configured');
                    const hfResult = await callHuggingFace(hfKey, prompt, dbType, database, tables, actualModel, temperature);
                    sql = hfResult.sql;
                    explanation = hfResult.explanation;
                    usedModel = actualModel;
                    break;

                default:
                    const fallbackResult = generateFallbackSQL(prompt, dbType, tables);
                    sql = fallbackResult.sql;
                    explanation = fallbackResult.explanation;
                    usedModel = 'fallback';
            }
        } catch (providerError: any) {
            console.error(`[AI Assistant] Provider ${useProvider} failed:`, providerError.message);

            // If primary failed and it wasn't already Gemini, try Gemini as fallback
            if (useProvider !== 'gemini' && geminiKey) {
                console.log('[AI Assistant] Attempting fallback to Gemini...');
                try {
                    const fallbackModel = 'gemini-2.0-flash-exp';
                    const geminiResult = await callGemini(geminiKey, prompt, dbType, database, tables, fallbackModel, temperature);
                    sql = geminiResult.sql;
                    explanation = `(Fallback Mode: Primary provider failed) ${geminiResult.explanation}`;
                    usedModel = `${fallbackModel} (fallback)`;
                } catch (geminiError: any) {
                    console.error('[AI Assistant] Gemini fallback also failed:', geminiError.message);
                    throw providerError; // Original error
                }
            } else {
                throw providerError;
            }
        }

        return NextResponse.json({ sql, explanation, model: usedModel });
    } catch (error: any) {
        console.error('AI SQL generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate SQL' },
            { status: 500 }
        );
    }
}

function determineProvider(geminiKey?: string, openaiKey?: string, anthropicKey?: string): string {
    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    if (hfKey) return 'huggingface'; // Prioritize free Hugging Face
    if (geminiKey) return 'gemini';
    if (openaiKey) return 'openai';
    if (anthropicKey) return 'anthropic';
    return 'fallback';
}

function getActualModel(model: string, provider: string): string {
    if (model === 'auto') {
        switch (provider) {
            case 'huggingface': return HUGGINGFACE_MODELS['auto'];
            case 'gemini': return 'gemini-2.0-flash-exp';
            case 'openai': return 'gpt-4o-mini';
            case 'anthropic': return 'claude-3-haiku-20240307';
            default: return 'auto';
        }
    }

    // Check if model belongs to the provider
    if (provider === 'gemini' && GEMINI_MODELS[model]) {
        return GEMINI_MODELS[model];
    }
    if (provider === 'openai' && OPENAI_MODELS[model]) {
        return OPENAI_MODELS[model];
    }
    if (provider === 'anthropic' && ANTHROPIC_MODELS[model]) {
        return ANTHROPIC_MODELS[model];
    }
    if (provider === 'huggingface' && HUGGINGFACE_MODELS[model]) {
        return HUGGINGFACE_MODELS[model];
    }

    // Return default for provider
    switch (provider) {
        case 'gemini': return 'gemini-2.0-flash-exp';
        case 'openai': return 'gpt-4o-mini';
        case 'anthropic': return 'claude-3-haiku-20240307';
        case 'huggingface': return HUGGINGFACE_MODELS['auto'];
        default: return model;
    }
}

async function callGemini(
    apiKey: string,
    prompt: string,
    dbType: string,
    database: string,
    tables: string[],
    model: string,
    temperature: number
): Promise<{ sql: string; explanation: string }> {
    const systemPrompt = buildSystemPrompt(dbType, database, tables);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
                    }
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: 2048,
                }
            }),
        }
    );

    // Check if response is OK
    if (!response.ok) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            throw new Error(`Gemini API error (${response.status}): Check your API key is valid and has Generative Language API enabled`);
        }
        throw new Error(`Gemini API error (${response.status}): ${text.slice(0, 200)}`);
    }

    const text = await response.text();

    // Check if response is HTML (error page)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Gemini API returned an error page. Please check your API key.');
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Invalid response from Gemini: ${text.slice(0, 100)}`);
    }

    if (data.error) {
        throw new Error(data.error.message || 'Gemini API error');
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content) {
        throw new Error('Gemini returned empty response. The query may have been blocked.');
    }

    console.log('[AI API] Gemini raw response:', content.slice(0, 500));
    const parsed = parseAIResponse(content);
    console.log('[AI API] Parsed result:', { sql: parsed.sql.slice(0, 100), explanation: parsed.explanation.slice(0, 100) });

    return parsed;
}

async function callOpenAI(
    apiKey: string,
    prompt: string,
    dbType: string,
    database: string,
    tables: string[],
    model: string,
    temperature: number
): Promise<{ sql: string; explanation: string }> {
    const systemPrompt = buildSystemPrompt(dbType, database, tables);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: 2048,
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const content = data.choices?.[0]?.message?.content || '';
    return parseAIResponse(content);
}

async function callAnthropic(
    apiKey: string,
    prompt: string,
    dbType: string,
    database: string,
    tables: string[],
    model: string,
    temperature: number
): Promise<{ sql: string; explanation: string }> {
    const systemPrompt = buildSystemPrompt(dbType, database, tables);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2048,
            temperature,
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const content = data.content?.[0]?.text || '';
    return parseAIResponse(content);
}

async function callHuggingFace(
    apiKey: string,
    prompt: string,
    dbType: string,
    database: string,
    tables: string[],
    model: string,
    temperature: number
): Promise<{ sql: string; explanation: string }> {
    const systemPrompt = buildSystemPrompt(dbType, database, tables);

    // Hugging Face Inference API - Using newer router endpoint
    // Some models (especially on HF) are picky about the 'system' role.
    // We'll prepare a fallback prompt just in case.
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature,
            max_tokens: 1024, // Lowered slightly to be safer
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] Hugging Face Error:', errorText);

        // If 400, it might be the system role. Let's try one fallback if it's a 400
        if (response.status === 400 && !prompt.includes('Fallback Attempt')) {
            console.log('[AI API] HF 400 Error. Trying fallback without system role...');
            return callHuggingFace(apiKey, `[System Instruction: ${systemPrompt}]\n\nUser Question: ${prompt} (Fallback Attempt)`, dbType, database, tables, model, temperature);
        }

        throw new Error(`Hugging Face API error (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();
    console.log('[AI API] Hugging Face raw data:', JSON.stringify(data).slice(0, 1000));

    // Handle OpenAI-compatible response format from Hugging Face
    let content = '';

    if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content || '';
    }

    if (!content) {
        // Fallback for traditional HF format: [{generated_text: "..."}]
        if (Array.isArray(data) && data[0] && data[0].generated_text) {
            content = data[0].generated_text;
        } else if (data.generated_text) {
            content = data.generated_text;
        } else if (data.text) {
            content = data.text;
        }
    }

    if (!content) {
        console.error('[AI API] HF Empty Content. Full Data:', JSON.stringify(data));
        throw new Error(`Hugging Face returned empty response. Response structure: ${Object.keys(data).join(', ')}`);
    }

    if (!content) {
        throw new Error('Hugging Face returned empty response');
    }

    console.log('[AI API] Hugging Face raw response:', content.slice(0, 500));
    return parseAIResponse(content);
}

function parseAIResponse(content: string): { sql: string; explanation: string } {
    // Try to extract SQL from code blocks if present
    const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/i) ||
        content.match(/```\n?([\s\S]*?)```/);

    if (sqlMatch) {
        const sql = sqlMatch[1].trim();
        const explanation = content.split('```')[0].trim() || 'Generated query:';
        return { sql, explanation };
    }

    // No code block - return the full response as explanation
    // and try to extract any SQL-like content
    const lines = content.split('\n');
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'WITH', 'EXPLAIN', 'SHOW', 'DESCRIBE'];

    const sqlLines: string[] = [];
    const explanationLines: string[] = [];
    let foundSQL = false;

    for (const line of lines) {
        const trimmed = line.trim().toUpperCase();
        if (!foundSQL && sqlKeywords.some(kw => trimmed.startsWith(kw))) {
            foundSQL = true;
        }

        if (foundSQL) {
            sqlLines.push(line);
        } else {
            explanationLines.push(line);
        }
    }

    const sql = sqlLines.join('\n').trim();
    const explanation = explanationLines.join('\n').trim() || content;

    // If no SQL found, return full content as explanation
    if (!sql) {
        return { sql: '', explanation: content };
    }

    return { sql, explanation };
}

function generateFallbackSQL(
    prompt: string,
    dbType: string,
    tables: string[]
): { sql: string; explanation: string } {
    const lowerPrompt = prompt.toLowerCase();

    // Simple pattern matching for common requests
    if (lowerPrompt.includes('show') && lowerPrompt.includes('table')) {
        if (dbType === 'postgresql') {
            return {
                sql: `SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;`,
                explanation: 'Lists all tables in your database.'
            };
        } else {
            return {
                sql: `SHOW TABLES;`,
                explanation: 'Lists all tables in your database.'
            };
        }
    }

    if ((lowerPrompt.includes('count') || lowerPrompt.includes('row')) && lowerPrompt.includes('each')) {
        if (dbType === 'postgresql') {
            return {
                sql: `SELECT schemaname, relname as table_name, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;`,
                explanation: 'Shows row counts for each table in your database.'
            };
        }
    }

    if (lowerPrompt.includes('schema') || lowerPrompt.includes('describe')) {
        if (tables.length > 0) {
            const table = tables[0];
            if (dbType === 'postgresql') {
                return {
                    sql: `SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '${table.split('.').pop()}'
ORDER BY ordinal_position;`,
                    explanation: `Shows the schema for table ${table}.`
                };
            } else {
                return {
                    sql: `DESCRIBE ${table};`,
                    explanation: `Shows the schema for table ${table}.`
                };
            }
        }
    }

    if (lowerPrompt.includes('count') && tables.length > 0) {
        const table = tables[0];
        return {
            sql: `SELECT COUNT(*) as total FROM ${table};`,
            explanation: `Counts all rows in ${table}.`
        };
    }

    if (lowerPrompt.includes('sample') || lowerPrompt.includes('data')) {
        if (tables.length > 0) {
            const table = tables[0];
            return {
                sql: `SELECT * FROM ${table} LIMIT 10;`,
                explanation: `Shows sample data from ${table}.`
            };
        }
    }

    if (lowerPrompt.includes('select') || lowerPrompt.includes('show') || lowerPrompt.includes('get')) {
        if (tables.length > 0) {
            const table = tables[0];
            return {
                sql: `SELECT * FROM ${table} LIMIT 100;`,
                explanation: `Retrieves first 100 rows from ${table}.`
            };
        }
    }

    if (lowerPrompt.includes('create') && lowerPrompt.includes('table')) {
        const tableName = lowerPrompt.match(/table\s+(\w+)/)?.[1] || 'new_table';
        if (dbType === 'postgresql') {
            return {
                sql: `CREATE TABLE ${tableName} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
                explanation: `Creates a new table called ${tableName} with common fields.`
            };
        } else {
            return {
                sql: `CREATE TABLE ${tableName} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`,
                explanation: `Creates a new table called ${tableName} with common fields.`
            };
        }
    }

    // Default fallback
    return {
        sql: `-- Could not generate SQL for: "${prompt}"
-- Please configure an AI API key for better results.
-- Add one of these to your .env.local file:
--   GEMINI_API_KEY=your_key (free at aistudio.google.com)
--   OPENAI_API_KEY=your_key
--   ANTHROPIC_API_KEY=your_key

SELECT 'Configure AI API key for advanced queries' as message;`,
        explanation: '💡 For complex queries, please configure an AI API key. Gemini API is free to start!'
    };
}

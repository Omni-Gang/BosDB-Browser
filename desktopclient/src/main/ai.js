const path = require('path');
const fs = require('fs');

/**
 * AI Service for Native Client
 * Ports the robust SQL generation logic from the web app
 */

const MODEL_DEFAULTS = {
    gemini: 'gemini-2.0-flash-exp',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    huggingface: 'Qwen/Qwen2.5-Coder-32B-Instruct'
};

function buildSystemPrompt(dbType, database, tables) {
    const tableList = tables.length > 0
        ? `Available tables: ${tables.slice(0, 50).join(', ')}`
        : 'No table information available';

    return `You are an expert database assistant with deep knowledge of ${dbType.toUpperCase()} and other databases.
Database: ${database}
${tableList}

When the user asks for a query:
1. Provide a brief explanation
2. Then provide the query in a \`\`\`sql code block
3. Use proper ${dbType.toUpperCase()} syntax

Always be helpful and professional.`;
}

function parseAIResponse(content) {
    const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/i) ||
        content.match(/```\n?([\s\S]*?)```/);

    if (sqlMatch) {
        const sql = sqlMatch[1].trim();
        const explanation = content.split('```')[0].trim() || 'Generated query:';
        return { sql, explanation };
    }

    return { sql: '', explanation: content };
}

async function generateSQL(config) {
    const { prompt, dbType, database, tables, model, provider, temperature = 0.3 } = config;

    // In native client, we can read keys from process.env or a local .env file
    // For this implementation, we'll check common env vars
    const keys = {
        gemini: process.env.GEMINI_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        huggingface: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN
    };

    const useProvider = provider === 'auto' || !provider
        ? (keys.huggingface ? 'huggingface' : (keys.gemini ? 'gemini' : 'fallback'))
        : provider;

    const useModel = model === 'auto' ? MODEL_DEFAULTS[useProvider] : model;
    const systemPrompt = buildSystemPrompt(dbType, database, tables);

    try {
        if (useProvider === 'gemini' && keys.gemini) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${keys.gemini}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
                        }],
                        generationConfig: { temperature }
                    }),
                }
            );
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return { ...parseAIResponse(content), model: useModel };
        }

        if (useProvider === 'huggingface' && keys.huggingface) {
            const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.huggingface}`,
                },
                body: JSON.stringify({
                    model: useModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature
                }),
            });
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            return { ...parseAIResponse(content), model: useModel };
        }

        // Fallback or other providers...
        return {
            sql: `SELECT 'Please configure API keys in your environment' as message;`,
            explanation: "💡 AI service is ready! Add GEMINI_API_KEY or HUGGINGFACE_API_KEY to your environment to enable SQL generation.",
            model: 'fallback'
        };

    } catch (error) {
        console.error('Native AI Service Error:', error);
        return { error: error.message };
    }
}

module.exports = { generateSQL };

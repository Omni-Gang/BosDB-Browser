'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
    language: string;
    code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
    return (
        <div className="relative group my-4">
            <div className="absolute right-2 top-2 px-2 py-1 text-xs text-muted-foreground bg-muted/20 rounded opacity-0 group-hover:opacity-100 transition-opacity select-none">
                {language}
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                }}
            >
                {code.trim()}
            </SyntaxHighlighter>
        </div>
    );
}

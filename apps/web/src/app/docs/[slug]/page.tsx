import fs from 'fs';
import path from 'path';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
    params: {
        slug: string;
    };
}

// Map slugs to filenames
const SLUG_MAP: Record<string, string> = {
    'quick-start': 'QUICK_START.md',
    'introduction': 'QUICK_START.md',
    'architecture': 'ARCHITECTURE.md',
    'version-control': 'GIT_LIKE_BRANCHING.md',
    'connections': 'CONNECTIONS.md',
    'query-editor': 'QUERY_EDITOR.md',
    'visual-designer': 'VISUAL_DESIGNER.md',
    'roles': 'OTP_FEATURE.md',
    'security': 'SECURITY.md',
    'data-privacy': 'USER_DATA_PRIVACY.md',
    'system-design': 'SYSTEM_DESIGN.md',
    'docker': 'DOCKER_PROVISIONING.md',
    'installation': 'INSTALLATION.md',
};

export default function DocPage({ params }: Props) {
    const filename = SLUG_MAP[params.slug];

    if (!filename) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-muted-foreground mb-6">Documentation page not found</p>
                <Link href="/docs" className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Docs
                </Link>
            </div>
        );
    }

    const docsDir = path.join(process.cwd(), '../../docs');
    const filePath = path.join(docsDir, filename);

    let content = '';
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Failed to read doc file: ${filePath}`, err);
        return (
            <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg text-destructive">
                Error loading documentation: {filename} not found.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-6">
                <Link href="/docs" className="no-underline text-muted-foreground hover:text-primary text-sm flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Overview
                </Link>
            </div>

            <article className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight 
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:text-foreground
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                prose-p:text-muted-foreground prose-p:leading-7
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-border
                prose-img:rounded-lg prose-img:border prose-img:border-border prose-img:shadow-md
                prose-table:border-collapse prose-table:w-full prose-th:text-left prose-th:p-2 prose-td:p-2 prose-tr:border-b prose-tr:border-border
            ">
                <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div className="relative group">
                                    <div className="absolute right-2 top-2 px-2 py-1 text-xs text-muted-foreground bg-muted/20 rounded opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                        {match[1]}
                                    </div>
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: '0.5rem',
                                            fontSize: '0.9rem',
                                        }}
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-6 border border-border rounded-lg">
                                <table className="w-full text-sm text-left">
                                    {children}
                                </table>
                            </div>
                        ),
                        thead: ({ children }) => (
                            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                                {children}
                            </thead>
                        ),
                        th: ({ children }) => (
                            <th className="px-6 py-3 font-medium border-b border-border">
                                {children}
                            </th>
                        ),
                        td: ({ children }) => (
                            <td className="px-6 py-4 border-b border-border/50">
                                {children}
                            </td>
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/20 p-4 rounded-r-lg my-6">
                                {children}
                            </blockquote>
                        ),
                        a: ({ href, children }) => (
                            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                                {children}
                            </a>
                        )
                    }}
                >
                    {content}
                </Markdown>
            </article>
        </div>
    );
}

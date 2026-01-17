'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function ConnectionsPage() {
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
                <h1>Managing Connections</h1>
                <p>BosDB supports connecting to over 30 different database types through its universal adapter system.</p>

                <h2>Creating a New Connection</h2>
                <ol>
                    <li>Navigate to the <strong>Dashboard</strong>.</li>
                    <li>Click the <strong>&quot;New Connection&quot;</strong> card.</li>
                    <li>Select your <strong>Database Type</strong> (e.g., PostgreSQL, MySQL, MongoDB).</li>
                    <li>Enter the connection details:
                        <ul>
                            <li><strong>Name</strong>: A friendly alias for this connection.</li>
                            <li><strong>Host</strong>: Server address (e.g., <code>localhost</code> or <code>db.example.com</code>).</li>
                            <li><strong>Port</strong>: Database port (defaults will be suggested).</li>
                            <li><strong>Database</strong>: Name of the database to connect to.</li>
                            <li><strong>Username &amp; Password</strong>: Your credentials.</li>
                        </ul>
                    </li>
                    <li>(Optional) Configure <strong>SSL/TLS</strong> settings for secure cloud connections.</li>
                    <li>Click <strong>Test Connection</strong> to verify.</li>
                    <li>Click <strong>Save</strong> to persist the encrypted connection.</li>
                </ol>

                <h2>Editing Connections</h2>
                <ul>
                    <li>Click the <strong>Settings (⚙️)</strong> icon on any connection card.</li>
                    <li>Update credentials or host details.</li>
                    <li><strong>Note</strong>: For security, existing passwords are never shown. Enter a new password only if you wish to change it.</li>
                </ul>

                <h2>Enterprise Isolation</h2>
                <p>If you are part of an Organization:</p>
                <ul>
                    <li>Connections you create are <strong>Private</strong> to you by default.</li>
                    <li>Admins can create <strong>Shared Connections</strong> visible to the entire team.</li>
                    <li>All stored credentials are encrypted using the organization&apos;s master key.</li>
                </ul>

                <h2>Troubleshooting</h2>
                <ul>
                    <li><strong>Connection Refused</strong>: Check if your database allows remote connections and that your IP is whitelisted.</li>
                    <li><strong>Docker/Localhost</strong>: On Mac/Windows, use <code>host.docker.internal</code> instead of <code>localhost</code> if BosDB is running in Docker.</li>
                </ul>
            </article>
        </div>
    );
}

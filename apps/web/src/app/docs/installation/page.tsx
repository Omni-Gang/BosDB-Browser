'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function InstallationPage() {
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
                <h1>Installation Guide</h1>

                <h2>System Requirements</h2>
                <ul>
                    <li><strong>OS</strong>: Windows, macOS, or Linux</li>
                    <li><strong>Node.js</strong>: v18.0.0 or higher</li>
                    <li><strong>Docker</strong>: Desktop or Engine (optional, for local database provisioning)</li>
                    <li><strong>Memory</strong>: 4GB RAM minimum (8GB recommended)</li>
                </ul>

                <h2>Quick Install (Cloud/Web)</h2>
                <p>No installation required! Simply navigate to your deployed instance URL.</p>

                <h2>Local Installation</h2>
                <p>Run BosDB on your own machine for development or local management.</p>

                <ol>
                    <li>
                        <strong>Clone the Repository</strong>
                        <CodeBlock language="bash" code={`git clone https://github.com/bosdb/bosdb-browser.git
cd bosdb-browser`} />
                    </li>

                    <li>
                        <strong>Install Dependencies</strong>
                        <CodeBlock language="bash" code={`pnpm install
# or
npm install`} />
                    </li>

                    <li>
                        <strong>Setup Environment</strong>
                        <p>Copy the example environment file:</p>
                        <CodeBlock language="bash" code={`cp .env.example .env.local`} />

                        <p>Generate a secure encryption key for storing credentials:</p>
                        <CodeBlock language="bash" code={`openssl rand -hex 32`} />
                        <p>Add this key to your <code>.env.local</code>:</p>
                        <CodeBlock language="properties" code={`ENCRYPTION_MASTER_KEY=your_generated_key_here`} />
                    </li>

                    <li>
                        <strong>Start Development Server</strong>
                        <CodeBlock language="bash" code={`pnpm dev`} />
                        <p>Access the app at <code>http://localhost:3000</code>.</p>
                    </li>
                </ol>

                <h2>Docker Deployment</h2>
                <p>Run BosDB as a container:</p>
                <CodeBlock language="bash" code={`docker run -p 3000:3000 -e ENCRYPTION_MASTER_KEY=your_key bosdb/browser`} />
            </article>
        </div>
    );
}

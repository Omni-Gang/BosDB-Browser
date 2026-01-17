'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function DockerPage() {
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
                <h1>Docker Provisioning</h1>
                <p>BosDB allows you to spin up database instances instantly using Docker containers.</p>

                <h2>Prerequisites</h2>
                <ul>
                    <li><strong>Docker Engine</strong> must be installed and running on the host machine.</li>
                    <li>BosDB must have access to the Docker socket (default setup works for local dev).</li>
                </ul>

                <h2>Provisioning a Database</h2>
                <ol>
                    <li>Go to <strong>Dashboard</strong> -&gt; <strong>New Connection</strong>.</li>
                    <li>Select the <strong>&quot;Docker Provision&quot;</strong> tab.</li>
                    <li>Choose a database engine:
                        <ul>
                            <li>PostgreSQL (Latest, 15, 14, 13)</li>
                            <li>MySQL (Latest, 8.0, 5.7)</li>
                            <li>MongoDB</li>
                            <li>Redis</li>
                        </ul>
                    </li>
                    <li>Click <strong>Start Instance</strong>.</li>
                </ol>

                <p>BosDB will:</p>
                <ol>
                    <li>Pull the Docker image (if missing).</li>
                    <li>Create a volume for persistent data.</li>
                    <li>Start the container with auto-generated secure credentials.</li>
                    <li>Automatically create a Connection entry for you.</li>
                </ol>

                <h2>Managing Instances</h2>
                <ul>
                    <li>View CPU/Memory usage of running containers.</li>
                    <li><strong>Stop</strong>: Pause the container.</li>
                    <li><strong>Restart</strong>: Reboot the database.</li>
                    <li><strong>Delete</strong>: Remove the container and connection (Volume can be preserved).</li>
                </ul>
            </article>
        </div>
    );
}

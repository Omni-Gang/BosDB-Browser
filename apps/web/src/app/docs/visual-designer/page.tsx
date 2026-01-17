'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function VisualDesignerPage() {
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
                <h1>Visual Table Designer</h1>
                <p>The Visual Table Designer allows you to create and modify database schemas without writing raw SQL.</p>

                <h2>Accessing the Designer</h2>
                <ol>
                    <li>Open a Connection.</li>
                    <li>In the sidebar, hover over a Schema.</li>
                    <li>Click the <strong>+</strong> (Plus) icon to create a table, or right-click an existing table and select <strong>Design</strong>.</li>
                </ol>

                <h2>Designing a Table</h2>
                <p>The interface provides a spreadsheet-like view for defining columns:</p>
                <ul>
                    <li><strong>Name</strong>: Column name (e.g., <code>id</code>, <code>email</code>).</li>
                    <li><strong>Type</strong>: Data type (e.g., <code>UUID</code>, <code>VARCHAR</code>, <code>INTEGER</code>).</li>
                    <li><strong>Length/Precision</strong>: Optional constraints.</li>
                    <li><strong>Nullable</strong>: Check if the column can be empty.</li>
                    <li><strong>Primary Key</strong>: Mark unique identifiers.</li>
                    <li><strong>Unique</strong>: Enforce unique values.</li>
                    <li><strong>Foreign Key</strong>: Link to other tables.</li>
                </ul>

                <h2>AI Assistant</h2>
                <p>Click the <strong>&quot;Magic Wand&quot;</strong> icon to use the AI Assistant:</p>
                <blockquote>
                    <p>&quot;Create a users table with email, password hash, and active status.&quot;</p>
                </blockquote>
                <p>The AI will generate the appropriate column definitions automatically.</p>

                <h2>Importing Data</h2>
                <ol>
                    <li>Click <strong>Import</strong> in the designer toolbar.</li>
                    <li>Upload a <strong>CSV</strong> or <strong>JSON</strong> file.</li>
                    <li>Map file columns to database columns.</li>
                    <li>Preview data and click <strong>Import</strong>.</li>
                </ol>

                <h2>Applying Changes</h2>
                <p>BosDB uses a &quot;Pending Changes&quot; system:</p>
                <ol>
                    <li>Make your edits in the designer.</li>
                    <li>Click <strong>Review Changes</strong>.</li>
                    <li>See the generated SQL (DDL).</li>
                    <li>Click <strong>Apply</strong> to execute schema changes.</li>
                </ol>
            </article>
        </div>
    );
}

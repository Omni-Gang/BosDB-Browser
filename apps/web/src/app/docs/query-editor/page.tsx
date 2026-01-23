'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function QueryEditorPage() {
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
                <h1>Pro Query Editor</h1>
                <p>BosDB features a VSCode-style SQL editor (Monaco) optimized for productivity.</p>

                <h2>Key Features</h2>

                <h3>1. Intelligent Autocomplete</h3>
                <ul>
                    <li>Context-aware suggestions for tables, columns, and views.</li>
                    <li>Supports aliases (e.g., <code>SELECT u.name FROM users u</code> -&gt; suggests columns for <code>u</code>).</li>
                </ul>

                <h3>2. Multi-Tab Results</h3>
                <ul>
                    <li>Execute multiple queries separated by semicolons (<code>;</code>).</li>
                    <li>Results appear in separate tabs at the bottom.</li>
                    <li>Perfect for comparing datasets or debugging data flows.</li>
                </ul>

                <h3>3. Query History</h3>
                <ul>
                    <li>Sidebar tracks every execution with timestamp and duration.</li>
                    <li><strong>Green/Red</strong> indicators for success/fail.</li>
                    <li>Click any history item to re-load the query into the editor.</li>
                </ul>

                <h3>4. Saved Queries</h3>
                <ul>
                    <li>Save frequently used complex queries.</li>
                    <li>Share queries with your team (Enterprise).</li>
                    <li>Organize by name and description.</li>
                </ul>

                <h2>Keyboard Shortcuts</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Windows/Linux</th>
                            <th>macOS</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>Ctrl + Enter</code></td>
                            <td><code>Cmd + Enter</code></td>
                            <td>Execute Statement under cursor</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl + Shift + Enter</code></td>
                            <td><code>Cmd + Shift + Enter</code></td>
                            <td>Execute All Queries</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl + Shift + F</code></td>
                            <td><code>Cmd + Shift + F</code></td>
                            <td>Format SQL</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl + S</code></td>
                            <td><code>Cmd + S</code></td>
                            <td>Save Query</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl + /</code></td>
                            <td><code>Cmd + /</code></td>
                            <td>Toggle Comment</td>
                        </tr>
                        <tr>
                            <td><code>F1</code></td>
                            <td><code>F1</code></td>
                            <td>Command Palette</td>
                        </tr>
                    </tbody>
                </table>

                <h2>Data Grid</h2>
                <p>The result result is fully interactive:</p>
                <ul>
                    <li><strong>Sort</strong>: Click column headers.</li>
                    <li><strong>Filter</strong>: Use the filter row.</li>
                    <li><strong>Edit</strong>: Double-click any cell to edit data (updates generated automatically).</li>
                    <li><strong>Export</strong>: Download as CSV, JSON, or SQL INSERTs.</li>
                </ul>
            </article>
        </div>
    );
}

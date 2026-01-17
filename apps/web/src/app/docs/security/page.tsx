'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function SecurityPage() {
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
                <h1>Security &amp; Enterprise</h1>

                <h2>Data Security</h2>

                <h3>Encryption</h3>
                <ul>
                    <li><strong>At Rest</strong>: All database credentials stored in BosDB are AES-256-GCM encrypted using the <code>ENCRYPTION_MASTER_KEY</code> defined on the server.</li>
                    <li><strong>In Transit</strong>: All traffic between browser and server, and server to database, supports TLS/SSL.</li>
                </ul>

                <h3>User Data</h3>
                <ul>
                    <li>BosDB is a <strong>Privacy-First</strong> tool. We do not track your queries or data content.</li>
                    <li>Telemetry is limited to error reporting and crash dumps (opt-out available).</li>
                </ul>

                <h2>Enterprise Features</h2>

                <h3>Role-Based Access Control (RBAC)</h3>
                <p>When you enable &quot;Enterprise Mode&quot; (Organization setup):</p>
                <ul>
                    <li><strong>Admins</strong>: Full control. Can manage billing, users, and global connections.</li>
                    <li><strong>Members</strong>: Can access shared connections and save private queries.</li>
                    <li><strong>Viewers</strong>: Can only run read-only (<code>SELECT</code>) queries.</li>
                </ul>

                <h3>Team Visibility</h3>
                <ul>
                    <li><strong>Team Sidebar</strong>: See who is online/active in the project.</li>
                    <li><strong>Shared Cabinet</strong>: Admin-curated list of &quot;Golden Queries&quot; available to everyone.</li>
                </ul>

                <h3>Single Sign-On (SSO)</h3>
                <p>(Coming Soon)</p>
                <ul>
                    <li>Support for SAML and OIDC providers (Okta, Google Workspace, Azure AD).</li>
                </ul>
            </article>
        </div>
    );
}

'use client';

import { Database, Book, Code, GitBranch, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DocumentationPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="border-b border-border pb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Book className="w-10 h-10 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                    Welcome to the BosDB documentation. Learn how to manage your databases like a pro with our advanced query editor, version control, and team collaboration features.
                </p>
                <div className="flex gap-4 mt-6">
                    <Link
                        href="/docs/quick-start"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        Get Started
                        <ChevronRight className="ml-2 w-4 h-4" />
                    </Link>
                    <Link
                        href="/docs/connections"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        Connect Database
                    </Link>
                </div>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/docs/quick-start" className="group p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all hover:shadow-lg">
                    <Zap className="w-8 h-8 text-amber-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Quick Start</h3>
                    <p className="text-muted-foreground">Get up and running with BosDB in less than 5 minutes.</p>
                </Link>

                <Link href="/docs/connections" className="group p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all hover:shadow-lg">
                    <Database className="w-8 h-8 text-blue-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Supported Databases</h3>
                    <p className="text-muted-foreground">Connect to PostgreSQL, MySQL, Oracle, MongoDB, and 30+ others.</p>
                </Link>

                <Link href="/docs/version-control" className="group p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all hover:shadow-lg">
                    <GitBranch className="w-8 h-8 text-purple-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Version Control</h3>
                    <p className="text-muted-foreground">Track schema changes, commit revisions, and rollback mistakes.</p>
                </Link>

                <Link href="/docs/query-editor" className="group p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all hover:shadow-lg">
                    <Code className="w-8 h-8 text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Pro Query Editor</h3>
                    <p className="text-muted-foreground">Intelligent autocomplete, history, and multiple result tabs.</p>
                </Link>
            </div>

            {/* Feature Highlights */}
            <div className="bg-muted/30 rounded-2xl p-8 border border-border">
                <h2 className="text-2xl font-bold mb-6">Why BosDB?</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        "Zero-configuration Docker provisioning",
                        "Enterprise-grade Security & Encryption",
                        "Team Collaboration & Roles",
                        "Visual Table Designer",
                        "AI SQL Assistant",
                        "Cross-platform (Web, Desktop, Cloud)"
                    ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary text-sm">✓</span>
                            </div>
                            <span className="text-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

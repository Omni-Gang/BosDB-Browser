'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Book,
    Code,
    GitBranch,
    Shield,
    Server,
    Database,
    Play,
    Settings,
    ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
    {
        title: 'Getting Started',
        icon: <Play className="w-4 h-4" />,
        items: [
            { title: 'Introduction', href: '/docs' },
            { title: 'Quick Start', href: '/docs/quick-start' },
            { title: 'Installation', href: '/docs/installation' },
        ]
    },
    {
        title: 'Core Concepts',
        icon: <Database className="w-4 h-4" />,
        items: [
            { title: 'Connections', href: '/docs/connections' },
            { title: 'Query Editor', href: '/docs/query-editor' },
            { title: 'Visual Designer', href: '/docs/visual-designer' },
        ]
    },
    {
        title: 'Advanced Features',
        icon: <GitBranch className="w-4 h-4" />,
        items: [
            { title: 'Version Control', href: '/docs/version-control' },
            { title: 'Docker Provisioning', href: '/docs/docker' },
            { title: 'Data Privacy', href: '/docs/data-privacy' },
        ]
    },
    {
        title: 'Enterprise',
        icon: <Shield className="w-4 h-4" />,
        items: [
            { title: 'Roles & Permissions', href: '/docs/roles' },
            { title: 'Security', href: '/docs/security' },
        ]
    }
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col fixed inset-y-0 pt-16">
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {MENU_ITEMS.map((section) => (
                        <div key={section.title}>
                            <div className="flex items-center gap-2 px-2 mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {section.icon}
                                {section.title}
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${isActive
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                                }`}
                                        >
                                            {item.title}
                                            {isActive && <ChevronRight className="w-3 h-3" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-4">
                <div className="container mx-auto px-6 py-8 max-w-4xl">
                    {children}
                </div>
            </main>
        </div>
    );
}

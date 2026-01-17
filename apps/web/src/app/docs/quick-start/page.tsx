'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function QuickStartPage() {
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
                <h1>Quick Start Guide</h1>

                <h2>Prerequisites</h2>
                <ul>
                    <li>Node.js &gt;= 18.0.0</li>
                    <li>pnpm &gt;= 8.0.0</li>
                    <li>PostgreSQL database (for testing)</li>
                </ul>

                <h2>Installation</h2>
                <CodeBlock language="bash" code={`# Clone or navigate to project
cd BosDB

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local and set:
# ENCRYPTION_MASTER_KEY=your-super-secret-key-here`} />

                <h2>Development</h2>

                <h3>Start test database (Docker)</h3>
                <CodeBlock language="bash" code={`docker-compose up -d`} />
                <p>This starts a PostgreSQL database with:</p>
                <ul>
                    <li>Host: localhost</li>
                    <li>Port: 5432</li>
                    <li>Database: testdb</li>
                    <li>Username: testuser</li>
                    <li>Password: testpass</li>
                </ul>

                <h3>Run development server</h3>
                <CodeBlock language="bash" code={`# Start all packages in watch mode
pnpm dev`} />
                <p>The application will be available at <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">http://localhost:3000</a></p>

                <h3>Build for production</h3>
                <CodeBlock language="bash" code={`# Build all packages
pnpm build

# Start production server
cd apps/web
pnpm start`} />

                <h2>Using BosDB</h2>

                <h3>1. Create a Connection</h3>
                <ol>
                    <li>Navigate to <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">http://localhost:3000</a></li>
                    <li>Click &quot;Get Started&quot; or &quot;New Connection&quot;</li>
                    <li>Fill in connection details:
                        <ul>
                            <li>Name: &quot;My Local DB&quot;</li>
                            <li>Type: PostgreSQL</li>
                            <li>Host: localhost</li>
                            <li>Port: 5432</li>
                            <li>Database: testdb</li>
                            <li>Username: testuser</li>
                            <li>Password: testpass</li>
                        </ul>
                    </li>
                    <li>Click &quot;Create Connection&quot;</li>
                </ol>

                <h3>2. Execute Queries</h3>
                <ol>
                    <li>From dashboard, click &quot;Open Query Editor&quot; on your connection</li>
                    <li>Write a SQL query:
                        <CodeBlock language="sql" code={`SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
LIMIT 10;`} />
                    </li>
                    <li>Click &quot;Run Query&quot;</li>
                    <li>View results in the table below</li>
                    <li>(Optional) Click &quot;Export CSV&quot; to download results</li>
                </ol>

                <h3>3. Explore Schema</h3>
                <ul>
                    <li>View available schemas in the left sidebar</li>
                    <li>See table counts for each schema</li>
                </ul>

                <h2>Project Structure</h2>
                <CodeBlock language="text" code={`bosdb/
├── apps/web/           # Next.js frontend
├── packages/
│   ├── core/           # Types and constants
│   ├── db-adapters/    # Database adapters
│   ├── security/       # Encryption & validation
│   └── utils/          # Logger and utilities
├── docs/               # Documentation
└── docker-compose.yml  # Test database`} />

                <h2>Available Scripts</h2>
                <CodeBlock language="bash" code={`pnpm dev        # Start development server
pnpm build      # Build all packages
pnpm lint       # Lint code
pnpm clean      # Clean build artifacts`} />

                <h2>Troubleshooting</h2>

                <h3>Connection fails</h3>
                <ul>
                    <li>Ensure PostgreSQL is running</li>
                    <li>Check host/port/credentials</li>
                    <li>Verify firewall settings</li>
                </ul>

                <h3>Build errors</h3>
                <ul>
                    <li>Clear node_modules: <code>rm -rf node_modules && pnpm install</code></li>
                    <li>Clear build cache: <code>pnpm clean</code></li>
                </ul>

                <h3>Environment variables not working</h3>
                <ul>
                    <li>Ensure .env.local exists in project root</li>
                    <li>Restart dev server after changing env vars</li>
                </ul>

                <h2>Next Steps</h2>
                <ul>
                    <li>Read <Link href="/docs/architecture">ARCHITECTURE.md</Link> for system design</li>
                    <li>Explore adding MySQL or MongoDB adapters</li>
                </ul>
            </article>
        </div>
    );
}

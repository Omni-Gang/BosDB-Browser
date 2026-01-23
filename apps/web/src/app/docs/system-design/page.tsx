'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CodeBlock from '@/components/docs/CodeBlock';

export default function SystemDesignPage() {
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
                <h1>BosDB - System Design Document</h1>

                <h2>Executive Summary</h2>
                <p>BosDB is a production-grade, browser-based database management tool designed for modern cloud databases. It provides secure, scalable access to PostgreSQL (with MySQL and MongoDB support planned) through a web interface, featuring SQL editing, schema exploration, and query execution with enterprise-grade security.</p>

                <h2>System Architecture</h2>

                <h3>High-Level Overview</h3>
                <CodeBlock language="text" code={`┌──────────────────────────────────────────────────────┐
│                   Client Browser                      │
│  ┌────────────────────────────────────────────────┐  │
│  │      Next.js Frontend (React + TypeScript)     │  │
│  │  - Monaco SQL Editor                           │  │
│  │  - Schema Explorer                             │  │
│  │  - Connection Management UI                    │  │
│  │  - Query Results Table                         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌──────────────────────────────────────────────────────┐
│            Next.js Application Server                 │
│  ┌────────────────────────────────────────────────┐  │
│  │         API Routes (Backend Logic)             │  │
│  │  /api/connections  - Connection CRUD           │  │
│  │  /api/query        - Query execution           │  │
│  │  /api/schema       - Metadata retrieval        │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │         Security Layer (@bosdb/security)       │  │
│  │  - AES-256-GCM Credential Encryption          │  │
│  │  - SQL Injection Detection                     │  │
│  │  - Read-only Query Validation                  │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │      Database Adapter Layer (@bosdb/db-adapters│  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  | IDBAdapter Interface                     |  │  │
│  │  ├──────────────────────────────────────────┤  │  │
│  │  | PostgreSQLAdapter (Implemented)          |  │  │
│  │  | MySQLAdapter (Planned)                   |  │  │
│  │  | MongoDBAdapter (Planned)                 |  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│           External User Databases                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ PostgreSQL  │  │    MySQL    │  │   MongoDB   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘`} />

                <h2>Core Components</h2>

                <h3>1. Frontend Layer (Next.js 14 + React)</h3>
                <p><strong>Technology Stack:</strong></p>
                <ul>
                    <li>Next.js 14 (App Router)</li>
                    <li>React 18 with TypeScript</li>
                    <li>Monaco Editor for SQL editing</li>
                    <li>Tailwind CSS for styling</li>
                    <li>next-themes for dark mode</li>
                </ul>
                <p><strong>Key Components:</strong></p>
                <ul>
                    <li><strong>Landing Page (<code>/</code>)</strong>: Feature showcase, Call-to-action</li>
                    <li><strong>Dashboard (<code>/dashboard</code>)</strong>: Connection list, Real-time status</li>
                    <li><strong>Query Editor (<code>/query</code>)</strong>: Monaco editor, Results table, Export</li>
                </ul>

                <h3>2. API Layer (Next.js API Routes)</h3>
                <p><strong>Security-First Design:</strong></p>
                <ul>
                    <li>No credential exposure to frontend</li>
                    <li>All sensitive operations server-side</li>
                    <li>Validation at every layer</li>
                </ul>

                <p><strong>Endpoints:</strong></p>
                <h4>POST /api/connections</h4>
                <CodeBlock language="typescript" code={`Request: {
  name: string,
  type: 'postgresql' | 'mysql' | 'mongodb',
  // ...credentials
}

Response: {
  id: string,
  status: 'connected' | 'disconnected',
  // ...safe metadata
}`} />

                <h4>POST /api/query</h4>
                <CodeBlock language="typescript" code={`Request: {
  connectionId: string,
  query: string,
  timeout?: number,
  maxRows?: number
}

Response: {
  success: boolean,
  rows: any[],
  fields: QueryField[],
  rowCount: number,
  executionTime: number
}`} />

                <h3>3. Database Adapter Layer</h3>
                <p><strong>Design Pattern:</strong> Strategy Pattern with Dependency Injection</p>
                <CodeBlock language="typescript" code={`interface IDBAdapter {
  connect(config: ConnectionConfig): Promise<ConnectionResult>
  executeQuery(request: QueryRequest): Promise<QueryResult>
  listSchemas(connectionId: string): Promise<Schema[]>
  // ...methods
}`} />

                <h3>4. Security Layer</h3>
                <h4>Credential Encryption</h4>
                <p><strong>Algorithm:</strong> AES-256-GCM (Authenticated Encryption)</p>

                <h4>SQL Injection Protection</h4>
                <p><strong>Multi-Level Defense:</strong></p>
                <ol>
                    <li><strong>Pattern Detection</strong>: Checks for DROP, TRUNCATE, etc.</li>
                    <li><strong>Read-only Enforcement</strong>: Validates query starts with SELECT/EXPLAIN.</li>
                    <li><strong>Parameterization Ready</strong>: Adapter supports prepared statements.</li>
                </ol>

                <h3>5. Data Flow</h3>
                <h4>Query Execution Flow</h4>
                <CodeBlock language="text" code={`1. User writes SQL in Monaco Editor
2. Clicks "Run Query"
3. Frontend sends POST /api/query
4. API validates & checks security
5. API decrypts credentials
6. Adapter executes query
7. Results returned to frontend`} />

                <h2>Scaling Strategy</h2>
                <h3>Production Architecture (10k+ Users)</h3>
                <CodeBlock language="text" code={`                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
    ┌─────▼─────┐      ┌─────▼─────┐     ┌─────▼─────┐
    │ Next.js 1 │      │ Next.js 2 │     │ Next.js N │
    └─────┬─────┘      └─────┬─────┘     └─────┬─────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
             ┌───────────────┼───────────────┐
        ┌────▼────┐    ┌─────▼─────┐  ┌─────▼─────┐
        │  Redis  │    │  App DB   │  │   Queue   │
        └─────────┘    └───────────┘  └───────────┘`} />

                <p><strong>Scaling Components:</strong></p>
                <ol>
                    <li><strong>Horizontal Scaling</strong>: Stateless Next.js instances</li>
                    <li><strong>Redis Caching</strong>: Schema metadata, Connection info</li>
                    <li><strong>Connection Pooling</strong>: Managed pools per instance</li>
                    <li><strong>Query Queue</strong>: For long-running queries</li>
                    <li><strong>Read Replicas</strong>: 80/20 split</li>
                    <li><strong>Rate Limiting</strong>: Per user safeguards</li>
                </ol>

                <h2>Deployment</h2>
                <h3>Docker</h3>
                <CodeBlock language="dockerfile" code={`FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
CMD ["pnpm", "start"]`} />

                <h3>Environment Variables</h3>
                <CodeBlock language="bash" code={`ENCRYPTION_MASTER_KEY=<secret>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NODE_ENV=production`} />

                <h2>Conclusion</h2>
                <p>BosDB is architected as a production-grade, scalable database management platform with security-first design, extensible architecture, and horizontal scalability.</p>
            </article>
        </div>
    );
}

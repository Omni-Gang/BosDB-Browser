# Railway Database Configuration Guide

This guide describes how to connect BosDB Browser directly to your Railway-hosted databases without using local Docker containers.

## Automatic Fixes (Railway Direct Mode)

BosDB now includes **Auto-Fix** logic to ensure your connections work even if they were misconfigured or imported from a local Docker environment:

1.  **Port Interceptor**: If a connection uses host `localhost` but is on a known Railway port (e.g., 18633 for Postgres), BosDB **automatically** redirects it to the correct Railway proxy (e.g., `crossover.proxy.rlwy.net`).
2.  **Auto-SSL**: Any connection targeting a Railway host (`rlwy.net`) will have SSL enabled automatically.
3.  **Read-Only Safety**: On platforms like Vercel, the application will automatically enter a read-only store mode to prevent crashes while remaining fully functional for database queries.

## Pre-Configured Connections

The following connections are injected into your dashboard by default:

- **Railway Postgres (Direct)**: crossover.proxy.rlwy.net:18633
- **Railway MySQL (Direct)**: maglev.proxy.rlwy.net:51411
- **Railway Redis (Direct)**: trolley.proxy.rlwy.net:17906
- **Railway CockroachDB (Direct)**: Placeholder (requires actual credentials)

## Provisioning

When you click "Provision" for a new database, BosDB will instantly return the Railway connection details instead of attempting to start a local Docker container.

## Troubleshooting

If you see `ECONNREFUSED` on `localhost`, ensure your terminal shows the following line during startup:
`[Store] Redirecting misconfigured host for conn_xxx: localhost -> crossover.proxy.rlwy.net`

This indicates that the Port Interceptor is working. If it still fails, please verify that your Railway Public Proxy is active.

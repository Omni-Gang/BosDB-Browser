# Installation Guide

## System Requirements
- **OS**: Windows, macOS, or Linux
- **Node.js**: v18.0.0 or higher
- **Docker**: Desktop or Engine (optional, for local database provisioning)
- **Memory**: 4GB RAM minimum (8GB recommended)

## Quick Install (Cloud/Web)
No installation required! Simply navigate to your deployed instance URL.

## Local Installation
Run BosDB on your own machine for development or local management.

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bosdb/bosdb-browser.git
   cd bosdb-browser
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Setup Environment**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Generate a secure encryption key for storing credentials:
   ```bash
   openssl rand -hex 32
   ```
   Add this key to your `.env.local`:
   ```properties
   ENCRYPTION_MASTER_KEY=your_generated_key_here
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```
   Access the app at `http://localhost:3000`.

## Docker Deployment
Run BosDB as a container:

```bash
docker run -p 3000:3000 -e ENCRYPTION_MASTER_KEY=your_key bosdb/browser
```

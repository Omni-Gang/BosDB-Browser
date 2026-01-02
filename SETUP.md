# BosDB Setup Guide

## Quick Start (Fresh System)

```bash
# 1. Clone the repository
git clone https://github.com/Omni-Gang/BosDB-Browser.git
cd BosDB-Browser

# 2. Install dependencies
npm install

# 3. Create environment file
cd apps/web
cp .env.example .env
# Edit .env and set: ENCRYPTION_MASTER_KEY=your-secret-key-here
cd ../..

# 4. Start development server
npm run dev
```

Open http://localhost:3001

---

## First Time Setup

### 1. Login
- Go to http://localhost:3001/login
- Register a new admin user (first user is auto-admin)
- Or login with default: `admin` / `Admin@123`

### 2. Activate Pro Trial (Optional)
- Go to `/pricing`
- Click "Start 1 Month Free Trial"
- All users get Pro features!

### 3. Connect a Database
- Go to Dashboard
- Click "New Connection"
- Enter your database details

---

## Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher

---

## What Gets Created (Per Company)

When you run BosDB, these files are created automatically:

```
apps/web/
├── .bosdb-users.json        # User accounts
├── .bosdb-subscription.json # Pro subscription status
├── .bosdb-connections.json  # Database connections
├── .bosdb-query-history.json # Query history
└── .bosdb-vcs/              # Version control data
```

These are **NOT** included in git - each company has their own!

---

## Deploy to Production

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
npm run build
npm start
```

---

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules
npm install
```

### Port 3001 already in use
```bash
# Use a different port
PORT=3002 npm run dev
```

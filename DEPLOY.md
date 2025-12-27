# BosDB Deployment Guide

## Quick Deploy with Docker

### Step 1: Start Everything
```bash
docker-compose up -d
```

This starts:
- **BosDB** at http://localhost:3000
- **PostgreSQL** at localhost:5432
- **MySQL** at localhost:3306
- **Redis** at localhost:6379

### Step 2: Login
1. Open http://localhost:3000
2. Click "Login"
3. Default admin: `admin` / `Admin@123`

### Step 3: Connect to Databases

**PostgreSQL (Demo):**
```
Host: demo-postgres (or localhost if outside Docker)
Port: 5432
Database: demodb
Username: postgres
Password: postgres123
```

**MySQL (Demo):**
```
Host: demo-mysql (or localhost if outside Docker)
Port: 3306
Database: demodb
Username: root
Password: mysql123
```

### Step 4: Activate Pro (Optional)
1. Go to Pricing (`/pricing`)
2. Click "Start 1 Month Free Trial"
3. All users now have Pro features!

---

## Deploy to Cloud

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Vercel
```bash
# Build command (set in Vercel dashboard)
npm run build

# Install command
npm install
```

**Note:** Vercel is frontend-only. You'll need external databases (AWS RDS, PlanetScale, etc.)

### DigitalOcean App Platform
1. Connect GitHub repo
2. Select "Web Service"
3. Build Command: `npm run build`
4. Run Command: `npm start`

---

## Connect to Your Databases

BosDB connects to **external databases**. You need:

### Cloud Database Options:
| Provider | PostgreSQL | MySQL | MongoDB |
|----------|------------|-------|---------|
| AWS RDS | ✅ | ✅ | ❌ |
| PlanetScale | ❌ | ✅ | ❌ |
| MongoDB Atlas | ❌ | ❌ | ✅ |
| Supabase | ✅ | ❌ | ❌ |
| Railway | ✅ | ✅ | ❌ |

### Example: Connect to AWS RDS
```
Host: mydb.abc123.us-east-1.rds.amazonaws.com
Port: 5432
Database: postgres
Username: admin
Password: your-rds-password
```

---

## Environment Variables

Create `.env` in `apps/web/`:
```env
ENCRYPTION_MASTER_KEY=your-32-char-secret-key-here
```

---

## Stop Everything
```bash
docker-compose down
```

## View Logs
```bash
docker-compose logs -f bosdb
```

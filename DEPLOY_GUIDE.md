# Step-by-Step Vercel Deployment Guide

## Part 1: Set Up Cloud Databases (15 minutes)

### Step 1: PostgreSQL - Neon.tech (3 minutes)

1. **Sign Up:**
   - Visit: https://neon.tech
   - Click "Sign Up"
   - Use GitHub/Google to sign up (fastest)

2. **Create Project:**
   - Click "Create Project"
   - Name: `bosdb-postgres`
   - Region: Choose closest to you (e.g., US East)
   - Click "Create Project"

3. **Get Connection Details:**
   ```
   Neon will show connection string like:
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb
   
   Extract:
   Host: ep-xxxxx.us-east-2.aws.neon.tech
   Port: 5432
   Database: neondb
   Username: username
   Password: password (copy this!)
   ```


4. **Save These Details** - You'll need them later!

---

### Step 2: MongoDB - Atlas (5 minutes)

1. **Sign Up:**
   - Visit: https://www.mongodb.com/cloud/atlas/register
   - Use Google/GitHub for quick signup

2. **Create Free Cluster:**
   - Choose "M0 Free" tier
   - Provider: AWS
   - Region: Closest to you
   - Cluster Name: `BosDB`
   - Click "Create Cluster" (takes 1-3 minutes)

3. **Create Database User:**
   - Go to "Database Access" (left sidebar)
   - Click "Add New Database User"
   - Username: `bosdb_user`
   - Password: Generate secure password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Whitelist IP Addresses:**
   - Go to "Network Access" (left sidebar)
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for Vercel)
   - IP: `0.0.0.0/0`
   - Click "Confirm"

5. **Get Connection String:**
   - Go back to "Database" → "Connect"
   - Click "Connect your application"
   - Driver: Node.js
   - Copy connection string (looks like):
   ```
   mongodb+srv://bosdb_user:<password>@bosdb.xxxxx.mongodb.net/
   
   Replace <password> with your actual password
   Extract:
   Host: bosdb.xxxxx.mongodb.net
   Port: 27017
   Username: bosdb_user
   Password: your-password
   Database: test
   ```

---

### Step 3: Redis - Upstash (2 minutes)

1. **Sign Up:**
   - Visit: https://upstash.com
   - Sign up with GitHub/Google

2. **Create Database:**
   - Click "Create Database"
   - Name: `bosdb-redis`
   - Type: Regional
   - Region: Closest to you
   - Click "Create"

3. **Get Connection Details:**
   - Click on your database
   - You'll see:
   ```
   Endpoint: us1-xxxxx.upstash.io
   Port: 6379
   Password: Your-Redis-Password
   ```

---

## Part 2: Prepare for Deployment (5 minutes)

### Step 4: Create .gitignore (if needed)

Make sure these are in your `.gitignore`:

```bash
# Add to .gitignore
echo "
# BosDB data files
.bosdb-connections.json
.bosdb-query-history.json
.bosdb-saved-queries.json
" >> .gitignore
```

### Step 5: Push to GitHub

```bash
# Initialize git (if not done)
cd /home/arushgupta/Desktop/BosDB
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Create GitHub repo (do this on GitHub.com first!)
# Then connect:
git remote add origin https://github.com/YOUR_USERNAME/BosDB.git
git branch -M main
git push -u origin main
```

**Create GitHub Repo:**
1. Go to: https://github.com/new
2. Repository name: `BosDB`
3. Visibility: Public or Private
4. Don't initialize with README
5. Click "Create repository"

---

## Part 3: Deploy to Vercel (5 minutes)

### Step 6: Deploy via Vercel Dashboard

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `BosDB`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Leave as `./`  
   - **Build and Output Settings:**
     - Build Command: Keep default or use: `npm run build`
     - Output Directory: Keep default
     - Install Command: Keep default

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   ```
   Name: ENCRYPTION_MASTER_KEY
   Value: [Generate using: openssl rand -base64 32]
   
   Name: NODE_ENV
   Value: production
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - You'll get URL: `bosdb-xxxxx.vercel.app`

---

## Part 4: Test Deployment (5 minutes)

### Step 7: Create Connections in Deployed App

1. **Open Deployed URL:**
   ```
   https://your-project.vercel.app
   ```

2. **Create PostgreSQL Connection:**
   - Click "New Connection"
   - Name: `Neon PostgreSQL`
   - Type: PostgreSQL
   - Host: `ep-xxxxx.us-east-2.aws.neon.tech` (from Step 1)
   - Port: `5432`
   - Database: `neondb`
   - Username: (from Step 1)
   - Password: (from Step 1)
   - Click "Create Connection"

3. **Test PostgreSQL:**
   - Click "Run Query"
   - Run: `SELECT version();`
   - Should see PostgreSQL version!

4. **Create MongoDB Connection:**
   - Name: `MongoDB Atlas`
   - Type: MongoDB
   - Host: `bosdb.xxxxx.mongodb.net` (from Step 2)
   - Port: `27017`
   - Database: `test`
   - Username: `bosdb_user`
   - Password: (from Step 2)

5. **Test MongoDB:**
   - Query:
   ```json
   {
     "find": "test",
     "limit": 1
   }
   ```

6. **Create Redis Connection:**
   - Name: `Upstash Redis`
   - Type: Redis
   - Host: `us1-xxxxx.upstash.io` (from Step 3)
   - Port: `6379`
   - Database: `0`
   - Password: (from Step 3)

7. **Test Redis:**
   - Query:
   ```json
   {
     "command": "PING"
   }
   ```
   - Should return `PONG`

---

## Troubleshooting

### Build Failed on Vercel

**Check Vercel Logs:**
- Go to Deployments → Click failed deployment → View logs

**Common fixes:**
```bash
# Make sure all packages build locally first
npm run build

# If successful locally, push again
git add .
git commit -m "Fix build"
git push
```

### Database Connection Timeout

**For MongoDB:**
- Check Network Access whitelist includes `0.0.0.0/0`
- Verify password has no special characters that need URL encoding

**For Neon:**
- Database may be sleeping (free tier)
- First query takes ~2 seconds to wake up
- Retry the query

**For Upstash:**
- Verify endpoint and password are correct
- Check database is active in Upstash dashboard

### Environment Variable Not Working

1. Vercel Dashboard → Settings → Environment Variables
2. Make sure ENCRYPTION_MASTER_KEY is set
3. Redeploy: Deployments → Click "..." → "Redeploy"

---

## Quick Command Reference

```bash
# Generate encryption key
openssl rand -base64 32

# Deploy via CLI (alternative)
npm install -g vercel
vercel login
vercel
vercel --prod

# Check deployment
vercel ls

# View logs
vercel logs
```

---

## Success Checklist

- [ ] Neon PostgreSQL account created
- [ ] MongoDB Atlas cluster created and configured
- [ ] Upstash Redis database created
- [ ] GitHub repository created and code pushed
- [ ] Vercel project deployed successfully
- [ ] Environment variables set in Vercel
- [ ] PostgreSQL connection tested in deployed app
- [ ] MongoDB connection tested in deployed app
- [ ] Redis connection tested in deployed app
- [ ] Query history working
- [ ] Saved queries working

---

## Cost Breakdown (All Free!)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Vercel | ✅ Free | Unlimited deployments, 100GB bandwidth |
| Neon | ✅ Free | 512MB storage, sleeps after inactivity |
| MongoDB Atlas | ✅ Free | 512MB storage, M0 cluster |
| Upstash | ✅ Free | 10K commands/day |

**Total: $0/month** 🎉

---

## Your Deployment URL

After deployment, share this URL:
```
https://your-project-name.vercel.app
```

**Congratulations! BosDB is now live! 🚀**

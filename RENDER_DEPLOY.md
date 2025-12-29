# BosDB-Browser - Render Deployment Guide

## 🚀 Why Render for BosDB-Browser?

Render is **ideal** for your project because:

✅ **Full Docker Support** - Deploy your existing Dockerfile directly  
✅ **Persistent Storage** - Keep database data with persistent disks  
✅ **Background Services** - Run containers 24/7  
✅ **Docker in Docker** - Can run `dockerode` for database management  
✅ **Free Tier** - 750 hours/month compute time  

---

## 📋 Quick Deployment Steps

### Method 1: Using Render Dashboard (Recommended)

#### 1. Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

#### 2. Sign Up / Login to Render

1. Go to [render.com](https://render.com)
2. Sign up or login (can use GitHub account)

#### 3. Create a New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Omni-Gang/BosDB-Browser`
3. Grant Render access to the repository

#### 4. Configure Service Settings

**Basic Settings:**
- **Name:** `bosdb-browser`
- **Region:** Choose closest to your users (e.g., `Oregon`, `Frankfurt`)
- **Branch:** `main`
- **Runtime:** `Docker`
- **Dockerfile Path:** `./Dockerfile`
- **Docker Context:** `./`

**Build Settings:**
- **Docker Command:** (Leave empty, uses CMD from Dockerfile)

**Instance Settings:**
- **Plan:** `Free` (or upgrade later)
- **Auto-Deploy:** `Yes` (auto-deploy on git push)

#### 5. Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `ENCRYPTION_MASTER_KEY` | `[generate secure key]` | See below |
| `PORT` | `3000` | Render requires this |

**Generate Secure Key:**
```bash
# Generate a secure 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 6. Deploy!

1. Click **"Create Web Service"**
2. Watch build logs (takes 5-10 minutes first time)
3. Get your URL: `https://bosdb-browser.onrender.com`

---

## 🔧 Method 2: Using render.yaml (Blueprint)

For automated deployment with infrastructure-as-code:

1. **Use the included `render.yaml`** in root directory

2. **Create Blueprint:**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click **"New +"** → **"Blueprint"**
   - Select your repository
   - Render will auto-detect `render.yaml`
   - Review configuration
   - Click **"Apply"**

3. **Update Environment Variables:**
   - Navigate to the created service
   - Settings → Environment
   - Update `ENCRYPTION_MASTER_KEY` with your secure key

---

## 🗄️ Database Setup Options

### Option 1: Demo Databases in Docker (Included)

Your Docker setup includes demo databases:
- PostgreSQL (port 5432)
- MySQL (port 3306)
- Redis (port 6379)

**Note:** On Render free tier, these will be in the same container. For production, consider external databases.

### Option 2: External Managed Databases

For better performance and reliability:

**PostgreSQL:**
- [Neon](https://neon.tech) - Serverless PostgreSQL (Free tier: 512MB)
- [Supabase](https://supabase.com) - PostgreSQL + extras (Free tier: 500MB)
- Render PostgreSQL - Managed database

**MySQL:**
- [PlanetScale](https://planetscale.com) - Serverless MySQL (Free tier: 5GB)
- AWS RDS Free Tier

**MongoDB:**
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Free tier: 512MB

**Redis:**
- [Upstash](https://upstash.com) - Serverless Redis (Free tier: 10K commands/day)

---

## 🔒 Important Configuration

### Update Next.js Config for Standalone Build

Make sure `apps/web/next.config.js` has:

```javascript
module.exports = {
  output: 'standalone', // Required for Docker
  // ... other config
}
```

### Dockerfile Optimization

Your Dockerfile is already optimized with:
- ✅ Multi-stage build (reduces image size)
- ✅ Standalone output
- ✅ Production NODE_ENV
- ✅ Persistent data directory

---

## ⚙️ Render-Specific Considerations

### Free Tier Limitations

- **Sleep after inactivity:** Services sleep after 15 minutes of no requests
- **First request slow:** Takes 30-60s to wake up from sleep
- **750 hours/month:** ~31 days if always running, but sleeps prevent this
- **Build time:** 15 minute maximum
- **RAM:** 512 MB
- **CPU:** 0.5 CPU cores

### Upgrade to Paid Plan for:
- No sleep/downtime
- More RAM/CPU
- Custom domains
- Faster builds

---

## 🧪 Testing Your Deployment

After deployment completes:

### 1. Check Deployment Status

- Render Dashboard → Your Service → Logs
- Look for: `✓ Ready in XXXms`

### 2. Access Your App

Visit: `https://bosdb-browser.onrender.com`

### 3. Test Connection

1. Login to BosDB-Browser
2. Create a new database connection:
   - **For external DB:** Use cloud database credentials
   - **For demo DB:** Won't work on Render free tier (Docker-in-Docker limitations)

### 4. Monitor Logs

```bash
# Via Render CLI (optional)
npm install -g render-cli
render login
render logs bosdb-browser
```

---

## 🐛 Common Issues & Solutions

### Build Fails: "Out of Memory"

**Solution:** 
- Optimize your build process
- Consider paid plan with more RAM
- Split into multiple services

### Service Won't Start

**Error:** `Application failed to respond`

**Solution:**
- Check environment variables are set
- Verify `PORT` is set to `3000`
- Check logs for errors

### Database Connection Issues

**Error:** `ECONNREFUSED` or connection timeout

**Solution:**
- Render free tier has limited Docker-in-Docker support
- Use external managed databases (Neon, Atlas, etc.)
- For demo databases, use docker-compose locally only

### Slow Cold Starts

**Issue:** First request takes 30-60s

**Solution:**
- Free tier limitation - service sleeps after 15 min inactivity
- Upgrade to paid plan ($7/month) for always-on service
- Or set up a cron job to ping service every 10 minutes

---

## 🔄 CI/CD - Auto Deploy on Git Push

Render automatically deploys when you push to your connected branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Render will automatically:
# 1. Detect the push
# 2. Build new Docker image
# 3. Deploy updated service
# 4. Zero-downtime deployment
```

---

## 📊 Monitoring & Logs

### View Logs

**Via Dashboard:**
- Render Dashboard → Service → Logs
- Real-time streaming logs
- Filter by time range

**Via CLI:**
```bash
render logs bosdb-browser --tail
```

### Metrics

Render provides:
- CPU usage
- Memory usage  
- Request count
- Response times
- Bandwidth usage

Access: Dashboard → Service → Metrics

---

## 🌐 Custom Domain (Optional)

### Add Your Domain

1. Go to Service → Settings → Custom Domains
2. Click **"Add Custom Domain"**
3. Enter: `bosdb.yourdomain.com`
4. Add DNS records (Render provides instructions):
   ```
   Type: CNAME
   Name: bosdb
   Value: your-service.onrender.com
   ```
5. SSL certificate is automatic and free

---

## 💰 Cost Estimate

### Free Tier
- ✅ Web Service: Free (with sleep)
- ✅ 750 hours/month compute
- ✅ 100GB bandwidth
- ✅ Automatic SSL
- ✅ DDoS protection

**Total: $0/month**

### Starter (Recommended for Production)
- Web Service (Basic): $7/month
  - Always-on (no sleep)
  - 512MB RAM, 0.5 CPU
- PostgreSQL Starter: $7/month (if using managed DB)

**Total: ~$7-14/month**

---

## 🔐 Security Checklist

Before deploying:

- [ ] Strong `ENCRYPTION_MASTER_KEY` set (32+ random characters)
- [ ] Environment variables are encrypted in Render
- [ ] `.env` files not committed to git
- [ ] `.gitignore` includes sensitive files
- [ ] Database passwords are strong
- [ ] SSL/TLS enabled (automatic on Render)
- [ ] Rate limiting configured (if needed)

---

## 📝 Next Steps After Deployment

1. ✅ Test all features on deployed app
2. ✅ Set up external databases if needed
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring/alerts
5. ✅ Document connection credentials
6. ✅ Share deployment URL with team

---

## 🆘 Support Resources

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Render Status:** https://status.render.com
- **BosDB Issues:** https://github.com/Omni-Gang/BosDB-Browser/issues

---

## 🎉 Your Deployment URLs

After deployment, you'll have:

- **Web App:** `https://bosdb-browser.onrender.com`
- **API Endpoints:** `https://bosdb-browser.onrender.com/api/*`
- **Health Check:** `https://bosdb-browser.onrender.com/api/health`

**🚀 Ready to deploy! Follow the steps above and your app will be live in minutes!**

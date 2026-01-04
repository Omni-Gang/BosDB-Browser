# Deploy PostgreSQL Database on Koyeb

## Quick Deployment Guide

This will deploy a PostgreSQL database on Koyeb that your BosDB project can connect to.

---

## Method 1: Koyeb Dashboard (Easiest - 3 Minutes)

### Step 1: Login to Koyeb
Go to https://app.koyeb.com and login

### Step 2: Create New Service
1. Click **"Create Service"**
2. Select **"Docker"** as source
3. Choose **"Public Docker Registry"**

### Step 3: Configure PostgreSQL

**Docker Image**: 
```
postgres:15-alpine
```

**Service Name**: 
```
demo-postgres
```

**Port Configuration**:
- **Internal Port**: `5432`
- **Protocol**: `TCP`
- **Expose**: `Public` ✅ (Important - makes it accessible from outside)

### Step 4: Environment Variables

Click **"Add Environment Variable"** and add these:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `POSTGRES_USER` | `bosdb_user` | Database username |
| `POSTGRES_PASSWORD` | `SecurePassword123!` | Database password (change this!) |
| `POSTGRES_DB` | `demo_database` | Database name |

### Step 5: Advanced Settings

**Persistent Storage** (Optional):
- Koyeb doesn't have persistent volumes yet
- Data will reset on restart
- For persistent data, use managed PostgreSQL (see Method 3)

**Instance Type**:
- **Free Tier**: Nano (512MB) - Good for testing
- **Paid**: Small (1GB) - Better for production

**Health Check**:
- **Type**: TCP
- **Port**: 5432
- **Initial Delay**: 10 seconds

### Step 6: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Koyeb will provide a public URL and connection details

---

## Method 2: Koyeb CLI

```bash
# Install Koyeb CLI
npm install -g @koyeb/koyeb-cli

# Login
koyeb login

# Deploy PostgreSQL
koyeb service create demo-postgres \
  --docker=postgres:15-alpine \
  --ports=5432:tcp \
  --env=POSTGRES_USER=bosdb_user \
  --env=POSTGRES_PASSWORD=SecurePassword123! \
  --env=POSTGRES_DB=demo_database \
  --regions=was \
  --instance-type=nano

# Get connection details
koyeb service get demo-postgres
```

---

## Connection Details

After deployment, Koyeb will provide:

### Public Endpoint
```
demo-postgres-your-org.koyeb.app:5432
```

### Connection String for BosDB
```
Host: demo-postgres-your-org.koyeb.app
Port: 5432
Database: demo_database
Username: bosdb_user
Password: SecurePassword123!
SSL: Required ✅
```

### PostgreSQL Connection URI
```
postgresql://bosdb_user:SecurePassword123!@demo-postgres-your-org.koyeb.app:5432/demo_database?sslmode=require
```

---

## Method 3: Use Managed PostgreSQL (Recommended for Production)

Instead of deploying PostgreSQL yourself, use a managed service:

### Option A: Railway.app (Free Tier Available)
1. Go to https://railway.app
2. Click "New Project" → "Provision PostgreSQL"
3. Get connection details
4. Use in BosDB

**Connection String**:
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

### Option B: Neon.tech (Free Tier Available)
1. Go to https://neon.tech
2. Create project
3. Copy connection string
4. Use in BosDB

**Connection String**:
```
postgresql://user:pass@ep-name-123.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Option C: Supabase (Free Tier Available)
1. Go to https://supabase.com
2. Create project
3. Get database connection from Settings → Database
4. Use in BosDB

**Connection String**:
```
postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

---

## Testing the Connection

### From Your Local Machine

```bash
# Using psql (PostgreSQL client)
psql "postgresql://bosdb_user:SecurePassword123!@demo-postgres-your-org.koyeb.app:5432/demo_database?sslmode=require"

# Or using Docker
docker run --rm -it postgres:15-alpine psql "postgresql://bosdb_user:SecurePassword123!@demo-postgres-your-org.koyeb.app:5432/demo_database?sslmode=require"
```

### From BosDB

1. Open your deployed BosDB
2. Go to Dashboard
3. Click "Add Connection"
4. Fill in:
   - **Name**: Demo PostgreSQL
   - **Type**: PostgreSQL
   - **Host**: `demo-postgres-your-org.koyeb.app`
   - **Port**: `5432`
   - **Database**: `demo_database`
   - **Username**: `bosdb_user`
   - **Password**: `SecurePassword123!`
   - **SSL**: ✅ Enable

5. Click "Test Connection"
6. If successful, click "Save"

---

## Populate with Sample Data

Once connected, you can add sample data:

```sql
-- Create a sample table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email) VALUES
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Johnson', 'bob@example.com');

-- Create another table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    price DECIMAL(10,2),
    stock INTEGER
);

-- Insert products
INSERT INTO products (name, price, stock) VALUES
    ('Laptop', 999.99, 15),
    ('Mouse', 29.99, 50),
    ('Keyboard', 79.99, 30);
```

---

## Important Notes

### ⚠️ Data Persistence on Koyeb

**Koyeb PostgreSQL Container**:
- ❌ Data is **NOT persistent** on container restart
- ❌ All data will be **lost** when container restarts
- ✅ Good for: **Demo, testing, temporary databases**
- ❌ Bad for: **Production, important data**

**For Persistent Data**:
Use managed PostgreSQL services (Railway, Neon, Supabase, etc.)

### 🔒 Security

1. **Change Default Password!**
   - Don't use `SecurePassword123!` in production
   - Use strong, random passwords

2. **SSL/TLS**
   - Always use SSL for connections
   - Add `?sslmode=require` to connection strings

3. **Firewall** (If Available)
   - Koyeb doesn't have IP whitelisting yet
   - Anyone with credentials can connect
   - Use strong passwords!

### 💰 Cost

**Free Tier**:
- 1 nano instance (512MB)
- Good for testing
- Data not persistent

**Paid Plans**:
- Small: $5/month
- Medium: $10/month
- Still not persistent - use managed DB instead

---

## Recommended Approach for Production

**For Testing/Demo**:
✅ Deploy PostgreSQL on Koyeb (as shown above)

**For Production**:
✅ Use managed PostgreSQL:
1. **Neon.tech** - Free tier, serverless, auto-sleep
2. **Railway.app** - $5/month, simple, reliable
3. **Supabase** - Free tier, includes auth and storage
4. **AWS RDS** - Enterprise-grade, expensive

---

## Quick Start Commands

### Deploy PostgreSQL on Koyeb (CLI)
```bash
koyeb service create demo-postgres \
  --docker=postgres:15-alpine \
  --ports=5432:tcp \
  --env=POSTGRES_USER=bosdb_user \
  --env=POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD \
  --env=POSTGRES_DB=demo_database \
  --regions=was \
  --instance-type=nano
```

### Get Connection Details
```bash
koyeb service get demo-postgres
```

### View Logs
```bash
koyeb service logs demo-postgres --follow
```

### Delete Service
```bash
koyeb service delete demo-postgres
```

---

## Next Steps

1. ✅ Deploy PostgreSQL on Koyeb (or use managed service)
2. ✅ Get connection details
3. ✅ Test connection from local machine
4. ✅ Add connection in deployed BosDB
5. ✅ Populate with sample data
6. ✅ Test queries in BosDB

**Ready to deploy!** 🚀

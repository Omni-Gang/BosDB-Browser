# Railway Database Deployment Script
# Run this script to deploy all databases to Railway at once

Write-Host "=== BosDB Database Deployment ===" -ForegroundColor Cyan

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

Write-Host "Login to Railway first..." -ForegroundColor Yellow
railway login

# Get project
Write-Host "Linking to Railway project..." -ForegroundColor Yellow
railway link

# Database configurations
$databases = @(
    @{ name = "postgres"; image = "postgres:16-alpine"; port = "5432" },
    @{ name = "mysql"; image = "mysql:8.0"; port = "3306" },
    @{ name = "mongodb"; image = "mongo:7"; port = "27017" },
    @{ name = "redis"; image = "redis:7-alpine"; port = "6379" },
    @{ name = "cassandra"; image = "cassandra:5"; port = "9042" },
    @{ name = "neo4j"; image = "neo4j:5-community"; port = "7687" },
    @{ name = "elasticsearch"; image = "elasticsearch:8.11.0"; port = "9200" },
    @{ name = "clickhouse"; image = "clickhouse/clickhouse-server:latest"; port = "8123" }
)

Write-Host "`nDeploying databases..." -ForegroundColor Cyan

foreach ($db in $databases) {
    Write-Host "`n>> Deploying $($db.name)..." -ForegroundColor Green
    
    # Create new service with Docker image
    # Note: Railway CLI doesn't support direct Docker image deployment
    # You need to do this via the dashboard
    
    Write-Host "   Image: $($db.image)"
    Write-Host "   Port: $($db.port)"
}

Write-Host "`n=== MANUAL STEPS REQUIRED ===" -ForegroundColor Yellow
Write-Host @"

Railway CLI doesn't support Docker image deployment directly.
Go to https://railway.app/dashboard and for each database:

1. Click 'New' -> 'Docker Image'
2. Enter the image name
3. Add required ports
4. Deploy

Database images to deploy:
- postgres:16-alpine (port 5432)
- mysql:8.0 (port 3306)
- mongo:7 (port 27017)
- redis:7-alpine (port 6379)
- cassandra:5 (port 9042)
- neo4j:5-community (port 7687)
- elasticsearch:8.11.0 (port 9200)
- clickhouse/clickhouse-server:latest (port 8123)

"@

Write-Host "After deploying, share the connection URLs and I'll update the app!" -ForegroundColor Cyan

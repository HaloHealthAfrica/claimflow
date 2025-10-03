# Complete Railway deployment script for ClaimFlow
param(
    [switch]$SetupDB,
    [switch]$Migrate,
    [switch]$Seed
)

Write-Host "🚀 ClaimFlow Railway Deployment Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Railway CLI is installed
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    npm install -g @railway/cli
}

# Check if user is logged in
try {
    $user = railway whoami 2>$null
    Write-Host "✅ Logged in as: $user" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway. Please login first:" -ForegroundColor Red
    Write-Host "railway login" -ForegroundColor Yellow
    exit 1
}

# Initialize Railway project if needed
if (-not (Test-Path ".railway")) {
    Write-Host "📁 Initializing Railway project..." -ForegroundColor Blue
    railway init
}

# Add PostgreSQL database if requested
if ($SetupDB) {
    Write-Host "🗄️  Adding PostgreSQL database..." -ForegroundColor Blue
    railway add postgresql
    Start-Sleep -Seconds 5  # Wait for database to be ready
}

# Set essential environment variables
Write-Host "🔧 Setting up environment variables..." -ForegroundColor Blue

# Generate a secure secret if not provided
$secret = [System.Web.Security.Membership]::GeneratePassword(32, 8)
railway variables set NEXTAUTH_SECRET="$secret"
railway variables set NODE_ENV="production"

# Get the Railway URL
try {
    $railwayUrl = railway status --json | ConvertFrom-Json | Select-Object -ExpandProperty deployments | Select-Object -First 1 -ExpandProperty url
    if ($railwayUrl) {
        railway variables set NEXTAUTH_URL="https://$railwayUrl"
        Write-Host "✅ Set NEXTAUTH_URL to: https://$railwayUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not auto-detect Railway URL. Please set NEXTAUTH_URL manually." -ForegroundColor Yellow
}

# Deploy the application
Write-Host "🚀 Deploying application..." -ForegroundColor Blue
railway up --detach

# Wait for deployment
Write-Host "⏳ Waiting for deployment to complete..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Run database migrations if requested
if ($Migrate) {
    Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
    railway run npx prisma migrate deploy
}

# Seed database if requested
if ($Seed) {
    Write-Host "🌱 Seeding database..." -ForegroundColor Blue
    railway run npx prisma db seed
}

# Get deployment status
Write-Host "📊 Checking deployment status..." -ForegroundColor Blue
railway status

# Get the application URL
try {
    $appUrl = railway status --json | ConvertFrom-Json | Select-Object -ExpandProperty deployments | Select-Object -First 1 -ExpandProperty url
    if ($appUrl) {
        Write-Host ""
        Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
        Write-Host "🌐 Application URL: https://$appUrl" -ForegroundColor Cyan
        Write-Host "🏥 Health Check: https://$appUrl/api/health" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Could not retrieve application URL. Check Railway dashboard." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Post-deployment checklist:" -ForegroundColor Yellow
Write-Host "1. ✅ Application deployed to Railway" -ForegroundColor White
Write-Host "2. ✅ Environment variables configured" -ForegroundColor White
if ($SetupDB) { Write-Host "3. ✅ PostgreSQL database added" -ForegroundColor White }
if ($Migrate) { Write-Host "4. ✅ Database migrations completed" -ForegroundColor White }
if ($Seed) { Write-Host "5. ✅ Database seeded" -ForegroundColor White }

Write-Host ""
Write-Host "🔧 Additional setup needed:" -ForegroundColor Yellow
Write-Host "1. Configure optional services (OpenAI, AWS, SendGrid)" -ForegroundColor White
Write-Host "2. Set up custom domain (optional)" -ForegroundColor White
Write-Host "3. Configure monitoring and alerts" -ForegroundColor White

Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "railway logs          # View application logs" -ForegroundColor White
Write-Host "railway open          # Open application in browser" -ForegroundColor White
Write-Host "railway shell         # Access application shell" -ForegroundColor White
Write-Host "railway connect postgresql  # Connect to database" -ForegroundColor White

Write-Host ""
Write-Host "🎉 ClaimFlow is now live on Railway!" -ForegroundColor Green
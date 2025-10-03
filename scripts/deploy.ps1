# ClaimFlow Railway Deployment Script for Windows PowerShell
param(
    [switch]$Migrate
)

Write-Host "🚀 Starting ClaimFlow deployment to Railway..." -ForegroundColor Green

# Check if Railway CLI is installed
try {
    railway --version | Out-Null
} catch {
    Write-Host "❌ Railway CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Railway
try {
    railway whoami | Out-Null
} catch {
    Write-Host "❌ Not logged in to Railway. Please run 'railway login' first." -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "📦 Building the application..." -ForegroundColor Blue
npm run build

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
npx prisma generate

# Run database migrations (if needed)
if ($Migrate) {
    Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
    npx prisma migrate deploy
}

# Deploy to Railway
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Blue
railway up

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Your application should be available at your Railway domain." -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Post-deployment checklist:" -ForegroundColor Yellow
Write-Host "1. Set up environment variables in Railway dashboard"
Write-Host "2. Configure your custom domain (if needed)"
Write-Host "3. Set up database (PostgreSQL addon)"
Write-Host "4. Run database migrations: railway run npx prisma migrate deploy"
Write-Host "5. Seed the database: railway run npx prisma db seed"
Write-Host "6. Test the health endpoint: /api/health"
Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "  railway logs        - View application logs"
Write-Host "  railway shell       - Access application shell"
Write-Host "  railway status      - Check deployment status"
Write-Host "  railway open        - Open application in browser"
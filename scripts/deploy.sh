#!/bin/bash

# ClaimFlow Railway Deployment Script
set -e

echo "🚀 Starting ClaimFlow deployment to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run 'railway login' first."
    exit 1
fi

# Build the application
echo "📦 Building the application..."
npm run build

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations (if needed)
echo "🗄️  Running database migrations..."
if [ "$1" = "--migrate" ]; then
    npx prisma migrate deploy
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be available at your Railway domain."
echo ""
echo "📋 Post-deployment checklist:"
echo "1. Set up environment variables in Railway dashboard"
echo "2. Configure your custom domain (if needed)"
echo "3. Set up database (PostgreSQL addon)"
echo "4. Run database migrations: railway run npx prisma migrate deploy"
echo "5. Seed the database: railway run npx prisma db seed"
echo "6. Test the health endpoint: /api/health"
echo ""
echo "🔗 Useful commands:"
echo "  railway logs        - View application logs"
echo "  railway shell       - Access application shell"
echo "  railway status      - Check deployment status"
echo "  railway open        - Open application in browser"
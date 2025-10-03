# Deploy ClaimFlow from GitHub to Railway

This guide will help you deploy your ClaimFlow application from the GitHub repository to Railway.

## 🚀 Quick Deploy Options

### Option 1: One-Click Deploy (Recommended)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/claimflow?referralCode=workscalable)

### Option 2: Deploy from GitHub Repository
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `workscalable/claimflow`
5. Railway will automatically detect and deploy your Next.js app

### Option 3: CLI Deployment
Follow the steps below for manual CLI deployment.

## 📋 Step-by-Step CLI Deployment

### 1. Prerequisites
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- Git repository pushed to GitHub
- Railway account

### 2. Install Railway CLI
```bash
# Using npm
npm install -g @railway/cli

# Using curl (macOS/Linux)
curl -fsSL https://railway.app/install.sh | sh

# Using PowerShell (Windows)
iwr https://railway.app/install.ps1 | iex
```

### 3. Login to Railway
```bash
railway login
```

### 4. Clone and Setup (if not already done)
```bash
git clone https://github.com/workscalable/claimflow.git
cd claimflow
```

### 5. Deploy Using Scripts

**Windows PowerShell:**
```powershell
# Setup Git and push to GitHub (if needed)
.\scripts\git-setup.ps1

# Deploy to Railway with full setup
.\scripts\railway-deploy.ps1 -SetupDB -Migrate -Seed
```

**macOS/Linux:**
```bash
# Setup Git and push to GitHub (if needed)
chmod +x scripts/*.sh
./scripts/git-setup.sh

# Deploy to Railway with full setup
./scripts/deploy.sh --migrate
```

### 6. Manual CLI Steps (Alternative)
```bash
# Initialize Railway project
railway init

# Add PostgreSQL database
railway add postgresql

# Set environment variables
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set NODE_ENV="production"

# Deploy application
railway up

# Run database migrations
railway run npx prisma migrate deploy

# Seed database (optional)
railway run npx prisma db seed
```

## 🔧 Environment Variables Setup

### Required Variables
Set these in Railway dashboard or via CLI:

```bash
# Authentication (Railway will set DATABASE_URL automatically)
railway variables set NEXTAUTH_SECRET="your-32-character-secret"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
railway variables set NODE_ENV="production"
```

### Optional Variables (for full functionality)
```bash
# OpenAI for AI features
railway variables set OPENAI_API_KEY="sk-your-openai-key"
railway variables set OPENAI_MODEL="gpt-4"

# AWS for file uploads
railway variables set AWS_ACCESS_KEY_ID="AKIA..."
railway variables set AWS_SECRET_ACCESS_KEY="your-secret"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET="claimflow-uploads"

# SendGrid for email notifications
railway variables set SENDGRID_API_KEY="SG..."
railway variables set SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Google Cloud for OCR
railway variables set GOOGLE_CLOUD_PROJECT_ID="your-project"
railway variables set GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
railway variables set GOOGLE_CLOUD_CLIENT_EMAIL="service@project.iam.gserviceaccount.com"
```

## 🗄️ Database Setup

Railway automatically provides PostgreSQL when you add it:

```bash
# Add PostgreSQL service
railway add postgresql

# Run migrations
railway run npx prisma migrate deploy

# Seed database with sample data
railway run npx prisma db seed

# Connect to database (optional)
railway connect postgresql
```

## ✅ Verification Steps

### 1. Check Deployment Status
```bash
railway status
```

### 2. View Application Logs
```bash
railway logs
```

### 3. Test Health Endpoint
Visit: `https://your-app.railway.app/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "uptime": 123.45
}
```

### 4. Test Application
Visit: `https://your-app.railway.app`

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)
```bash
# Add custom domain
railway domain add yourdomain.com

# Or via dashboard: Project Settings → Domains
```

### 2. Environment-Specific Settings
```bash
# Production optimizations
railway variables set NEXT_TELEMETRY_DISABLED="1"
railway variables set PORT="3000"
```

### 3. Monitoring Setup
- Enable Railway metrics in dashboard
- Set up error tracking (optional)
- Configure alerts for downtime

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
railway logs --deployment

# Common fixes:
railway variables set NODE_VERSION="18"
railway variables set NPM_CONFIG_PRODUCTION="false"
```

#### 2. Database Connection Issues
```bash
# Verify DATABASE_URL is set
railway variables

# Check database status
railway status

# Reconnect database
railway add postgresql
```

#### 3. Environment Variable Issues
```bash
# List all variables
railway variables

# Check for missing required variables
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set NEXTAUTH_URL="https://$(railway status --json | jq -r '.deployments[0].url')"
```

#### 4. Migration Failures
```bash
# Reset and re-run migrations
railway run npx prisma migrate reset --force
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

### Getting Help
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/workscalable/claimflow/issues

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Real-time logs
railway logs --tail

# Deployment logs
railway logs --deployment

# Filter logs
railway logs --filter="ERROR"
```

### Performance Monitoring
```bash
# Check resource usage
railway status

# View metrics in Railway dashboard
railway open --dashboard
```

### Database Maintenance
```bash
# Backup database (via Railway dashboard)
# Monitor query performance
# Scale database if needed
```

## 🔄 Updates & Redeployment

### Automatic Deployments
Railway automatically deploys when you push to your main branch on GitHub.

### Manual Redeployment
```bash
# Redeploy current version
railway up

# Deploy specific branch
railway up --branch feature-branch

# Deploy with environment
railway up --environment production
```

### Rolling Back
```bash
# View deployment history
railway deployments

# Rollback to previous deployment
railway rollback [deployment-id]
```

## 💰 Cost Optimization

### Monitor Usage
- Check Railway dashboard for resource usage
- Monitor database size and queries
- Optimize build times

### Scaling Recommendations
- Start with Hobby plan ($5/month)
- Upgrade to Pro when needed
- Monitor and optimize resource usage

## 🔐 Security Checklist

- [ ] All environment variables set securely
- [ ] Database access restricted
- [ ] HTTPS enabled (automatic with Railway)
- [ ] Security headers configured (done in next.config.ts)
- [ ] Audit logging enabled
- [ ] Regular security updates

---

## 🎉 Success!

Your ClaimFlow application should now be running on Railway! 

**Next Steps:**
1. Configure optional services (OpenAI, AWS, etc.)
2. Set up custom domain
3. Configure monitoring and alerts
4. Test all functionality
5. Share with your team!

**Application URLs:**
- **Main App**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/api/health`
- **API Docs**: `https://your-app.railway.app/api/docs` (if configured)

For ongoing support, check the [Railway documentation](https://docs.railway.app) or create an issue in the [GitHub repository](https://github.com/workscalable/claimflow/issues).
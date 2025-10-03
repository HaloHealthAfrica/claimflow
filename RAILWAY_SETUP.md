# Railway Deployment Setup for ClaimFlow

## Step-by-Step Deployment Guide

### 1. Prerequisites Setup

**Install Railway CLI:**
```bash
npm install -g @railway/cli
```

**Login to Railway:**
```bash
railway login
```

### 2. Project Initialization

**Initialize Railway project:**
```bash
railway init
```

**Link to existing project (if you have one):**
```bash
railway link [project-id]
```

### 3. Database Setup

**Add PostgreSQL database:**
```bash
railway add postgresql
```

This will automatically:
- Create a PostgreSQL instance
- Set the `DATABASE_URL` environment variable
- Connect it to your application

### 4. Environment Variables Configuration

Set these in Railway dashboard or via CLI:

**Required Variables:**
```bash
railway variables set NEXTAUTH_SECRET="your-long-random-secret-key"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
railway variables set NODE_ENV="production"
```

**Optional Variables (for full functionality):**
```bash
# OpenAI for AI features
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set OPENAI_MODEL="gpt-4"

# AWS for file uploads
railway variables set AWS_ACCESS_KEY_ID="your-aws-key"
railway variables set AWS_SECRET_ACCESS_KEY="your-aws-secret"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET="your-bucket-name"

# SendGrid for emails
railway variables set SENDGRID_API_KEY="your-sendgrid-key"
railway variables set SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
```

### 5. Deploy Application

**Deploy using script (recommended):**
```bash
# Windows PowerShell
.\scripts\deploy.ps1

# macOS/Linux
./scripts/deploy.sh
```

**Or deploy manually:**
```bash
railway up
```

### 6. Database Migration

**Run migrations:**
```bash
railway run npx prisma migrate deploy
```

**Seed database (optional):**
```bash
railway run npx prisma db seed
```

### 7. Verification

**Check health endpoint:**
```
https://your-app.railway.app/api/health
```

**View logs:**
```bash
railway logs
```

## Environment Variables Reference

### Core Application
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | Auto-set by Railway |
| `NEXTAUTH_SECRET` | ✅ | NextAuth.js secret key | `your-secret-key` |
| `NEXTAUTH_URL` | ✅ | Application URL | `https://app.railway.app` |
| `NODE_ENV` | ✅ | Environment | `production` |

### AI Features (Optional)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ❌ | OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | ❌ | OpenAI model | `gpt-4` |
| `OPENAI_MAX_TOKENS` | ❌ | Max tokens per request | `2000` |

### File Storage (Optional)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | ❌ | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | ❌ | AWS secret key | `...` |
| `AWS_REGION` | ❌ | AWS region | `us-east-1` |
| `AWS_S3_BUCKET` | ❌ | S3 bucket name | `claimflow-uploads` |

### Email Notifications (Optional)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SENDGRID_API_KEY` | ❌ | SendGrid API key | `SG...` |
| `SENDGRID_FROM_EMAIL` | ❌ | From email address | `noreply@domain.com` |

### OCR Services (Optional)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | ❌ | Google Cloud project | `my-project` |
| `GOOGLE_CLOUD_PRIVATE_KEY` | ❌ | Service account key | `-----BEGIN...` |
| `GOOGLE_CLOUD_CLIENT_EMAIL` | ❌ | Service account email | `service@project.iam...` |

## Railway Commands Cheat Sheet

### Deployment
```bash
railway up                    # Deploy application
railway up --detach          # Deploy without watching logs
railway deploy               # Alternative deploy command
```

### Monitoring
```bash
railway logs                 # View application logs
railway logs --tail         # Follow logs in real-time
railway status              # Check deployment status
railway ps                  # List running services
```

### Database
```bash
railway connect postgresql   # Connect to database
railway run <command>       # Run command in production
railway shell              # Access application shell
```

### Variables
```bash
railway variables           # List all variables
railway variables set KEY=value  # Set variable
railway variables delete KEY     # Delete variable
```

### Project Management
```bash
railway open                # Open app in browser
railway domain              # Manage custom domains
railway whoami              # Check logged-in user
railway logout              # Logout from Railway
```

## Troubleshooting Common Issues

### 1. Build Failures

**Issue:** Build fails with dependency errors
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
railway up
```

### 2. Database Connection Issues

**Issue:** Cannot connect to database
**Solution:**
```bash
# Check if PostgreSQL service is running
railway ps

# Verify DATABASE_URL is set
railway variables

# Run migrations
railway run npx prisma migrate deploy
```

### 3. Environment Variable Issues

**Issue:** Application not working due to missing env vars
**Solution:**
```bash
# List current variables
railway variables

# Set missing variables
railway variables set NEXTAUTH_SECRET="your-secret"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
```

### 4. Memory/Performance Issues

**Issue:** Application running out of memory
**Solution:**
- Upgrade Railway plan
- Optimize application code
- Check for memory leaks in logs

### 5. Domain/SSL Issues

**Issue:** Custom domain not working
**Solution:**
```bash
# Check domain configuration
railway domain

# Verify DNS settings
# Wait for SSL certificate provisioning (can take up to 24 hours)
```

## Production Checklist

### Before Deployment
- [ ] All environment variables configured
- [ ] Database migrations ready
- [ ] Build process tested locally
- [ ] Security headers configured
- [ ] Error monitoring set up

### After Deployment
- [ ] Health endpoint responding
- [ ] Database connected and migrated
- [ ] Authentication working
- [ ] File uploads working (if configured)
- [ ] Email notifications working (if configured)
- [ ] AI features working (if configured)
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Monitoring and alerts set up

### Ongoing Maintenance
- [ ] Monitor application logs
- [ ] Check performance metrics
- [ ] Update dependencies regularly
- [ ] Backup database regularly
- [ ] Monitor costs and usage
- [ ] Security updates applied

## Getting Help

1. **Railway Documentation:** https://docs.railway.app
2. **Railway Discord:** https://discord.gg/railway
3. **Railway Status:** https://status.railway.app
4. **Support:** Use Railway dashboard support chat

## Cost Optimization Tips

1. **Monitor Usage:** Check Railway dashboard for resource usage
2. **Optimize Queries:** Use database query optimization
3. **Efficient Builds:** Minimize build time and resources
4. **Right-size Resources:** Choose appropriate Railway plan
5. **Clean Up:** Remove unused services and variables
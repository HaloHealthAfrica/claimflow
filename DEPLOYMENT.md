# ClaimFlow Railway Deployment Guide

This guide will help you deploy your ClaimFlow application to Railway, a modern deployment platform.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   ```
3. **Git Repository**: Your code should be in a Git repository

## Quick Deployment

### Option 1: Automated Script (Recommended)

**For Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1
```

**For macOS/Linux:**
```bash
./scripts/deploy.sh
```

### Option 2: Manual Deployment

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Railway Project**
   ```bash
   railway init
   ```

3. **Deploy**
   ```bash
   railway up
   ```

## Environment Variables Setup

After deployment, configure these environment variables in your Railway dashboard:

### Required Variables

```env
# Database (Railway will provide this)
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-app.railway.app

# Node Environment
NODE_ENV=production
```

### Optional Variables (for full functionality)

```env
# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# AWS (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket

# SendGrid (for email notifications)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Google Cloud (for OCR)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY=your-private-key
GOOGLE_CLOUD_CLIENT_EMAIL=your-client-email
```

## Database Setup

1. **Add PostgreSQL Service**
   ```bash
   railway add postgresql
   ```

2. **Run Migrations**
   ```bash
   railway run npx prisma migrate deploy
   ```

3. **Seed Database (Optional)**
   ```bash
   railway run npx prisma db seed
   ```

## Post-Deployment Steps

### 1. Verify Deployment
Check the health endpoint:
```
https://your-app.railway.app/api/health
```

### 2. Configure Custom Domain (Optional)
1. Go to Railway dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain

### 3. Set up Monitoring
- Check logs: `railway logs`
- Monitor performance in Railway dashboard
- Set up alerts for critical errors

### 4. Security Configuration
- Ensure all environment variables are set
- Verify HTTPS is enabled
- Check security headers are working

## Useful Railway Commands

```bash
# View logs
railway logs

# Access shell
railway shell

# Check status
railway status

# Open in browser
railway open

# Connect to database
railway connect postgresql

# Run commands in production
railway run <command>

# Redeploy
railway up --detach
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Verify build command in package.json

2. **Database Connection Issues**
   - Verify DATABASE_URL is set correctly
   - Check if PostgreSQL service is running
   - Run migrations: `railway run npx prisma migrate deploy`

3. **Environment Variable Issues**
   - Double-check all required variables are set
   - Ensure no typos in variable names
   - Check if values need to be quoted

4. **Memory Issues**
   - Monitor memory usage in Railway dashboard
   - Consider upgrading to a higher tier if needed
   - Optimize your application for lower memory usage

### Getting Help

1. **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
2. **Railway Discord**: Join the Railway community
3. **Application Logs**: Use `railway logs` to debug issues

## Performance Optimization

### 1. Enable Caching
- Configure Redis for session storage
- Implement API response caching
- Use CDN for static assets

### 2. Database Optimization
- Add database indexes for frequently queried fields
- Use connection pooling
- Monitor query performance

### 3. Application Monitoring
- Set up error tracking (Sentry)
- Monitor performance metrics
- Set up health checks

## Scaling Considerations

### Horizontal Scaling
- Railway automatically handles load balancing
- Consider database read replicas for high traffic
- Implement proper session management

### Vertical Scaling
- Monitor resource usage
- Upgrade Railway plan as needed
- Optimize memory and CPU usage

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Railway's environment variable management
   - Rotate secrets regularly

2. **Database Security**
   - Use connection pooling
   - Implement proper access controls
   - Regular security updates

3. **Application Security**
   - Keep dependencies updated
   - Implement rate limiting
   - Use HTTPS everywhere
   - Validate all inputs

## Backup and Recovery

1. **Database Backups**
   - Railway provides automatic backups
   - Consider additional backup strategies for critical data
   - Test restore procedures

2. **Application Backups**
   - Keep your Git repository up to date
   - Document deployment procedures
   - Maintain rollback procedures

## Cost Optimization

1. **Monitor Usage**
   - Track resource consumption
   - Optimize database queries
   - Use appropriate Railway plan

2. **Resource Management**
   - Clean up unused resources
   - Optimize build processes
   - Use efficient algorithms

---

## Support

For additional support:
- Railway Documentation: https://docs.railway.app
- Railway Community: https://discord.gg/railway
- ClaimFlow Issues: Create an issue in your repository
# ClaimFlow Deployment Guide

## Prerequisites

1. **Node.js 20+** installed locally
2. **Railway CLI** installed (`npm install -g @railway/cli`)
3. **Git** repository connected to Railway
4. **PostgreSQL database** (Railway provides this)

## Environment Variables Required

### Core Variables (Required)
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_URL="https://your-app.railway.app"
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
NODE_ENV="production"
```

### Optional Services
```bash
# OpenAI (for AI features)
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4"
OPENAI_MAX_TOKENS="2000"

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-s3-bucket"

# SendGrid (for emails)
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Firebase (for notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
```

## Local Development

1. **Clone and install dependencies:**
```bash
git clone https://github.com/HaloHealthAfrica/claimflow.git
cd claimflow
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

3. **Set up database:**
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. **Start development server:**
```bash
npm run dev
```

## Railway Deployment

### Method 1: Automatic Deployment (Recommended)

1. **Connect to Railway:**
```bash
railway login
railway link
```

2. **Set environment variables:**
```bash
railway variables set NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
railway variables set NODE_ENV="production"
```

3. **Deploy:**
```bash
git push origin main
```

Railway will automatically:
- Build the Docker image
- Run database migrations
- Generate Prisma client
- Start the application

### Method 2: Manual Railway CLI

```bash
railway up
```

## Health Check

The application includes a health check endpoint at `/api/health` that verifies:
- Database connectivity
- Required environment variables
- Application status

## Troubleshooting

### Build Failures

1. **Prisma generation fails:**
   - Ensure DATABASE_URL is set
   - Check database connectivity

2. **TypeScript errors:**
   - Build is configured to ignore TS errors temporarily
   - Fix errors locally and redeploy

3. **Missing dependencies:**
   - Ensure package-lock.json is committed
   - Clear Railway build cache if needed

### Runtime Issues

1. **Database connection errors:**
   - Verify DATABASE_URL format
   - Check Railway database service status

2. **Environment variable issues:**
   - Use `railway variables` to check/set variables
   - Restart deployment after variable changes

3. **Memory issues:**
   - Monitor Railway metrics
   - Consider upgrading Railway plan

## Monitoring

- **Health endpoint:** `https://your-app.railway.app/api/health`
- **Railway logs:** `railway logs`
- **Railway metrics:** Available in Railway dashboard

## Security Considerations

1. **Environment Variables:**
   - Never commit secrets to git
   - Use Railway's secure variable storage
   - Rotate secrets regularly

2. **Database:**
   - Use Railway's managed PostgreSQL
   - Enable connection pooling if needed
   - Regular backups (Railway handles this)

3. **HTTPS:**
   - Railway provides automatic HTTPS
   - Ensure NEXTAUTH_URL uses https://

## Performance Optimization

1. **Build optimization:**
   - Uses Next.js standalone output
   - Multi-stage Docker build
   - Minimal production image

2. **Runtime optimization:**
   - Connection pooling enabled
   - Static asset optimization
   - Proper caching headers

## Scaling

Railway automatically handles:
- Load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments

For high-traffic scenarios, consider:
- Upgrading Railway plan
- Implementing Redis caching
- Database read replicas
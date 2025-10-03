# ClaimFlow Database Setup

This directory contains the database schema, migrations, and seed data for the ClaimFlow system.

## Overview

ClaimFlow uses PostgreSQL with Prisma ORM for data persistence. The database is designed with HIPAA compliance in mind, featuring:

- **Encrypted PHI Data**: Sensitive patient information is encrypted at the application level
- **Comprehensive Audit Logging**: All data access and modifications are logged
- **Row-Level Security**: Users can only access their own data
- **Optimized Indexes**: Performance-optimized queries for large datasets

## Database Schema

### Core Models

#### Users (`users`)
- User authentication and profile information
- Encrypted personal data (name, phone, address)
- Security features (2FA, account locking)

#### Insurance Profiles (`insurance_profiles`)
- Insurance card information with OCR processing
- Encrypted member data and policy details
- Verification status tracking

#### Claims (`claims`)
- Medical claims with CPT/ICD codes
- Status tracking and submission management
- AI validation scores and suggestions

#### Documents (`documents`)
- File storage metadata and OCR results
- S3 integration for secure file storage
- Document classification and access control

#### Audit Logs (`audit_logs`)
- Comprehensive activity logging
- HIPAA compliance tracking
- Security monitoring

### Supporting Models

- **Sessions**: User session management
- **Claim Timeline**: Claim status history
- **Appeals**: Claim appeal management
- **Notifications**: User notification system
- **CPT/ICD Codes**: Medical code reference data
- **System Config**: Application configuration

## Setup Instructions

### Prerequisites

1. **PostgreSQL 12+** installed and running
2. **Node.js 18+** with npm/yarn
3. **Environment variables** configured

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your database credentials
DATABASE_URL="postgresql://username:password@localhost:5432/claimflow_dev"
```

### Database Initialization

#### Option 1: Automated Setup (Recommended)

```bash
# Initialize database with one command
npm run db:init
```

This script will:
- Generate Prisma client
- Test database connection
- Run migrations
- Seed sample data (in development)
- Verify setup

#### Option 2: Manual Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Available Commands

```bash
# Database management
npm run db:init          # Complete database setup
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run new migrations
npm run db:migrate:deploy # Deploy migrations (production)
npm run db:migrate:reset # Reset and re-run all migrations
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database and reseed

# Health checks
curl http://localhost:3000/api/health/db
```

## Migration Management

### Creating Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_new_feature

# Preview migration without applying
npx prisma migrate diff --preview-feature
```

### Production Migrations

```bash
# Deploy migrations to production
npm run db:migrate:deploy

# Check migration status
npx prisma migrate status
```

### Migration Best Practices

1. **Always backup** production data before migrations
2. **Test migrations** in staging environment first
3. **Use descriptive names** for migration files
4. **Review generated SQL** before applying
5. **Plan for rollbacks** when necessary

## Data Seeding

The seed script (`prisma/seed.ts`) creates:

- **Demo users** with sample credentials
- **Insurance profiles** with test data
- **Sample claims** in various states
- **Medical codes** (CPT/ICD) reference data
- **System configuration** defaults

### Demo Credentials

```
Email: demo@claimflow.com
Password: Demo123!

Email: test@example.com  
Password: Demo123!
```

### Custom Seeding

Modify `prisma/seed.ts` to add your own test data:

```typescript
// Add custom seed data
const customUser = await prisma.user.create({
  data: {
    email: 'custom@example.com',
    password: hashedPassword,
    // ... other fields
  },
});
```

## Security Considerations

### Data Encryption

Sensitive PHI data is encrypted using AES-256:

```typescript
// Encrypt sensitive data before storage
const encryptedData = encrypt(sensitiveValue);

// Decrypt when retrieving
const decryptedData = decrypt(encryptedData);
```

### Audit Logging

All database operations are logged:

```typescript
// Automatic audit logging
await auditLogger.log({
  userId: 'user-id',
  action: 'CLAIM_CREATE',
  entityType: 'Claim',
  entityId: 'claim-id',
  success: true,
});
```

### Access Control

- **Row-level security** ensures users only see their data
- **API-level validation** prevents unauthorized access
- **Session management** with secure tokens

## Performance Optimization

### Indexes

The schema includes optimized indexes for:
- User lookups by email
- Claims by user and status
- Timeline entries by claim
- Audit logs by user and date

### Connection Pooling

Prisma automatically manages connection pooling:
- **Development**: 5 connections
- **Production**: 20+ connections
- **Timeout**: 30 seconds idle timeout

### Query Optimization

Use Prisma's query optimization features:

```typescript
// Include related data efficiently
const claims = await prisma.claim.findMany({
  include: {
    insuranceProfile: true,
    documents: true,
    timeline: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
});

// Use select for specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
});
```

## Monitoring and Maintenance

### Health Checks

Monitor database health:

```bash
# API health check
curl http://localhost:3000/api/health/db

# Direct Prisma check
npx prisma db pull
```

### Backup Strategy

1. **Daily automated backups** of production data
2. **Point-in-time recovery** capability
3. **Cross-region replication** for disaster recovery
4. **Regular backup testing** and restoration drills

### Maintenance Tasks

```bash
# Clean up old audit logs (automated)
npm run db:cleanup-audit-logs

# Analyze database performance
npx prisma db pull --print

# Update statistics
ANALYZE;
```

## Troubleshooting

### Common Issues

#### Connection Errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Migration Failures
```bash
# Check migration status
npx prisma migrate status

# Reset if needed (development only)
npm run db:reset
```

#### Performance Issues
```bash
# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Getting Help

1. **Check logs** in application and database
2. **Review Prisma documentation** at https://prisma.io/docs
3. **Database monitoring** tools and dashboards
4. **Contact support** with specific error messages

## Development Workflow

### Local Development

1. **Start PostgreSQL** service
2. **Run migrations** with `npm run db:migrate`
3. **Seed data** with `npm run db:seed`
4. **Start application** with `npm run dev`

### Testing

```bash
# Run with test database
DATABASE_URL="postgresql://localhost:5432/claimflow_test" npm test

# Reset test database
DATABASE_URL="postgresql://localhost:5432/claimflow_test" npm run db:reset
```

### Production Deployment

1. **Backup existing data**
2. **Deploy migrations** with `npm run db:migrate:deploy`
3. **Verify health** with health check endpoints
4. **Monitor performance** and error rates

## Schema Evolution

### Adding New Fields

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  newField  String?  // Add optional field first
  // ... existing fields
}
```

### Removing Fields

1. **Mark as optional** in first migration
2. **Remove from application code**
3. **Drop column** in subsequent migration

### Data Migrations

For complex data transformations:

```sql
-- Custom migration SQL
UPDATE claims 
SET new_status = CASE 
  WHEN old_status = 'PENDING' THEN 'SUBMITTED'
  ELSE old_status
END;
```

This comprehensive database setup provides a solid foundation for the ClaimFlow system with security, performance, and maintainability in mind.
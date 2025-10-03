# ClaimFlow Database Setup

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

## Local Development Setup

### 1. Start PostgreSQL Database

```bash
# Start the PostgreSQL container
docker-compose up -d postgres

# Check if the database is running
docker-compose ps
```

### 2. Set up Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR create and run migrations (for production-like setup)
npm run db:migrate

# Seed the database with test data
npm run db:seed
```

### 3. Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (WARNING: This will delete all data)
npx prisma migrate reset

# View database logs
docker-compose logs postgres
```

## Environment Variables

Make sure your `.env.local` file contains:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/claimflow_dev"
ENCRYPTION_KEY="your-32-character-encryption-key"
```

## HIPAA Compliance Notes

- All PHI (Personal Health Information) fields are encrypted at rest using AES-256
- Audit logs track all access to sensitive data
- Database connections use SSL in production
- Row-level security ensures users can only access their own data

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running
2. Check if PostgreSQL container is healthy: `docker-compose ps`
3. Verify DATABASE_URL in .env.local
4. Check container logs: `docker-compose logs postgres`

### Migration Issues

1. Reset database: `npx prisma migrate reset`
2. Generate client: `npm run db:generate`
3. Push schema: `npm run db:push`

### Encryption Issues

1. Ensure ENCRYPTION_KEY is set in environment variables
2. Key must be exactly 32 characters for AES-256
3. Never change the encryption key after data is stored (data will be unrecoverable)
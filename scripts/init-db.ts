#!/usr/bin/env ts-node

// Database initialization script
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function initializeDatabase() {
  console.log('🚀 Initializing ClaimFlow database...');
  console.log(`Environment: ${NODE_ENV}`);
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL in your .env file');
    console.log('Example: DATABASE_URL="postgresql://username:password@localhost:5432/claimflow_dev"');
    process.exit(1);
  }

  console.log(`📊 Database URL: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);

  try {
    // Check if Prisma schema exists
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    if (!existsSync(schemaPath)) {
      console.error('❌ Prisma schema not found at prisma/schema.prisma');
      process.exit(1);
    }

    console.log('✅ Prisma schema found');

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');

    // Check database connection
    console.log('🔌 Testing database connection...');
    try {
      execSync('npx prisma db pull --force', { stdio: 'pipe' });
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('⚠️ Database connection failed, attempting to create database...');
      
      // Try to create database if it doesn't exist
      try {
        const dbName = DATABASE_URL.split('/').pop()?.split('?')[0];
        console.log(`📝 Creating database: ${dbName}`);
        
        // This is a simplified approach - in production, you'd want more robust database creation
        execSync(`createdb ${dbName}`, { stdio: 'pipe' });
        console.log('✅ Database created');
      } catch (createError) {
        console.log('⚠️ Could not create database automatically');
        console.log('Please ensure the database exists and is accessible');
      }
    }

    // Run migrations
    console.log('🔄 Running database migrations...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations completed');
    } catch (error) {
      console.log('⚠️ Migration failed, trying to reset and migrate...');
      
      if (NODE_ENV === 'development') {
        console.log('🔄 Resetting database for development...');
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
        console.log('✅ Database reset and migrated');
      } else {
        console.error('❌ Migration failed in production environment');
        throw error;
      }
    }

    // Seed database if in development
    if (NODE_ENV === 'development' || process.env.SEED_DATABASE === 'true') {
      console.log('🌱 Seeding database with sample data...');
      try {
        execSync('npx prisma db seed', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
      } catch (error) {
        console.log('⚠️ Seeding failed, but database is ready');
        console.log('You can run "npm run db:seed" manually later');
      }
    }

    // Verify setup
    console.log('🔍 Verifying database setup...');
    const { prisma } = await import('../src/lib/prisma');
    
    try {
      const stats = await prisma.getDatabaseStats();
      console.log('✅ Database verification successful');
      console.log(`📊 Database contains: ${stats.users} users, ${stats.claims} claims`);
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. Use demo credentials: demo@claimflow.com / Demo123!');
    console.log('\n🔧 Useful commands:');
    console.log('- View database: npm run db:studio');
    console.log('- Reset database: npm run db:reset');
    console.log('- Seed database: npm run db:seed');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Check DATABASE_URL in .env file');
    console.log('3. Verify database user has proper permissions');
    console.log('4. Check network connectivity to database');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase().catch(console.error);
}

export { initializeDatabase };
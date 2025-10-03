// Database health check API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const start = Date.now();
    
    // Test basic connectivity
    const isHealthy = await prisma.healthCheck();
    
    if (!isHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Get database statistics
    const stats = await prisma.getDatabaseStats();
    const responseTime = Date.now() - start;

    // Check migration status
    let migrationStatus = 'unknown';
    try {
      const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'claims', 'insurance_profiles')
      `;
      
      const tables = Array.isArray(result) ? result : [];
      migrationStatus = tables.length >= 3 ? 'up-to-date' : 'pending';
    } catch (error) {
      migrationStatus = 'error';
    }

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        migrationStatus,
        statistics: stats,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const isHealthy = await prisma.healthCheck();
    return new NextResponse(null, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Database-Status': isHealthy ? 'healthy' : 'unhealthy',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
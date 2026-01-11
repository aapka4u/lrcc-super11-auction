import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// ============================================
// TYPES
// ============================================

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  checks: {
    kv: HealthCheck;
    memory: HealthCheck;
  };
  uptime: number;
}

// ============================================
// HEALTH CHECKS
// ============================================

const startTime = Date.now();

async function checkKvHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Write and read test
    const testKey = `health:ping:${Date.now()}`;
    const testValue = { timestamp: Date.now() };

    await kv.set(testKey, testValue, { ex: 60 });
    const result = await kv.get(testKey);
    await kv.del(testKey);

    if (!result) {
      return {
        status: 'degraded',
        latency: Date.now() - start,
        error: 'Read after write returned null',
      };
    }

    const latency = Date.now() - start;

    // Latency thresholds
    if (latency > 1000) {
      return {
        status: 'degraded',
        latency,
        error: 'High latency detected',
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkMemoryHealth(): HealthCheck {
  try {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usagePercent = (used.heapUsed / used.heapTotal) * 100;

    if (usagePercent > 90) {
      return {
        status: 'degraded',
        error: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
      };
    }

    return {
      status: 'healthy',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [kvCheck, memoryCheck] = await Promise.all([
    checkKvHealth(),
    Promise.resolve(checkMemoryHealth()),
  ]);

  // Determine overall status
  const checks = { kv: kvCheck, memory: memoryCheck };
  const checkStatuses = Object.values(checks).map(c => c.status);

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (checkStatuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (checkStatuses.includes('degraded')) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: Date.now(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    checks,
    uptime: Date.now() - startTime,
  };

  const statusCode = overallStatus === 'healthy' ? 200 :
                     overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// ============================================
// DETAILED HEALTH (Admin only)
// ============================================

export async function POST(request: Request): Promise<NextResponse> {
  // This could require auth for detailed diagnostics
  const body = await request.json().catch(() => ({}));

  if (body.includeDetails !== true) {
    return NextResponse.json({ error: 'includeDetails required' }, { status: 400 });
  }

  const memUsage = process.memoryUsage();

  const details = {
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV,
    },
    vercel: {
      region: process.env.VERCEL_REGION,
      deploymentUrl: process.env.VERCEL_URL,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA,
    },
  };

  return NextResponse.json(details);
}

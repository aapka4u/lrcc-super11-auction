import { kv } from '@vercel/kv';
import { TEAMS } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const checks = {
    kvConnection: false,
    latency: 0,
    teamsConfig: false,
    envVars: false
  };

  const start = Date.now();
  try {
    await kv.set('health-check', 'ok');
    const val = await kv.get('health-check');
    checks.kvConnection = val === 'ok';
    checks.latency = Date.now() - start;
  } catch (e) {
    console.error(e);
  }

  checks.teamsConfig = TEAMS.length > 0;
  checks.envVars = !!process.env.VERCEL_KV_REST_API_URL && !!process.env.VERCEL_KV_REST_API_TOKEN;

  const isHealthy = Object.values(checks).every(v => v === true || typeof v === 'number');

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-2xl font-bold mb-6 text-amber-500">🚑 System Health Check</h1>
      
      <div className="space-y-4 max-w-lg">
        <div className="flex justify-between items-center border-b border-white/20 pb-2">
          <span>KV Database Connection</span>
          <span className={checks.kvConnection ? "text-green-500" : "text-red-500 font-bold"}>
            {checks.kvConnection ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-white/20 pb-2">
          <span>KV Latency</span>
          <span className={checks.latency < 500 ? "text-green-500" : "text-yellow-500"}>
            {checks.latency}ms
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-white/20 pb-2">
          <span>Environment Variables</span>
          <span className={checks.envVars ? "text-green-500" : "text-red-500 font-bold"}>
            {checks.envVars ? "LOADED" : "MISSING"}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-white/20 pb-2">
          <span>Teams Configuration</span>
          <span className={checks.teamsConfig ? "text-green-500" : "text-red-500 font-bold"}>
            {checks.teamsConfig ? "OK" : "EMPTY"}
          </span>
        </div>
      </div>

      <div className="mt-8 p-4 rounded bg-white/10">
        <h2 className="font-bold mb-2">Overall Status:</h2>
        {isHealthy ? (
          <div className="text-green-400 font-bold text-xl">✅ READY FOR AUCTION</div>
        ) : (
          <div className="text-red-500 font-bold text-xl">❌ ISSUES DETECTED - DO NOT GO LIVE</div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-white/50">
        Check time: {new Date().toISOString()}
      </div>
    </div>
  );
}

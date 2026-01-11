import { describe, it, expect, beforeEach } from 'vitest';
import { clearKvStore } from '../setup';
import { GET, POST } from '@/app/api/health/route';

describe('Health API', () => {
  beforeEach(() => {
    clearKvStore();
  });

  describe('GET /api/health', () => {
    it('returns 200 when KV is healthy', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it('returns correct structure', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('checks');
      expect(body).toHaveProperty('uptime');
    });

    it('includes KV check', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.checks).toHaveProperty('kv');
      expect(body.checks.kv).toHaveProperty('status');
    });

    it('includes memory check', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.checks).toHaveProperty('memory');
      expect(body.checks.memory).toHaveProperty('status');
    });

    it('returns healthy status when all checks pass', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe('healthy');
    });

    it('includes Cache-Control header', async () => {
      const response = await GET();
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('returns version as dev in test environment', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.version).toBe('dev');
    });

    it('returns positive uptime', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('returns current timestamp', async () => {
      const before = Date.now();
      const response = await GET();
      const after = Date.now();
      const body = await response.json();

      expect(body.timestamp).toBeGreaterThanOrEqual(before);
      expect(body.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('POST /api/health', () => {
    it('returns 400 without includeDetails', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns detailed info with includeDetails', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeDetails: true }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('memory');
      expect(body).toHaveProperty('environment');
    });

    it('returns memory details', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeDetails: true }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.memory).toHaveProperty('heapUsed');
      expect(body.memory).toHaveProperty('heapTotal');
      expect(body.memory).toHaveProperty('rss');
    });

    it('returns environment details', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeDetails: true }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.environment).toHaveProperty('nodeVersion');
      expect(body.environment).toHaveProperty('platform');
    });
  });
});

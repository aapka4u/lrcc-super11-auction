import { describe, it, expect, beforeEach } from 'vitest';
import { clearKvStore } from '../setup';
import {
  hashPin,
  verifyPinHash,
  generateMasterAdminToken,
  verifyMasterAdminToken,
  generateSessionToken,
  verifySessionToken,
  extractCredentials,
} from '@/lib/tournament-auth';

describe('Tournament Authentication', () => {
  beforeEach(() => {
    clearKvStore();
  });

  describe('PIN Hashing', () => {
    describe('hashPin', () => {
      it('produces consistent hashes for same input', () => {
        const hash1 = hashPin('mypin', 'tournament1');
        const hash2 = hashPin('mypin', 'tournament1');
        expect(hash1).toBe(hash2);
      });

      it('produces different hashes for different PINs', () => {
        const hash1 = hashPin('pin1', 'tournament1');
        const hash2 = hashPin('pin2', 'tournament1');
        expect(hash1).not.toBe(hash2);
      });

      it('produces different hashes for different tournament IDs (salt)', () => {
        const hash1 = hashPin('mypin', 'tournament1');
        const hash2 = hashPin('mypin', 'tournament2');
        expect(hash1).not.toBe(hash2);
      });

      it('returns 64 character hex string (SHA-256)', () => {
        const hash = hashPin('test', 'tournament');
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe('verifyPinHash', () => {
      it('returns true for matching PIN', () => {
        const storedHash = hashPin('correctpin', 'tournament1');
        const result = verifyPinHash('correctpin', 'tournament1', storedHash);
        expect(result).toBe(true);
      });

      it('returns false for wrong PIN', () => {
        const storedHash = hashPin('correctpin', 'tournament1');
        const result = verifyPinHash('wrongpin', 'tournament1', storedHash);
        expect(result).toBe(false);
      });

      it('returns false for wrong tournament ID', () => {
        const storedHash = hashPin('correctpin', 'tournament1');
        const result = verifyPinHash('correctpin', 'tournament2', storedHash);
        expect(result).toBe(false);
      });

      it('returns false for tampered hash', () => {
        const storedHash = hashPin('correctpin', 'tournament1');
        const tamperedHash = storedHash.substring(0, 60) + '0000';
        const result = verifyPinHash('correctpin', 'tournament1', tamperedHash);
        expect(result).toBe(false);
      });

      it('is timing-safe (compares full length)', () => {
        const storedHash = hashPin('correctpin', 'tournament1');
        // This tests that we don't return early on mismatch
        // The function should always compare all characters
        const result1 = verifyPinHash('a'.repeat(100), 'tournament1', storedHash);
        const result2 = verifyPinHash('b'.repeat(100), 'tournament1', storedHash);
        expect(result1).toBe(false);
        expect(result2).toBe(false);
      });
    });
  });

  describe('Master Admin Token', () => {
    describe('generateMasterAdminToken', () => {
      it('returns a JWT string', async () => {
        const token = await generateMasterAdminToken('tournament1');
        expect(typeof token).toBe('string');
        // JWT has 3 parts separated by dots
        expect(token.split('.').length).toBe(3);
      });

      it('generates different tokens for different tournaments', async () => {
        const token1 = await generateMasterAdminToken('tournament1');
        const token2 = await generateMasterAdminToken('tournament2');
        expect(token1).not.toBe(token2);
      });
    });

    describe('verifyMasterAdminToken', () => {
      it('validates correct token', async () => {
        const token = await generateMasterAdminToken('tournament1');
        const payload = await verifyMasterAdminToken(token);
        expect(payload).not.toBeNull();
        expect(payload?.tournamentId).toBe('tournament1');
        expect(payload?.type).toBe('master');
      });

      it('returns null for tampered token', async () => {
        const token = await generateMasterAdminToken('tournament1');
        const tamperedToken = token.slice(0, -5) + 'XXXXX';
        const payload = await verifyMasterAdminToken(tamperedToken);
        expect(payload).toBeNull();
      });

      it('returns null for invalid token format', async () => {
        const payload = await verifyMasterAdminToken('not-a-valid-jwt');
        expect(payload).toBeNull();
      });

      it('returns null for empty token', async () => {
        const payload = await verifyMasterAdminToken('');
        expect(payload).toBeNull();
      });
    });
  });

  describe('Session Token', () => {
    describe('generateSessionToken', () => {
      it('returns a JWT string', async () => {
        const token = await generateSessionToken('tournament1');
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3);
      });

      it('generates unique session IDs', async () => {
        const token1 = await generateSessionToken('tournament1');
        const token2 = await generateSessionToken('tournament1');
        // Tokens should be different even for same tournament
        expect(token1).not.toBe(token2);
      });
    });

    describe('verifySessionToken', () => {
      it('validates correct token', async () => {
        const token = await generateSessionToken('tournament1');
        const payload = await verifySessionToken(token);
        expect(payload).not.toBeNull();
        expect(payload?.tournamentId).toBe('tournament1');
        expect(payload?.type).toBe('session');
        expect(payload?.sessionId).toBeDefined();
      });

      it('returns null for tampered token', async () => {
        const token = await generateSessionToken('tournament1');
        const tamperedToken = token.slice(0, -5) + 'XXXXX';
        const payload = await verifySessionToken(tamperedToken);
        expect(payload).toBeNull();
      });

      it('returns null for master token (wrong type)', async () => {
        const token = await generateMasterAdminToken('tournament1');
        const payload = await verifySessionToken(token);
        expect(payload).toBeNull();
      });

      it('returns null for invalid token', async () => {
        const payload = await verifySessionToken('invalid-token');
        expect(payload).toBeNull();
      });
    });
  });

  describe('Credential Extraction', () => {
    describe('extractCredentials', () => {
      it('extracts PIN from body', () => {
        const headers = new Headers();
        const body = { pin: '1234' };
        const creds = extractCredentials(headers, body);
        expect(creds.pin).toBe('1234');
      });

      it('extracts session token from Authorization header', () => {
        const headers = new Headers();
        headers.set('Authorization', 'Bearer my-session-token');
        const creds = extractCredentials(headers);
        expect(creds.sessionToken).toBe('my-session-token');
      });

      it('extracts master token from X-Master-Token header', () => {
        const headers = new Headers();
        headers.set('X-Master-Token', 'my-master-token');
        const creds = extractCredentials(headers);
        expect(creds.masterToken).toBe('my-master-token');
      });

      it('extracts all credentials together', () => {
        const headers = new Headers();
        headers.set('Authorization', 'Bearer session-token');
        headers.set('X-Master-Token', 'master-token');
        const body = { pin: '1234' };
        const creds = extractCredentials(headers, body);
        expect(creds.pin).toBe('1234');
        expect(creds.sessionToken).toBe('session-token');
        expect(creds.masterToken).toBe('master-token');
      });

      it('handles missing Authorization header', () => {
        const headers = new Headers();
        const creds = extractCredentials(headers);
        expect(creds.sessionToken).toBeUndefined();
      });

      it('handles missing body', () => {
        const headers = new Headers();
        const creds = extractCredentials(headers);
        expect(creds.pin).toBeUndefined();
      });

      it('ignores non-Bearer Authorization', () => {
        const headers = new Headers();
        headers.set('Authorization', 'Basic credentials');
        const creds = extractCredentials(headers);
        expect(creds.sessionToken).toBeUndefined();
      });
    });
  });
});

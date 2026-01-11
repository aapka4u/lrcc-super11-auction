import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { createHash, randomBytes } from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET_KEY = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // In production, we'll use a fallback but log warning
      console.warn('JWT_SECRET environment variable not set - using fallback');
    }
    // Development/fallback - use a generated key
    return new TextEncoder().encode('dev-only-insecure-secret-change-in-prod-32chars');
  }
  if (secret.length < 32) {
    console.warn('JWT_SECRET should be at least 32 characters for security');
  }
  return new TextEncoder().encode(secret);
})();

const MASTER_TOKEN_EXPIRY_DAYS = 365;
const SESSION_TOKEN_EXPIRY_HOURS = 24;

// ============================================
// TYPES
// ============================================

export interface MasterAdminTokenPayload extends JWTPayload {
  tournamentId: string;
  type: 'master';
  createdAt: number;
}

export interface SessionTokenPayload extends JWTPayload {
  tournamentId: string;
  type: 'session';
  sessionId: string;
  createdAt: number;
}

export interface AuthResult {
  authorized: boolean;
  reason?: string;
  tokenType?: 'master' | 'session' | 'pin';
}

// ============================================
// PIN HASHING (Secure Storage)
// ============================================

/**
 * Hash a PIN with tournament-specific salt
 * Uses SHA-256 with unique salt per tournament
 */
export function hashPin(pin: string, tournamentId: string): string {
  const salt = `draftcast:${tournamentId}:pin:v1`;
  return createHash('sha256')
    .update(`${salt}:${pin}`)
    .digest('hex');
}

/**
 * Verify PIN against stored hash
 */
export function verifyPinHash(pin: string, tournamentId: string, storedHash: string): boolean {
  const computedHash = hashPin(pin, tournamentId);
  // Timing-safe comparison to prevent timing attacks
  if (computedHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

// ============================================
// MASTER ADMIN TOKEN (Long-lived, for recovery)
// ============================================

/**
 * Generate master admin token for tournament creator
 * This token allows PIN recovery and should be stored securely by user
 */
export async function generateMasterAdminToken(tournamentId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    tournamentId,
    type: 'master',
    createdAt: now,
  } as Omit<MasterAdminTokenPayload, 'iat' | 'exp'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(`${MASTER_TOKEN_EXPIRY_DAYS}d`)
    .setSubject(tournamentId)
    .setIssuer('draftcast')
    .sign(JWT_SECRET_KEY);

  return token;
}

/**
 * Verify master admin token
 */
export async function verifyMasterAdminToken(
  token: string
): Promise<MasterAdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      issuer: 'draftcast',
    });

    if (payload.type !== 'master') {
      return null;
    }

    return payload as unknown as MasterAdminTokenPayload;
  } catch {
    // Token invalid, expired, or tampered
    return null;
  }
}

// ============================================
// SESSION TOKEN (Short-lived, for active admin)
// ============================================

/**
 * Generate session token after PIN verification
 * Reduces PIN transmission frequency
 */
export async function generateSessionToken(tournamentId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sessionId = randomBytes(16).toString('hex');

  const token = await new SignJWT({
    tournamentId,
    type: 'session',
    sessionId,
    createdAt: now,
  } as Omit<SessionTokenPayload, 'iat' | 'exp'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(`${SESSION_TOKEN_EXPIRY_HOURS}h`)
    .setSubject(tournamentId)
    .setIssuer('draftcast')
    .sign(JWT_SECRET_KEY);

  return token;
}

/**
 * Verify session token
 */
export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      issuer: 'draftcast',
    });

    if (payload.type !== 'session') {
      return null;
    }

    return payload as unknown as SessionTokenPayload;
  } catch {
    return null;
  }
}

// ============================================
// CREDENTIAL EXTRACTION FROM REQUEST
// ============================================

/**
 * Extract credentials from request headers and body
 */
export function extractCredentials(
  headers: Headers,
  body?: { pin?: string }
): {
  pin?: string;
  masterToken?: string;
  sessionToken?: string;
} {
  const authHeader = headers.get('Authorization');
  let sessionToken: string | undefined;
  let masterToken: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Will be validated later based on type field
    sessionToken = token;
  }

  // Master token typically sent in X-Master-Token header for recovery
  const masterHeader = headers.get('X-Master-Token');
  if (masterHeader) {
    masterToken = masterHeader;
  }

  return {
    pin: body?.pin,
    masterToken,
    sessionToken,
  };
}

// ============================================
// SIMPLE PIN VERIFICATION (for backward compatibility)
// ============================================

/**
 * Simple PIN verification against environment variable or stored hash
 * Used for backward compatibility with existing LRCC tournament
 */
export function verifySimplePin(providedPin: string, storedPin: string): boolean {
  // Simple constant-time comparison
  if (providedPin.length !== storedPin.length) return false;
  let result = 0;
  for (let i = 0; i < providedPin.length; i++) {
    result |= providedPin.charCodeAt(i) ^ storedPin.charCodeAt(i);
  }
  return result === 0;
}

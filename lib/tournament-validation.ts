// ============================================
// SLUG VALIDATION
// ============================================

const TOURNAMENT_SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;

const RESERVED_SLUGS = new Set([
  // System routes
  'api', 'admin', 'tournaments', 'health', 'broadcast', 'intelligence',
  'players', 'player', 'team', '_next', 'static', 'assets',
  // Auth routes
  'login', 'logout', 'signup', 'register', 'auth', 'oauth', 'callback',
  // Marketing routes
  'pricing', 'legal', 'support', 'draftcast', 'about', 'contact',
  'terms', 'privacy', 'help', 'docs', 'blog', 'news', 'press',
  // Common words that could cause confusion
  'new', 'create', 'edit', 'delete', 'settings', 'profile', 'dashboard',
  'home', 'index', 'main', 'app', 'www', 'mail', 'ftp', 'cdn',
  // Auction-specific
  'auction', 'bid', 'draft', 'league', 'cricket', 'ipl', 'bbl',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

export function validateTournamentSlug(slug: string): ValidationResult {
  // Normalize input
  const normalizedSlug = slug?.trim().toLowerCase();

  // Required check
  if (!normalizedSlug) {
    return {
      valid: false,
      error: 'Tournament ID is required',
      code: 'SLUG_REQUIRED',
    };
  }

  // Length check
  if (normalizedSlug.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Tournament ID must be at least ${MIN_SLUG_LENGTH} characters`,
      code: 'SLUG_TOO_SHORT',
    };
  }

  if (normalizedSlug.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Tournament ID must be at most ${MAX_SLUG_LENGTH} characters`,
      code: 'SLUG_TOO_LONG',
    };
  }

  // Format check
  if (!TOURNAMENT_SLUG_REGEX.test(normalizedSlug)) {
    return {
      valid: false,
      error: 'Tournament ID can only contain lowercase letters, numbers, and hyphens. Must start and end with a letter or number.',
      code: 'SLUG_INVALID_FORMAT',
    };
  }

  // Reserved words check
  if (RESERVED_SLUGS.has(normalizedSlug)) {
    return {
      valid: false,
      error: 'This tournament ID is reserved',
      code: 'SLUG_RESERVED',
    };
  }

  // Numeric-only check
  if (/^\d+$/.test(normalizedSlug)) {
    return {
      valid: false,
      error: 'Tournament ID cannot be numbers only',
      code: 'SLUG_NUMERIC_ONLY',
    };
  }

  // Consecutive hyphens check
  if (normalizedSlug.includes('--')) {
    return {
      valid: false,
      error: 'Tournament ID cannot contain consecutive hyphens',
      code: 'SLUG_CONSECUTIVE_HYPHENS',
    };
  }

  // Leading/trailing hyphen (should be caught by regex, but explicit)
  if (normalizedSlug.startsWith('-') || normalizedSlug.endsWith('-')) {
    return {
      valid: false,
      error: 'Tournament ID cannot start or end with a hyphen',
      code: 'SLUG_HYPHEN_BOUNDARY',
    };
  }

  return { valid: true };
}

// ============================================
// PIN VALIDATION (Enhanced Security)
// ============================================

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 20;

// Common weak PINs to reject
const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '2345', '3456', '4567', '5678', '6789', '7890',
  '4321', '5432', '6543', '7654', '8765', '9876',
  '1212', '2121', '1313', '3131', '1414', '4141',
  '0123', '9012', '1230', '2340',
  '1122', '2233', '3344', '4455', '5566', '6677', '7788', '8899',
  'password', 'admin', '123456', 'qwerty', 'letmein',
]);

export function validateAdminPin(pin: string): ValidationResult {
  // Required check
  if (!pin) {
    return {
      valid: false,
      error: 'Admin PIN is required',
      code: 'PIN_REQUIRED',
    };
  }

  // Length check
  if (pin.length < MIN_PIN_LENGTH) {
    return {
      valid: false,
      error: `PIN must be at least ${MIN_PIN_LENGTH} characters`,
      code: 'PIN_TOO_SHORT',
    };
  }

  if (pin.length > MAX_PIN_LENGTH) {
    return {
      valid: false,
      error: `PIN must be at most ${MAX_PIN_LENGTH} characters`,
      code: 'PIN_TOO_LONG',
    };
  }

  // Common weak PINs
  if (WEAK_PINS.has(pin.toLowerCase())) {
    return {
      valid: false,
      error: 'This PIN is too common. Please choose a stronger PIN.',
      code: 'PIN_TOO_COMMON',
    };
  }

  // All same character
  if (/^(.)\1+$/.test(pin)) {
    return {
      valid: false,
      error: 'PIN cannot be all the same character',
      code: 'PIN_ALL_SAME',
    };
  }

  // Sequential digits (ascending or descending)
  if (isSequential(pin)) {
    return {
      valid: false,
      error: 'PIN cannot be a simple sequence',
      code: 'PIN_SEQUENTIAL',
    };
  }

  // Keyboard patterns (only for longer PINs)
  if (pin.length >= 6 && isKeyboardPattern(pin.toLowerCase())) {
    return {
      valid: false,
      error: 'PIN cannot be a keyboard pattern',
      code: 'PIN_KEYBOARD_PATTERN',
    };
  }

  return { valid: true };
}

function isSequential(pin: string): boolean {
  if (!/^\d+$/.test(pin)) return false; // Only check numeric PINs

  let ascending = true;
  let descending = true;

  for (let i = 1; i < pin.length; i++) {
    const diff = parseInt(pin[i]) - parseInt(pin[i - 1]);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }

  return ascending || descending;
}

function isKeyboardPattern(pin: string): boolean {
  const keyboardRows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
  ];

  for (const row of keyboardRows) {
    if (row.includes(pin) || row.split('').reverse().join('').includes(pin)) {
      return true;
    }
  }

  return false;
}

// ============================================
// PIN STRENGTH INDICATOR (for UI)
// ============================================

export type PinStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PinStrengthResult {
  strength: PinStrength;
  score: number; // 0-100
  suggestions: string[];
}

export function assessPinStrength(pin: string): PinStrengthResult {
  const suggestions: string[] = [];
  let score = 0;

  // Length scoring
  if (pin.length >= 4) score += 20;
  if (pin.length >= 6) score += 15;
  if (pin.length >= 8) score += 15;
  if (pin.length >= 10) score += 10;

  // Character variety
  const hasLower = /[a-z]/.test(pin);
  const hasUpper = /[A-Z]/.test(pin);
  const hasDigit = /\d/.test(pin);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pin);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  score += varietyCount * 10;

  // Penalize patterns
  if (/^(.)\1+$/.test(pin)) score -= 20;
  if (isSequential(pin)) score -= 20;
  if (WEAK_PINS.has(pin.toLowerCase())) score -= 30;

  // Suggestions
  if (pin.length < 6) suggestions.push('Use at least 6 characters');
  if (!hasDigit && !hasLower) suggestions.push('Mix letters and numbers');
  if (varietyCount < 2) suggestions.push('Add variety (uppercase, special characters)');

  // Determine strength
  let strength: PinStrength;
  if (score >= 70) strength = 'strong';
  else if (score >= 50) strength = 'good';
  else if (score >= 30) strength = 'fair';
  else strength = 'weak';

  return {
    strength,
    score: Math.max(0, Math.min(100, score)),
    suggestions,
  };
}

// ============================================
// URL VALIDATION
// ============================================

export function validateExternalUrl(url: string): ValidationResult {
  if (!url) {
    return { valid: true }; // Optional URLs are valid when empty
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        error: 'URL must use HTTP or HTTPS protocol',
        code: 'URL_INVALID_PROTOCOL',
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
      code: 'URL_INVALID_FORMAT',
    };
  }
}

// ============================================
// TEAM/PLAYER ID VALIDATION
// ============================================

const ID_REGEX = /^[a-z0-9_]+$/;
const MAX_ID_LENGTH = 50;

export function validateEntityId(id: string, entityType: string): ValidationResult {
  if (!id || id.trim().length === 0) {
    return {
      valid: false,
      error: `${entityType} ID is required`,
      code: 'ID_REQUIRED',
    };
  }

  if (id.length > MAX_ID_LENGTH) {
    return {
      valid: false,
      error: `${entityType} ID must be at most ${MAX_ID_LENGTH} characters`,
      code: 'ID_TOO_LONG',
    };
  }

  if (!ID_REGEX.test(id)) {
    return {
      valid: false,
      error: `${entityType} ID can only contain lowercase letters, numbers, and underscores`,
      code: 'ID_INVALID_FORMAT',
    };
  }

  return { valid: true };
}

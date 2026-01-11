import { describe, it, expect } from 'vitest';
import {
  validateTournamentSlug,
  validateAdminPin,
  assessPinStrength,
} from '@/lib/tournament-validation';

describe('Tournament Slug Validation', () => {
  describe('validateTournamentSlug', () => {
    it('accepts valid slug with 3 characters', () => {
      const result = validateTournamentSlug('abc');
      expect(result.valid).toBe(true);
    });

    it('accepts valid slug with 50 characters', () => {
      const slug = 'a'.repeat(48) + 'bc';
      const result = validateTournamentSlug(slug);
      expect(result.valid).toBe(true);
    });

    it('accepts slug with hyphens', () => {
      const result = validateTournamentSlug('my-tournament-2024');
      expect(result.valid).toBe(true);
    });

    it('accepts slug with numbers', () => {
      const result = validateTournamentSlug('tournament123');
      expect(result.valid).toBe(true);
    });

    it('rejects empty slug', () => {
      const result = validateTournamentSlug('');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_REQUIRED');
    });

    it('rejects slug shorter than 3 characters', () => {
      const result = validateTournamentSlug('ab');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_TOO_SHORT');
    });

    it('rejects slug longer than 50 characters', () => {
      const slug = 'a'.repeat(51);
      const result = validateTournamentSlug(slug);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_TOO_LONG');
    });

    it('normalizes uppercase letters to lowercase and validates', () => {
      // The implementation normalizes to lowercase first, so uppercase becomes lowercase and passes
      const result = validateTournamentSlug('MyTournament');
      // After normalization to 'mytournament', it passes validation
      expect(result.valid).toBe(true);
    });

    it('rejects special characters', () => {
      const result = validateTournamentSlug('my_tournament!');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_INVALID_FORMAT');
    });

    it('rejects slug starting with hyphen', () => {
      const result = validateTournamentSlug('-tournament');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_INVALID_FORMAT');
    });

    it('rejects slug ending with hyphen', () => {
      const result = validateTournamentSlug('tournament-');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_INVALID_FORMAT');
    });

    it('rejects consecutive hyphens', () => {
      const result = validateTournamentSlug('my--tournament');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_CONSECUTIVE_HYPHENS');
    });

    it('rejects reserved slug: api', () => {
      const result = validateTournamentSlug('api');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_RESERVED');
    });

    it('rejects reserved slug: admin', () => {
      const result = validateTournamentSlug('admin');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_RESERVED');
    });

    it('rejects reserved slug: tournaments', () => {
      const result = validateTournamentSlug('tournaments');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_RESERVED');
    });

    it('rejects reserved slug: health', () => {
      const result = validateTournamentSlug('health');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_RESERVED');
    });

    it('rejects numeric-only slug', () => {
      const result = validateTournamentSlug('12345');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('SLUG_NUMERIC_ONLY');
    });

    it('normalizes to lowercase', () => {
      // The validation normalizes internally (toLowerCase), so uppercase becomes valid
      const result = validateTournamentSlug('MYTOURNAMENT');
      // After normalization to 'mytournament', it passes validation
      expect(result.valid).toBe(true);
    });

    it('trims whitespace', () => {
      const result = validateTournamentSlug('  my-tournament  ');
      expect(result.valid).toBe(true);
    });
  });
});

describe('Admin PIN Validation', () => {
  describe('validateAdminPin', () => {
    it('accepts valid PIN with 4 characters', () => {
      const result = validateAdminPin('abc1');
      expect(result.valid).toBe(true);
    });

    it('accepts valid PIN with 20 characters', () => {
      const pin = 'secure-pin-12345678';
      const result = validateAdminPin(pin);
      expect(result.valid).toBe(true);
    });

    it('accepts strong alphanumeric PIN', () => {
      const result = validateAdminPin('MyStr0ngP1n');
      expect(result.valid).toBe(true);
    });

    it('rejects empty PIN', () => {
      const result = validateAdminPin('');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_REQUIRED');
    });

    it('rejects PIN shorter than 4 characters', () => {
      const result = validateAdminPin('123');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_SHORT');
    });

    it('rejects PIN longer than 20 characters', () => {
      const pin = 'a'.repeat(21);
      const result = validateAdminPin(pin);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_LONG');
    });

    it('rejects common weak PIN: 1234', () => {
      const result = validateAdminPin('1234');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects common weak PIN: 0000', () => {
      const result = validateAdminPin('0000');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects common weak PIN: password', () => {
      const result = validateAdminPin('password');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects common weak PIN: admin', () => {
      const result = validateAdminPin('admin');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects all same character PIN', () => {
      const result = validateAdminPin('aaaa');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_ALL_SAME');
    });

    it('rejects sequential ascending PIN', () => {
      const result = validateAdminPin('123456789');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_SEQUENTIAL');
    });

    it('rejects sequential descending PIN', () => {
      const result = validateAdminPin('9876');
      expect(result.valid).toBe(false);
      // '9876' is in WEAK_PINS set, so caught as TOO_COMMON first
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects keyboard pattern: qwerty', () => {
      const result = validateAdminPin('qwerty');
      expect(result.valid).toBe(false);
      // 'qwerty' is in WEAK_PINS set, so caught as TOO_COMMON first
      expect(result.code).toBe('PIN_TOO_COMMON');
    });

    it('rejects keyboard pattern: asdfgh', () => {
      const result = validateAdminPin('asdfgh');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PIN_KEYBOARD_PATTERN');
    });
  });

  describe('assessPinStrength', () => {
    it('returns weak for short numeric PIN', () => {
      const result = assessPinStrength('1234');
      expect(result.strength).toBe('weak');
    });

    it('returns fair for longer PIN', () => {
      const result = assessPinStrength('abcdef');
      expect(result.strength).toBe('fair');
    });

    it('returns good for mixed alphanumeric', () => {
      const result = assessPinStrength('pass123');
      expect(result.strength).toBe('good');
    });

    it('returns strong for complex PIN', () => {
      const result = assessPinStrength('MyStr0ng!Pass');
      expect(result.strength).toBe('strong');
    });

    it('provides suggestions for weak PIN', () => {
      const result = assessPinStrength('1234');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('score is between 0 and 100', () => {
      const result = assessPinStrength('anypin');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

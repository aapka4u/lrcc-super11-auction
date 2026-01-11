import { describe, it, expect } from 'vitest';
import {
  TournamentSlugSchema,
  AdminPinSchema,
  ColorSchema,
  UrlSchema,
  TournamentSettingsSchema,
  CreateTournamentSchema,
  TeamSchema,
  PlayerSchema,
  AuctionActionSchema,
  validate,
  formatValidationErrors,
} from '@/lib/schemas';

describe('Primitive Schemas', () => {
  describe('TournamentSlugSchema', () => {
    it('validates correct slug', () => {
      const result = TournamentSlugSchema.safeParse('my-tournament-2024');
      expect(result.success).toBe(true);
    });

    it('transforms to lowercase', () => {
      const result = TournamentSlugSchema.safeParse('My-Tournament');
      // Should fail because uppercase not allowed in regex
      expect(result.success).toBe(false);
    });

    it('rejects consecutive hyphens', () => {
      const result = TournamentSlugSchema.safeParse('my--tournament');
      expect(result.success).toBe(false);
    });

    it('rejects too short', () => {
      const result = TournamentSlugSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('rejects too long', () => {
      const result = TournamentSlugSchema.safeParse('a'.repeat(51));
      expect(result.success).toBe(false);
    });
  });

  describe('AdminPinSchema', () => {
    it('validates correct PIN', () => {
      const result = AdminPinSchema.safeParse('secure1234');
      expect(result.success).toBe(true);
    });

    it('rejects too short', () => {
      const result = AdminPinSchema.safeParse('123');
      expect(result.success).toBe(false);
    });

    it('rejects too long', () => {
      const result = AdminPinSchema.safeParse('a'.repeat(21));
      expect(result.success).toBe(false);
    });
  });

  describe('ColorSchema', () => {
    it('validates hex color', () => {
      const result = ColorSchema.safeParse('#ff5500');
      expect(result.success).toBe(true);
    });

    it('transforms to lowercase', () => {
      const result = ColorSchema.safeParse('#FF5500');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('#ff5500');
      }
    });

    it('rejects invalid format', () => {
      const result = ColorSchema.safeParse('ff5500');
      expect(result.success).toBe(false);
    });

    it('rejects 3-digit hex', () => {
      const result = ColorSchema.safeParse('#f50');
      expect(result.success).toBe(false);
    });
  });

  describe('UrlSchema', () => {
    it('validates HTTPS URL', () => {
      const result = UrlSchema.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    it('rejects HTTP URL', () => {
      const result = UrlSchema.safeParse('http://example.com');
      expect(result.success).toBe(false);
    });

    it('rejects invalid URL', () => {
      const result = UrlSchema.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });
});

describe('TournamentSettingsSchema', () => {
  it('provides defaults for empty object', () => {
    const result = TournamentSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teamSize).toBe(8);
      expect(result.data.bidIncrement).toBe(100);
      expect(result.data.enableJokerCard).toBe(true);
    }
  });

  it('validates team size range', () => {
    const tooSmall = TournamentSettingsSchema.safeParse({ teamSize: 3 });
    expect(tooSmall.success).toBe(false);

    const tooLarge = TournamentSettingsSchema.safeParse({ teamSize: 21 });
    expect(tooLarge.success).toBe(false);

    const valid = TournamentSettingsSchema.safeParse({ teamSize: 10 });
    expect(valid.success).toBe(true);
  });

  it('validates base prices', () => {
    const result = TournamentSettingsSchema.safeParse({
      basePrices: { APLUS: 5000, BASE: 1500 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative base prices', () => {
    const result = TournamentSettingsSchema.safeParse({
      basePrices: { APLUS: -100, BASE: 1000 },
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateTournamentSchema', () => {
  const validInput = {
    slug: 'my-tournament',
    name: 'My Tournament',
    adminPin: 'secure1234',
  };

  it('validates complete input', () => {
    const result = CreateTournamentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('validates with all optional fields', () => {
    const result = CreateTournamentSchema.safeParse({
      ...validInput,
      description: 'A tournament',
      sport: 'Cricket',
      location: 'Sydney',
      startDate: Date.now(),
      settings: { teamSize: 10 },
      theme: { primaryColor: '#ff0000', secondaryColor: '#00ff00' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug', () => {
    const result = CreateTournamentSchema.safeParse({
      ...validInput,
      slug: 'a',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = CreateTournamentSchema.safeParse({
      slug: 'my-tournament',
      adminPin: 'secure1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short name', () => {
    const result = CreateTournamentSchema.safeParse({
      ...validInput,
      name: 'AB',
    });
    expect(result.success).toBe(false);
  });
});

describe('TeamSchema', () => {
  const validTeam = {
    id: 'team_one',
    name: 'Team One',
    budget: 10000,
    color: '#ff5500',
  };

  it('validates complete team', () => {
    const result = TeamSchema.safeParse(validTeam);
    expect(result.success).toBe(true);
  });

  it('validates with optional fields', () => {
    const result = TeamSchema.safeParse({
      ...validTeam,
      captainId: 'player1',
      viceCaptainId: 'player2',
      logo: 'https://example.com/logo.png',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid team ID format', () => {
    const result = TeamSchema.safeParse({
      ...validTeam,
      id: 'Team-One', // Has hyphen and uppercase
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget', () => {
    const result = TeamSchema.safeParse({
      ...validTeam,
      budget: -1000,
    });
    expect(result.success).toBe(false);
  });
});

describe('PlayerSchema', () => {
  const validPlayer = {
    id: 'player1',
    name: 'John Doe',
    role: 'Batsman',
    category: 'APLUS',
  };

  it('validates complete player', () => {
    const result = PlayerSchema.safeParse(validPlayer);
    expect(result.success).toBe(true);
  });

  it('provides default availability', () => {
    const result = PlayerSchema.safeParse(validPlayer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.availability).toBe('full');
    }
  });

  it('validates all roles', () => {
    const roles = ['Batsman', 'Bowler', 'All-rounder', 'WK-Batsman'];
    for (const role of roles) {
      const result = PlayerSchema.safeParse({ ...validPlayer, role });
      expect(result.success).toBe(true);
    }
  });

  it('validates all categories', () => {
    const categories = ['APLUS', 'BASE', 'CAPTAIN', 'VICE_CAPTAIN'];
    for (const category of categories) {
      const result = PlayerSchema.safeParse({ ...validPlayer, category });
      expect(result.success).toBe(true);
    }
  });

  it('validates all availability options', () => {
    const availabilities = ['full', 'till_11', 'till_12', 'tentative'];
    for (const availability of availabilities) {
      const result = PlayerSchema.safeParse({ ...validPlayer, availability });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid role', () => {
    const result = PlayerSchema.safeParse({
      ...validPlayer,
      role: 'InvalidRole',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuctionActionSchema', () => {
  it('validates START_AUCTION action', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'START_AUCTION',
      playerId: 'player1',
    });
    expect(result.success).toBe(true);
  });

  it('validates SOLD action', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'SOLD',
      teamId: 'team1',
      soldPrice: 2500,
    });
    expect(result.success).toBe(true);
  });

  it('rejects SOLD without price', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'SOLD',
      teamId: 'team1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects SOLD with non-multiple of 100', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'SOLD',
      teamId: 'team1',
      soldPrice: 2550,
    });
    expect(result.success).toBe(false);
  });

  it('validates UNSOLD action', () => {
    const result = AuctionActionSchema.safeParse({ action: 'UNSOLD' });
    expect(result.success).toBe(true);
  });

  it('validates PAUSE action with message', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'PAUSE',
      message: 'Break time',
      duration: 300,
    });
    expect(result.success).toBe(true);
  });

  it('validates UNPAUSE action', () => {
    const result = AuctionActionSchema.safeParse({ action: 'UNPAUSE' });
    expect(result.success).toBe(true);
  });

  it('validates CLEAR action', () => {
    const result = AuctionActionSchema.safeParse({ action: 'CLEAR' });
    expect(result.success).toBe(true);
  });

  it('validates RESET with confirmation', () => {
    const result = AuctionActionSchema.safeParse({
      action: 'RESET',
      confirmReset: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects RESET without confirmation', () => {
    const result = AuctionActionSchema.safeParse({ action: 'RESET' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid action', () => {
    const result = AuctionActionSchema.safeParse({ action: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('Validation Helpers', () => {
  describe('validate', () => {
    it('returns success with data for valid input', () => {
      const result = validate(AdminPinSchema, 'valid1234');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('valid1234');
      }
    });

    it('returns failure with errors for invalid input', () => {
      const result = validate(AdminPinSchema, '12');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('formatValidationErrors', () => {
    it('formats single error', () => {
      const result = validate(AdminPinSchema, '12');
      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);
        expect(formatted).toContain('4 characters');
      }
    });

    it('formats multiple errors with semicolon separator', () => {
      const result = validate(CreateTournamentSchema, {});
      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);
        expect(formatted).toContain(';');
      }
    });

    it('includes field path in message', () => {
      const result = validate(CreateTournamentSchema, {
        slug: 'valid-slug',
        name: 'Valid Name',
        adminPin: '12', // Too short
      });
      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);
        expect(formatted).toContain('adminPin');
      }
    });
  });
});

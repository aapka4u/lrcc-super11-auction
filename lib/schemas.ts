import { z } from 'zod';

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

export const TournamentSlugSchema = z
  .string()
  .min(3, 'Tournament ID must be at least 3 characters')
  .max(50, 'Tournament ID must be at most 50 characters')
  .regex(
    /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/,
    'Tournament ID can only contain lowercase letters, numbers, and hyphens'
  )
  .refine(slug => !slug.includes('--'), 'Cannot contain consecutive hyphens')
  .transform(slug => slug.toLowerCase());

export const AdminPinSchema = z
  .string()
  .min(4, 'PIN must be at least 4 characters')
  .max(20, 'PIN must be at most 20 characters');

export const CurrencySchema = z
  .string()
  .max(10)
  .default('₹');

export const ColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
  .transform(c => c.toLowerCase());

export const UrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine(
    url => url.startsWith('https://'),
    'URL must use HTTPS'
  );

export const OptionalUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine(
    url => url.startsWith('https://') || url.startsWith('http://'),
    'URL must use HTTP or HTTPS'
  )
  .optional();

// ============================================
// TOURNAMENT SETTINGS SCHEMA
// ============================================

export const TournamentSettingsSchema = z.object({
  teamSize: z
    .number()
    .int()
    .min(4, 'Team size must be at least 4')
    .max(20, 'Team size must be at most 20')
    .default(8),

  basePrices: z.object({
    APLUS: z
      .number()
      .int()
      .min(0)
      .max(1000000)
      .default(2500),
    BASE: z
      .number()
      .int()
      .min(0)
      .max(500000)
      .default(1000),
  }).default({ APLUS: 2500, BASE: 1000 }),

  bidIncrement: z
    .number()
    .int()
    .min(50)
    .max(10000)
    .default(100),

  currency: CurrencySchema.default('₹'),

  enableJokerCard: z.boolean().default(true),
  enableIntelligence: z.boolean().default(true),

  customRules: z
    .string()
    .max(2000)
    .optional(),
});

export type TournamentSettings = z.infer<typeof TournamentSettingsSchema>;

// ============================================
// TOURNAMENT CREATION SCHEMA
// ============================================

export const CreateTournamentSchema = z.object({
  slug: TournamentSlugSchema,
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),

  description: z
    .string()
    .max(500)
    .optional(),

  adminPin: AdminPinSchema,

  settings: TournamentSettingsSchema.optional(),

  // Optional metadata
  sport: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  logo: OptionalUrlSchema,

  theme: z.object({
    primaryColor: ColorSchema,
    secondaryColor: ColorSchema,
  }).optional(),
});

export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;

// ============================================
// TOURNAMENT UPDATE SCHEMA
// ============================================

// Separate update settings schema that allows deep partial
export const UpdateTournamentSettingsSchema = z.object({
  teamSize: z.number().int().min(4).max(20).optional(),
  basePrices: z.object({
    APLUS: z.number().int().min(0).max(1000000).optional(),
    BASE: z.number().int().min(0).max(500000).optional(),
  }).optional(),
  bidIncrement: z.number().int().min(50).max(10000).optional(),
  currency: z.string().max(10).optional(),
  enableJokerCard: z.boolean().optional(),
  enableIntelligence: z.boolean().optional(),
  customRules: z.string().max(2000).optional(),
}).optional();

export const UpdateTournamentSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),

  description: z
    .string()
    .max(500)
    .optional(),

  settings: UpdateTournamentSettingsSchema,

  sport: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  logo: OptionalUrlSchema,

  theme: z.object({
    primaryColor: ColorSchema,
    secondaryColor: ColorSchema,
  }).optional(),
});

export type UpdateTournamentInput = z.infer<typeof UpdateTournamentSchema>;

// ============================================
// TEAM SCHEMA
// ============================================

export const TeamSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Team ID must be lowercase alphanumeric with underscores'),

  name: z
    .string()
    .min(2)
    .max(50),

  budget: z
    .number()
    .int()
    .min(0)
    .max(10000000),

  color: ColorSchema,

  captainId: z.string().optional(),
  viceCaptainId: z.string().optional(),

  logo: OptionalUrlSchema,
});

export type TeamInput = z.infer<typeof TeamSchema>;

// ============================================
// PLAYER SCHEMA
// ============================================

export const PlayerRoleSchema = z.enum([
  'Batsman',
  'Bowler',
  'All-rounder',
  'WK-Batsman',
]);

export const PlayerCategorySchema = z.enum([
  'APLUS',
  'BASE',
  'CAPTAIN',
  'VICE_CAPTAIN',
]);

export const AvailabilitySchema = z.enum([
  'full',
  'till_11',
  'till_12',
  'tentative',
]);

export const PlayerSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(50),

  name: z
    .string()
    .min(2)
    .max(100),

  role: PlayerRoleSchema,
  category: PlayerCategorySchema,

  club: z.string().max(50).optional(),
  availability: AvailabilitySchema.default('full'),

  image: OptionalUrlSchema,
  cricHeroesUrl: OptionalUrlSchema,
});

export type PlayerInput = z.infer<typeof PlayerSchema>;

// ============================================
// AUCTION ACTION SCHEMAS
// ============================================

export const StartAuctionSchema = z.object({
  action: z.literal('START_AUCTION'),
  playerId: z.string().min(1),
});

export const SoldActionSchema = z.object({
  action: z.literal('SOLD'),
  teamId: z.string().min(1),
  soldPrice: z
    .number()
    .int()
    .positive()
    .refine(
      price => price % 100 === 0,
      'Price must be a multiple of 100'
    ),
});

export const UnsoldActionSchema = z.object({
  action: z.literal('UNSOLD'),
});

export const PauseActionSchema = z.object({
  action: z.literal('PAUSE'),
  message: z.string().max(200).optional(),
  duration: z.number().int().min(0).max(3600).optional(), // Max 1 hour
});

export const JokerActionSchema = z.object({
  action: z.literal('JOKER'),
  teamId: z.string().min(1),
});

export const CorrectActionSchema = z.object({
  action: z.literal('CORRECT'),
  playerId: z.string().min(1),
  fromTeamId: z.string().min(1),
  toTeamId: z.string().min(1),
});

export const AuctionActionSchema = z.discriminatedUnion('action', [
  StartAuctionSchema,
  SoldActionSchema,
  UnsoldActionSchema,
  PauseActionSchema,
  JokerActionSchema,
  CorrectActionSchema,
  z.object({ action: z.literal('UNPAUSE') }),
  z.object({ action: z.literal('CLEAR') }),
  z.object({ action: z.literal('VERIFY') }),
  z.object({ action: z.literal('RANDOM') }),
  z.object({
    action: z.literal('RESET'),
    confirmReset: z.literal(true),
  }),
]);

export type AuctionAction = z.infer<typeof AuctionActionSchema>;

// ============================================
// VALIDATION HELPER
// ============================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodError['errors'];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.errors };
}

export function formatValidationErrors(errors: z.ZodError['errors']): string {
  return errors
    .map(err => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join('; ');
}

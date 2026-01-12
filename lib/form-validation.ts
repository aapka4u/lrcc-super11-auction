import { z } from 'zod';
import {
  CreateTournamentSchema,
  TournamentSlugSchema,
  AdminPinSchema,
  formatValidationErrors,
} from '@/lib/schemas';

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}

/**
 * Validate tournament creation form data
 */
export function validateTournamentForm(data: unknown): ValidationResult {
  const result = CreateTournamentSchema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors: FieldError[] = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { valid: false, errors };
}

/**
 * Validate a single field
 */
export function validateField(field: string, value: unknown, schema: z.ZodSchema): FieldError | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return null;
  }
  return {
    field,
    message: result.error.errors[0]?.message || 'Invalid value',
  };
}

/**
 * Validate tournament slug
 */
export function validateSlug(slug: string): FieldError | null {
  return validateField('slug', slug, TournamentSlugSchema);
}

/**
 * Validate admin PIN
 */
export function validatePin(pin: string): FieldError | null {
  return validateField('adminPin', pin, AdminPinSchema);
}

/**
 * Format validation errors for display
 */
export function formatFieldErrors(errors: FieldError[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  errors.forEach((err) => {
    formatted[err.field] = err.message;
  });
  return formatted;
}

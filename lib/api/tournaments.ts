import { TournamentIndexEntry, Tournament } from '@/lib/tournament-types';
import { CreateTournamentInput } from '@/lib/schemas';

const API_BASE = '/api/tournaments';

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
  retryAfter?: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    }));

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again',
      SLUG_TAKEN: 'This tournament ID is already taken',
      RATE_LIMITED: 'You have created too many tournaments. Please try again later',
      UNAUTHORIZED: 'Authentication required',
      NOT_FOUND: 'Tournament not found',
      SERVER_ERROR: 'Server error. Please try again later',
    };

    const error = new Error(
      errorMessages[errorData.code || ''] || errorData.error || 'An error occurred'
    ) as Error & ApiError;
    error.code = errorData.code;
    error.details = errorData.details;
    error.retryAfter = errorData.retryAfter;
    throw error;
  }

  return response.json();
}

export async function getTournaments(): Promise<TournamentIndexEntry[]> {
  const response = await fetch(API_BASE, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await handleResponse<{ tournaments: TournamentIndexEntry[]; count: number }>(response);
  return data.tournaments;
}

export async function createTournament(data: CreateTournamentInput): Promise<Tournament> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await handleResponse<{ success: boolean; tournament: Tournament }>(response);
  return result.tournament;
}

export async function getTournament(slug: string): Promise<Tournament | null> {
  try {
    const response = await fetch(`${API_BASE}/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Tournament not found',
        code: 'NOT_FOUND',
      }));
      if (errorData.code === 'NOT_FOUND') {
        return null;
      }
      throw new Error(errorData.error || 'Failed to fetch tournament');
    }

    const data = await handleResponse<{ tournament: Tournament }>(response);
    return data.tournament;
  } catch (error) {
    if ((error as Error & { code?: string }).code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestions?: string[] }> {
  try {
    // Try to get tournament - if 404, slug is available
    const tournament = await getTournament(slug);
    if (!tournament) {
      return { available: true };
    }

    // Slug is taken, generate suggestions
    const suggestions = [
      `${slug}-2`,
      `${slug}-${new Date().getFullYear()}`,
      `${slug}-${Math.floor(Math.random() * 1000)}`,
    ];

    return { available: false, suggestions };
  } catch (error) {
    // If error is not 404, assume slug is available (optimistic)
    if ((error as Error & { code?: string }).code === 'NOT_FOUND') {
      return { available: true };
    }
    // Network error - return available optimistically
    return { available: true };
  }
}

import { useState, useEffect, useRef } from 'react';
import { checkSlugAvailability } from '@/lib/api/tournaments';

interface SlugAvailabilityResult {
  available: boolean | null; // null = checking
  suggestions?: string[];
  error: string | null;
}

export function useSlugAvailability(slug: string, debounceMs: number = 500): SlugAvailabilityResult {
  const [result, setResult] = useState<SlugAvailabilityResult>({
    available: null,
    error: null,
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't check empty slugs
    if (!slug || slug.trim().length < 3) {
      setResult({ available: null, error: null });
      return;
    }

    // Set checking state
    setResult({ available: null, error: null });

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const availability = await checkSlugAvailability(slug);
        if (!abortController.signal.aborted) {
          setResult({
            available: availability.available,
            suggestions: availability.suggestions,
            error: null,
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          setResult({
            available: null,
            error: error instanceof Error ? error.message : 'Failed to check availability',
          });
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [slug, debounceMs]);

  return result;
}

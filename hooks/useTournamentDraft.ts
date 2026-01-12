import { useState, useEffect, useCallback, useRef } from 'react';
import { CreateTournamentInput } from '@/lib/schemas';

const DRAFT_KEY_PREFIX = 'tournament-draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface DraftData extends Partial<CreateTournamentInput> {
  step?: number;
  lastSaved?: number;
}

export function useTournamentDraft() {
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    const draftKey = Object.keys(localStorage)
      .find((key) => key.startsWith(DRAFT_KEY_PREFIX));
    
    if (draftKey) {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved) as DraftData;
          // Only load drafts from last 24 hours
          if (parsed.lastSaved && Date.now() - parsed.lastSaved < 24 * 60 * 60 * 1000) {
            setDraft(parsed);
            setHasDraft(true);
          } else {
            // Clear old draft
            localStorage.removeItem(draftKey);
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  // Save draft
  const saveDraft = useCallback((data: DraftData) => {
    const draftKey = `${DRAFT_KEY_PREFIX}-${Date.now()}`;
    const draftData: DraftData = {
      ...data,
      lastSaved: Date.now(),
    };

    try {
      // Remove old drafts
      Object.keys(localStorage)
        .filter((key) => key.startsWith(DRAFT_KEY_PREFIX))
        .forEach((key) => localStorage.removeItem(key));

      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setDraft(draftData);
      setHasDraft(true);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, []);

  // Auto-save with debounce
  const autoSave = useCallback((data: DraftData) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(data);
    }, AUTO_SAVE_INTERVAL);
  }, [saveDraft]);

  // Clear draft
  const clearDraft = useCallback(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(DRAFT_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
    
    setDraft(null);
    setHasDraft(false);
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  }, []);

  // Resume draft
  const resumeDraft = useCallback(() => {
    return draft;
  }, [draft]);

  return {
    draft,
    hasDraft,
    saveDraft,
    autoSave,
    clearDraft,
    resumeDraft,
  };
}

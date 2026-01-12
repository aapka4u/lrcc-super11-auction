'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTournamentInput } from '@/lib/schemas';
import { useTournamentDraft } from '@/hooks/useTournamentDraft';
import { useSlugAvailability } from '@/hooks/useSlugAvailability';
import { usePinStrength } from '@/hooks/usePinStrength';
import { validateTournamentForm, formatFieldErrors } from '@/lib/form-validation';
import { createTournament } from '@/lib/api/tournaments';
import { useToast, ToastContainer } from './Toast';
import confetti from 'canvas-confetti';

interface CreateTournamentWizardProps {
  onSuccess?: (tournamentId: string) => void;
}

const TOTAL_STEPS = 5;

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

// Color presets
const COLOR_PRESETS = [
  { name: 'Blue', primary: '#3b82f6', secondary: '#8b5cf6' },
  { name: 'Green', primary: '#10b981', secondary: '#06b6d4' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#ec4899' },
  { name: 'Orange', primary: '#f59e0b', secondary: '#ef4444' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#06b6d4' },
];

export function CreateTournamentWizard({ onSuccess }: CreateTournamentWizardProps) {
  const router = useRouter();
  const toastHook = useToast();
  const { toasts, dismissToast } = toastHook;
  const { draft, hasDraft, saveDraft, autoSave, clearDraft, resumeDraft } = useTournamentDraft();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTournamentInput>>({
    name: '',
    slug: '',
    sport: 'Cricket',
    description: '',
    location: '',
    adminPin: '',
    theme: {
      primaryColor: COLOR_PRESETS[0].primary,
      secondaryColor: COLOR_PRESETS[0].secondary,
    },
  });

  // Check for draft on mount
  useEffect(() => {
    if (hasDraft && draft) {
      setShowDraftBanner(true);
    }
  }, [hasDraft, draft]);

  // Resume draft
  const handleResumeDraft = () => {
    const savedDraft = resumeDraft();
    if (savedDraft) {
      setFormData(savedDraft as Partial<CreateTournamentInput>);
      setCurrentStep(savedDraft.step || 1);
      setShowDraftBanner(false);
    }
  };

  // Auto-save draft
  useEffect(() => {
    if (formData.name || formData.slug) {
      autoSave({
        ...formData,
        step: currentStep,
      } as any);
    }
  }, [formData, currentStep, autoSave]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && currentStep === 1 && !formData.slug) {
      const generated = generateSlug(formData.name);
      setFormData((prev) => ({ ...prev, slug: generated }));
    }
  }, [formData.name, currentStep]);

  // Slug availability check
  const slugAvailability = useSlugAvailability(formData.slug || '', 500);

  // PIN strength
  const pinStrength = usePinStrength(formData.adminPin || '');

  // Update form field
  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear error for this field
      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
      return updated;
    });
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name || formData.name.length < 3) {
        errors.name = 'Name must be at least 3 characters';
      }
      if (!formData.slug || formData.slug.length < 3) {
        errors.slug = 'Slug must be at least 3 characters';
      } else if (slugAvailability.available === false) {
        errors.slug = 'This slug is already taken';
      }
      if (!formData.sport) {
        errors.sport = 'Please select a sport';
      }
    }

    if (step === 2) {
      // Dates are optional, but if provided, validate
      if (formData.startDate && formData.endDate) {
        if (formData.endDate < formData.startDate) {
          errors.endDate = 'End date must be after start date';
        }
      }
      if (formData.startDate && formData.startDate < Date.now()) {
        errors.startDate = 'Start date cannot be in the past';
      }
    }

    if (step === 3) {
      if (!formData.adminPin || formData.adminPin.length < 4) {
        errors.adminPin = 'PIN must be at least 4 characters';
      } else if (pinStrength.strength === 'weak') {
        errors.adminPin = 'PIN is too weak. ' + pinStrength.feedback[0];
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigate to next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Navigate to previous step
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Final validation
    const validation = validateTournamentForm(formData);
    if (!validation.valid) {
      const errors = formatFieldErrors(validation.errors);
      setFieldErrors(errors);
      toastHook.error('Please fix the errors before submitting');
      setCurrentStep(1); // Go to first step with errors
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTournament(formData as CreateTournamentInput);
      
      // Clear draft
      clearDraft();

      // Success animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toastHook.success('Tournament created successfully!', 3000);

      // Redirect after delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.id);
        } else {
          router.push(`/tournaments/${result.id}/admin`);
        }
      }, 2000);
    } catch (error: any) {
      setIsSubmitting(false);
      
      // Handle different error types
      if (error.code === 'RATE_LIMITED') {
        toastHook.error(error.message || 'Rate limit exceeded. Please try again later.');
      } else if (error.code === 'SLUG_TAKEN' || error.message?.includes('slug') || error.message?.includes('already taken')) {
        setFieldErrors({ slug: error.message || 'This slug is already taken' });
        setCurrentStep(1);
        toastHook.error('Please choose a different slug');
      } else if (error.code === 'VALIDATION_ERROR' && error.details) {
        // Map validation errors to fields
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.details).forEach(([field, message]) => {
          fieldErrors[field] = String(message);
        });
        setFieldErrors(fieldErrors);
        toastHook.error('Please fix the errors before submitting');
      } else {
        toastHook.error(error.message || 'Failed to create tournament. Please try again.');
      }
    }
  };

  // Step 1: Basic Info
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
          Tournament Name *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Sunday League 2026"
          className={`
            w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-white/40
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${fieldErrors.name ? 'border-red-500' : 'border-white/20'}
          `}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-400" role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-semibold text-white mb-2">
          Tournament ID (URL) *
        </label>
        <div className="relative">
          <input
            id="slug"
            type="text"
            value={formData.slug || ''}
            onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
            placeholder="sunday-league-2026"
          className={`
            w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-white/40
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${fieldErrors.slug ? 'border-red-500' : slugAvailability.available === true ? 'border-green-500' : 'border-white/20'}
          `}
            aria-invalid={!!fieldErrors.slug}
            aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
          />
          {slugAvailability.available === true && formData.slug && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">✓</span>
          )}
          {slugAvailability.available === false && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">✕</span>
          )}
        </div>
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-red-400" role="alert">
            {fieldErrors.slug}
          </p>
        )}
        {slugAvailability.suggestions && slugAvailability.suggestions.length > 0 && (
          <p className="mt-2 text-sm text-white/60">
            Suggestions: {slugAvailability.suggestions.join(', ')}
          </p>
        )}
        <p className="mt-1 text-xs text-white/40">
          This will be used in the URL: /tournaments/{formData.slug || 'your-tournament-id'}
        </p>
      </div>

      <div>
        <label htmlFor="sport" className="block text-sm font-semibold text-white mb-2">
          Sport *
        </label>
        <select
          id="sport"
          value={formData.sport || 'Cricket'}
          onChange={(e) => updateField('sport', e.target.value)}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Cricket">Cricket</option>
          <option value="Football">Football</option>
          <option value="Basketball">Basketball</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
  );

  // Step 2: Details
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-semibold text-white mb-2">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => updateField('startDate', e.target.value ? new Date(e.target.value).getTime() : undefined)}
            min={new Date().toISOString().split('T')[0]}
            className={`
              w-full px-4 py-3 rounded-xl bg-white/10 border text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${fieldErrors.startDate ? 'border-red-500' : 'border-white/20'}
            `}
          />
          {fieldErrors.startDate && (
            <p className="mt-1 text-sm text-red-400">{fieldErrors.startDate}</p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-semibold text-white mb-2">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => updateField('endDate', e.target.value ? new Date(e.target.value).getTime() : undefined)}
            min={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            className={`
              w-full px-4 py-3 rounded-xl bg-white/10 border text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${fieldErrors.endDate ? 'border-red-500' : 'border-white/20'}
            `}
          />
          {fieldErrors.endDate && (
            <p className="mt-1 text-sm text-red-400">{fieldErrors.endDate}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-semibold text-white mb-2">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={formData.location || ''}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="e.g., Parkwijk Utrecht"
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Tell us about your tournament..."
          rows={4}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );

  // Step 3: Security
  const renderStep3 = () => {
    const strengthColors = {
      weak: 'bg-red-500',
      medium: 'bg-amber-500',
      strong: 'bg-green-500',
    };

    return (
      <div className="space-y-6">
        <div>
          <label htmlFor="adminPin" className="block text-sm font-semibold text-white mb-2">
            Admin PIN *
          </label>
          <div className="relative">
            <input
              id="adminPin"
              type="password"
              value={formData.adminPin || ''}
              onChange={(e) => updateField('adminPin', e.target.value)}
              placeholder="Enter 4-20 character PIN"
              className={`
                w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border text-white placeholder:text-white/40
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${fieldErrors.adminPin ? 'border-red-500' : 'border-white/20'}
              `}
              aria-invalid={!!fieldErrors.adminPin}
              aria-describedby={fieldErrors.adminPin ? 'pin-error' : 'pin-strength'}
            />
          </div>
          {fieldErrors.adminPin && (
            <p id="pin-error" className="mt-1 text-sm text-red-400" role="alert">
              {fieldErrors.adminPin}
            </p>
          )}
          {formData.adminPin && !fieldErrors.adminPin && (
            <div id="pin-strength" className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColors[pinStrength.strength]}`}
                    style={{ width: `${pinStrength.score}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 capitalize">{pinStrength.strength}</span>
              </div>
              {pinStrength.feedback.length > 0 && (
                <p className="text-xs text-white/60">{pinStrength.feedback[0]}</p>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-white/40">
            You'll need this PIN to manage your tournament. Keep it safe!
          </p>
        </div>
      </div>
    );
  };

  // Step 4: Theme
  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-white mb-4">
          Choose Theme Colors
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              formData.theme?.primaryColor === preset.primary &&
              formData.theme?.secondaryColor === preset.secondary;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  updateField('theme', {
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                  })
                }
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${isSelected ? 'border-white ring-2 ring-blue-500' : 'border-white/20'}
                `}
                style={{
                  background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                }}
                aria-label={`Select ${preset.name} theme`}
              >
                <span className="text-white font-semibold text-sm">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="logo" className="block text-sm font-semibold text-white mb-2">
          Logo URL (Optional)
        </label>
        <input
          id="logo"
          type="url"
          value={formData.logo || ''}
          onChange={(e) => updateField('logo', e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-white/40">
          Must be a valid HTTPS URL. Max 1MB recommended.
        </p>
      </div>
    </div>
  );

  // Step 5: Review
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="glass-elevated rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">Review Your Tournament</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-white/60">Name:</span>
            <span className="text-white ml-2 font-semibold">{formData.name}</span>
          </div>
          <div>
            <span className="text-white/60">ID:</span>
            <span className="text-white ml-2 font-mono">{formData.slug}</span>
          </div>
          <div>
            <span className="text-white/60">Sport:</span>
            <span className="text-white ml-2">{formData.sport}</span>
          </div>
          {formData.location && (
            <div>
              <span className="text-white/60">Location:</span>
              <span className="text-white ml-2">{formData.location}</span>
            </div>
          )}
          {formData.startDate && (
            <div>
              <span className="text-white/60">Start Date:</span>
              <span className="text-white ml-2">
                {new Date(formData.startDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-white/60 text-sm mb-4">
          Ready to create your tournament? Click the button below.
        </p>
      </div>
    </div>
  );

  const stepTitles = [
    'Basic Information',
    'Details',
    'Security',
    'Theme',
    'Review',
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Draft Banner */}
      {showDraftBanner && (
        <div className="mb-6 glass-elevated rounded-xl p-4 border border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold mb-1">Resume your draft?</p>
              <p className="text-white/60 text-sm">You have unsaved changes from earlier.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDraftBanner(false)}
                className="min-h-[44px] px-4 py-2 text-white/60 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
          aria-label="Dismiss draft banner"
              >
                Dismiss
              </button>
              <button
                onClick={handleResumeDraft}
                className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Resume draft"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span className="text-sm text-white/60">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">{stepTitles[currentStep - 1]}</h2>
      </div>

      {/* Step Content */}
      <div className="glass-elevated rounded-2xl p-6 md:p-8 border border-white/20 mb-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pb-8" style={{ paddingBottom: 'env(safe-area-inset-bottom, 2rem)' }}>
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={`
            min-h-[44px] px-6 py-3 rounded-xl font-semibold transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${currentStep === 1
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : 'bg-white/10 hover:bg-white/20 text-white'
            }
          `}
          aria-label={currentStep === 1 ? 'Cannot go back' : 'Go to previous step'}
        >
          Back
        </button>

        {currentStep < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            className="min-h-[44px] px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go to next step"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              min-h-[44px] px-6 py-3 rounded-xl font-semibold transition-all flex-1
              focus:outline-none focus:ring-2 focus:ring-green-500
              ${isSubmitting
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
              }
            `}
          aria-label={isSubmitting ? 'Creating tournament...' : 'Create tournament'}
          >
            {isSubmitting ? 'Creating...' : 'Create Tournament'}
          </button>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export type PinStrength = 'weak' | 'medium' | 'strong';

export interface PinStrengthResult {
  strength: PinStrength;
  score: number; // 0-100
  feedback: string[];
}

/**
 * Calculate PIN strength
 */
export function calculatePinStrength(pin: string): PinStrengthResult {
  if (!pin || pin.length < 4) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['PIN must be at least 4 characters'],
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (pin.length >= 4) score += 20;
  if (pin.length >= 6) score += 20;
  if (pin.length >= 8) score += 20;
  if (pin.length >= 12) score += 20;

  // Complexity scoring
  const hasNumbers = /\d/.test(pin);
  const hasLetters = /[a-zA-Z]/.test(pin);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pin);

  if (hasNumbers) score += 10;
  if (hasLetters) score += 10;
  if (hasSpecial) score += 10;

  // Penalties for common patterns
  if (/^(\d)\1+$/.test(pin)) {
    // All same digit
    score -= 30;
    feedback.push('Avoid repeating the same digit');
  }

  if (/^(0123|1234|2345|3456|4567|5678|6789|7890)$/.test(pin)) {
    // Sequential numbers
    score -= 30;
    feedback.push('Avoid sequential numbers');
  }

  if (/^(qwerty|asdfgh|password|admin)$/i.test(pin)) {
    // Common passwords
    score -= 40;
    feedback.push('Avoid common passwords');
  }

  // Determine strength
  let strength: PinStrength = 'weak';
  if (score >= 70) {
    strength = 'strong';
    if (feedback.length === 0) {
      feedback.push('Strong PIN');
    }
  } else if (score >= 40) {
    strength = 'medium';
    if (feedback.length === 0) {
      feedback.push('Consider adding numbers or special characters');
    }
  } else {
    strength = 'weak';
    if (feedback.length === 0) {
      feedback.push('Use 6+ characters with numbers');
    }
  }

  return { strength, score: Math.max(0, Math.min(100, score)), feedback };
}

/**
 * Hook to calculate PIN strength reactively
 */
export function usePinStrength(pin: string): PinStrengthResult {
  return calculatePinStrength(pin);
}

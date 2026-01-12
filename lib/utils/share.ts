/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

/**
 * Share via Web Share API (mobile) or fallback to clipboard
 */
export async function shareTournament(url: string, title: string): Promise<boolean> {
  const shareData = {
    title: title,
    text: `Check out this tournament: ${title}`,
    url: url,
  };

  try {
    // Try Web Share API first (mobile)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    }
  } catch (error: any) {
    // User cancelled or error - fallback to clipboard
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
    }
  }

  // Fallback to clipboard
  return copyToClipboard(url);
}

/**
 * Get tournament share URL
 */
export function getTournamentUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/tournaments/${slug}`;
}

import { SWRConfiguration } from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'Failed to fetch');
  }
  return response.json();
};

export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  onError: (error) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('SWR Error:', error);
    }
  },
};

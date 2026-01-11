import { vi } from 'vitest';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.NODE_ENV = 'test';

// Mock @vercel/kv with in-memory storage
const kvStore = new Map<string, { value: unknown; expiry?: number }>();

// Deep clone utility - handles arrays, objects, primitives, Sets, Maps, Dates
// Includes circular reference protection to prevent infinite recursion
function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  // Handle primitives and null
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  
  // Check for circular references
  if (seen.has(value as object)) {
    return seen.get(value as object) as T;
  }
  
  // Handle Arrays
  if (Array.isArray(value)) {
    // Create empty array and add to seen map BEFORE recursing to catch circular refs
    const cloned: unknown[] = [];
    seen.set(value as object, cloned);
    // Now recurse - if any item references the parent array, seen map will catch it
    for (const item of value) {
      cloned.push(deepClone(item, seen));
    }
    return cloned as T;
  }
  
  // Handle Sets
  if (value instanceof Set) {
    // Create empty set and add to seen map BEFORE recursing to catch circular refs
    const cloned = new Set<unknown>();
    seen.set(value as object, cloned);
    // Now recurse - if any item references the parent set, seen map will catch it
    for (const item of value) {
      cloned.add(deepClone(item, seen));
    }
    return cloned as T;
  }
  
  // Handle Maps
  if (value instanceof Map) {
    const cloned = new Map();
    seen.set(value as object, cloned);
    value.forEach((val, key) => {
      cloned.set(deepClone(key, seen), deepClone(val, seen));
    });
    return cloned as T;
  }
  
  // Handle plain objects
  const cloned = {} as T;
  seen.set(value as object, cloned);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      (cloned as Record<string, unknown>)[key] = deepClone((value as Record<string, unknown>)[key], seen);
    }
  }
  return cloned;
}

// Fake timer-aware Date.now() - respects vi.useFakeTimers()
// When fake timers are active via vi.useFakeTimers(), returns the mocked time.
// Falls back to real Date.now() if:
//   - Fake timers are not active
//   - vi.getMockedSystemTime() is not available (older Vitest versions)
// This ensures TTL/expiry checks work correctly in both real and fake timer scenarios.
function getNow(): number {
  try {
    const mockedTime = vi.getMockedSystemTime();
    if (mockedTime !== null) {
      return mockedTime.getTime();
    }
  } catch {
    // vi.getMockedSystemTime() might not be available in all vitest versions
    // Fall through to real Date.now() - this is safe because if fake timers
    // aren't available, tests aren't using them, so real time is correct.
  }
  return Date.now();
}

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      const item = kvStore.get(key);
      if (!item) return null;
      if (item.expiry && getNow() > item.expiry) {
        kvStore.delete(key);
        return null;
      }
      return deepClone(item.value) as T;
    }),
    set: vi.fn(async (key: string, value: unknown, options?: { ex?: number }) => {
      const expiry = options?.ex ? getNow() + options.ex * 1000 : undefined;
      kvStore.set(key, { value: deepClone(value), expiry });
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      kvStore.delete(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => {
      const item = kvStore.get(key);
      const currentValue = item ? (item.value as number) : 0;
      const newValue = currentValue + 1;
      kvStore.set(key, { value: newValue, expiry: item?.expiry });
      return newValue;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      const item = kvStore.get(key);
      if (item) {
        item.expiry = getNow() + seconds * 1000;
        return 1;
      }
      return 0;
    }),
    ttl: vi.fn(async (key: string) => {
      const item = kvStore.get(key);
      if (!item || !item.expiry) return -1;
      const remaining = Math.ceil((item.expiry - getNow()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),
    lpush: vi.fn(async (key: string, value: unknown) => {
      const item = kvStore.get(key);
      const list = item ? deepClone(item.value as unknown[]) : [];
      list.unshift(value);
      kvStore.set(key, { value: list, expiry: item?.expiry });
      return list.length;
    }),
    lrange: vi.fn(async (key: string, start: number, stop: number) => {
      const item = kvStore.get(key);
      if (!item) return [];
      const list = item.value as unknown[];
      return deepClone(list.slice(start, stop + 1));
    }),
    ltrim: vi.fn(async (key: string, start: number, stop: number) => {
      const item = kvStore.get(key);
      if (!item) return 'OK';
      const list = deepClone(item.value as unknown[]);
      kvStore.set(key, { value: list.slice(start, stop + 1), expiry: item?.expiry });
      return 'OK';
    }),
    llen: vi.fn(async (key: string) => {
      const item = kvStore.get(key);
      if (!item) return 0;
      return (item.value as unknown[]).length;
    }),
    exists: vi.fn(async (key: string) => {
      return kvStore.has(key) ? 1 : 0;
    }),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      const item = kvStore.get(key);
      const set = item ? deepClone(item.value as Set<string>) : new Set<string>();
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      kvStore.set(key, { value: set, expiry: item?.expiry });
      return added;
    }),
    smembers: vi.fn(async (key: string) => {
      const item = kvStore.get(key);
      if (!item) return [];
      return deepClone(Array.from(item.value as Set<string>));
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      const item = kvStore.get(key);
      if (!item) return 0;
      const set = deepClone(item.value as Set<string>);
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed++;
      }
      kvStore.set(key, { value: set, expiry: item?.expiry });
      return removed;
    }),
  },
}));

// Export kvStore for test manipulation
export const mockKvStore = kvStore;

// Helper to clear store between tests
export function clearKvStore() {
  kvStore.clear();
}

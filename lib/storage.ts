import { kv } from '@vercel/kv';

export const storage = {
  get: kv.get.bind(kv),
  set: (key: string, value: any, options?: { ex?: number }) => kv.set(key, value, options),
  del: kv.del?.bind(kv) || (() => Promise.resolve()),
};

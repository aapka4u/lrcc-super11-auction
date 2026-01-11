import { kv } from '@vercel/kv';

export const storage = {
  get: kv.get.bind(kv),
  set: (key: string, value: any, options?: { ex: number }) =>
    options ? kv.set(key, value, options) : kv.set(key, value),
  del: kv.del?.bind(kv) || (() => Promise.resolve()),
};

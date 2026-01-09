import { kv } from '@vercel/kv';

export const storage = {
  get: kv.get.bind(kv),
  set: kv.set.bind(kv),
  del: kv.del?.bind(kv) || (() => Promise.resolve()),
};

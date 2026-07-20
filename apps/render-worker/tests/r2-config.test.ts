import { describe, expect, it } from 'vitest';
import { r2ConfigFromEnv } from '../src/storage/r2.js';

const FULL = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'key123',
  R2_SECRET_ACCESS_KEY: 'secret123',
};

describe('r2ConfigFromEnv', () => {
  it('builds a config when all credentials are present', () => {
    const cfg = r2ConfigFromEnv({ ...FULL, R2_BUCKET: 'giftlab-prod' });
    expect(cfg).toEqual({
      accountId: 'acc123',
      accessKeyId: 'key123',
      secretAccessKey: 'secret123',
      bucket: 'giftlab-prod',
      publicBase: undefined,
    });
  });

  it('defaults the bucket name', () => {
    expect(r2ConfigFromEnv({ ...FULL })?.bucket).toBe('giftlab');
  });

  it('carries the optional public base', () => {
    expect(r2ConfigFromEnv({ ...FULL, R2_PUBLIC_BASE: 'https://cdn.example.com' })?.publicBase).toBe(
      'https://cdn.example.com',
    );
  });

  // a half-configured R2 must NOT look usable — the worker falls back to local disk
  // rather than failing at the first upload of a paid order
  it.each(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const)(
    'returns null when %s is missing',
    (missing) => {
      const env = { ...FULL } as Record<string, string | undefined>;
      delete env[missing];
      expect(r2ConfigFromEnv(env)).toBeNull();
    },
  );

  it('returns null for an empty environment', () => {
    expect(r2ConfigFromEnv({})).toBeNull();
  });
});

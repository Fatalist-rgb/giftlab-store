import { z } from 'zod';

/**
 * Single source of truth for runtime configuration. Every app validates its
 * environment through this schema at boot, so a missing/invalid variable fails
 * fast and loudly instead of surfacing as a confusing runtime error later.
 */
export const envSchema = z.object({
  // Database / cache
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Cloudflare R2 (optional until the client provides credentials)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('giftlab'),
  R2_PUBLIC_BASE: z.string().url().optional(),

  // Payments — Przelewy24
  P24_MERCHANT_ID: z.string().optional(),
  P24_POS_ID: z.string().optional(),
  P24_CRC: z.string().optional(),
  P24_API_KEY: z.string().optional(),
  P24_SANDBOX: z.coerce.boolean().default(true),

  // Background removal
  CUTOUT_PROVIDER: z.enum(['mock', 'removebg', 'photoroom', 'clipdrop']).default('mock'),
  CUTOUT_API_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('hej@giftlab.pl'),

  // Analytics (consent-gated)
  NEXT_PUBLIC_GTM_ID: z.string().optional(),

  // i18n
  LOCALES: z.string().default('pl,en,uk'),
  DEFAULT_LOCALE: z.string().default('pl'),
});

export type Env = z.infer<typeof envSchema>;

/** Parse and validate an environment bag (e.g. `process.env`). Throws on invalid input. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  return envSchema.parse(raw);
}

/** Comma-separated `LOCALES` as a typed list. */
export function localeList(env: Pick<Env, 'LOCALES'>): string[] {
  return env.LOCALES.split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

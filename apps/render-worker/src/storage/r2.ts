import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { PackageStorage, StoredObject } from './types.js';

/**
 * Cloudflare R2 is S3-compatible, so the production adapter is the S3 client pointed at
 * the account's R2 endpoint. It implements the same `PackageStorage` port as the local
 * disk adapter — the worker itself is unaware which one it is running against.
 */
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** optional public base URL, when a bucket is exposed for customer-facing previews */
  publicBase?: string;
  /** R2 jurisdiction ("eu" keeps the data in the EU — RODO); affects the endpoint host */
  jurisdiction?: string;
}

export function createR2Client(cfg: R2Config): S3Client {
  const host = cfg.jurisdiction
    ? `${cfg.accountId}.${cfg.jurisdiction}.r2.cloudflarestorage.com`
    : `${cfg.accountId}.r2.cloudflarestorage.com`;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${host}`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export function createR2Storage(cfg: R2Config, client: S3Client = createR2Client(cfg)): PackageStorage {
  return {
    async put(key, body, contentType): Promise<StoredObject> {
      const bytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
      await client.send(
        new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: bytes, ContentType: contentType }),
      );
      const locator = cfg.publicBase
        ? `${cfg.publicBase.replace(/\/$/, '')}/${key}`
        : `r2://${cfg.bucket}/${key}`;
      return { key, locator, bytes: bytes.byteLength };
    },
  };
}

/** Read the R2 configuration from the environment; null when it is not fully configured. */
export function r2ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET ?? 'giftlab',
    publicBase: env.R2_PUBLIC_BASE,
    jurisdiction: env.R2_JURISDICTION || undefined,
  };
}

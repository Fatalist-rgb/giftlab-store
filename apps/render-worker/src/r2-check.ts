import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, createR2Storage, r2ConfigFromEnv } from './storage/r2.js';

/**
 * Verify the Cloudflare R2 credentials end to end: write a small object, read it back,
 * delete it. Run this once the bucket and API token exist — it never prints the secrets.
 *
 *   pnpm --filter render-worker r2:check
 */
async function main() {
  const cfg = r2ConfigFromEnv();
  if (!cfg) {
    throw new Error(
      'R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY',
    );
  }
  console.log(`account ${cfg.accountId.slice(0, 6)}…, bucket "${cfg.bucket}"`);

  const client = createR2Client(cfg);
  const storage = createR2Storage(cfg, client);
  const key = 'healthcheck/r2-check.txt';
  const payload = `giftlab r2 check\n`;

  const stored = await storage.put(key, payload, 'text/plain');
  console.log(`  write ok — ${stored.bytes} bytes -> ${stored.locator}`);

  const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const readBack = await res.Body!.transformToString();
  if (readBack !== payload) throw new Error('read-back mismatch');
  console.log('  read ok — content matches');

  await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  console.log('  delete ok — R2 is ready');
}

main().catch((err) => {
  console.error(`r2:check failed — ${(err as Error).message}`);
  process.exit(1);
});

import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';

/**
 * Resolve schema asset keys to bytes from R2 — the production counterpart of the local
 * asset loader. Keys are stored without a leading slash, so "/art/body-blue.png" and
 * "art/body-blue.png" address the same object.
 */
export function createR2AssetResolver(client: S3Client, bucket: string) {
  return async (keys: string[]): Promise<Map<string, Uint8Array>> => {
    const out = new Map<string, Uint8Array>();
    await Promise.all(
      keys.map(async (key) => {
        const res = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key.replace(/^\//, '') }),
        );
        if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
        out.set(key, await res.Body.transformToByteArray());
      }),
    );
    return out;
  };
}

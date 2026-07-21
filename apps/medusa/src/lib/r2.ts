import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Cloudflare R2 access for the Medusa backend (T022): presigned browser PUTs for photo
 * uploads plus direct object IO for normalization. Configured via R2_* env (the same
 * variables the render worker uses); `R2_JURISDICTION=eu` keeps customer photos in the
 * EU (RODO) and switches the endpoint host accordingly.
 */
export interface R2Env {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  jurisdiction?: string
}

export function r2EnvOrNull(env: NodeJS.ProcessEnv = process.env): R2Env | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET ?? 'giftlab-prod',
    jurisdiction: env.R2_JURISDICTION || undefined,
  }
}

let cached: { client: S3Client; env: R2Env } | null = null

export function r2Client(): { client: S3Client; env: R2Env } {
  if (cached) return cached
  const env = r2EnvOrNull()
  if (!env) throw new Error('R2 is not configured (set R2_ACCOUNT_ID / keys / bucket)')
  const host = env.jurisdiction
    ? `${env.accountId}.${env.jurisdiction}.r2.cloudflarestorage.com`
    : `${env.accountId}.r2.cloudflarestorage.com`
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${host}`,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  })
  cached = { client, env }
  return cached
}

export const r2Configured = () => r2EnvOrNull() !== null

/** Presigned PUT the browser uploads to directly (no photo bytes through the backend). */
export async function presignPut(key: string, contentType: string, ttlSeconds = 600): Promise<string> {
  const { client, env } = r2Client()
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: env.bucket, Key: key, ContentType: contentType }),
    { expiresIn: ttlSeconds },
  )
}

/** Presigned GET for operator downloads (production packages) — short-lived. */
export async function presignGet(key: string, ttlSeconds = 900, downloadName?: string): Promise<string> {
  const { client, env } = r2Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.bucket,
      Key: key.replace(/^\//, ''),
      ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName}"` : undefined,
    }),
    { expiresIn: ttlSeconds },
  )
}

export async function headObject(key: string) {
  const { client, env } = r2Client()
  try {
    return await client.send(new HeadObjectCommand({ Bucket: env.bucket, Key: key }))
  } catch {
    return null
  }
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const { client, env } = r2Client()
  const res = await client.send(new GetObjectCommand({ Bucket: env.bucket, Key: key }))
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`)
  return res.Body.transformToByteArray()
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const { client, env } = r2Client()
  await client.send(
    new PutObjectCommand({ Bucket: env.bucket, Key: key, Body: body, ContentType: contentType }),
  )
}

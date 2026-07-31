/**
 * Browser-side photo upload: sign on the backend (via the Next proxy), PUT the original
 * and the browser-produced cutout STRAIGHT to R2 (presigned URLs, CORS), then finalize —
 * the backend normalizes the master (HEIC/EXIF/metadata) and records the RODO consent.
 * Returns the uploadId the design references, or null on any failure (the constructor
 * then keeps the local preview and the customer can still order with a deferred photo).
 */
export async function uploadPhotoWithCutout(
  original: Blob,
  /** null = the browser could not remove the background; the photo is used as-is */
  cutoutPng: Blob | null,
  consent: boolean,
): Promise<{ uploadId: string; qualityWarning: boolean } | null> {
  try {
    const signRes = await fetch('/api/gl/uploads/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mime: original.type || 'image/jpeg', withCutout: cutoutPng !== null }),
    });
    if (!signRes.ok) return null;
    const sign = (await signRes.json()) as {
      uploadId: string;
      originalPutUrl: string;
      cutoutPutUrl: string | null;
    };

    const puts = [
      fetch(sign.originalPutUrl, {
        method: 'PUT',
        headers: { 'content-type': original.type || 'image/jpeg' },
        body: original,
      }),
    ];
    if (sign.cutoutPutUrl && cutoutPng) {
      puts.push(
        fetch(sign.cutoutPutUrl, {
          method: 'PUT',
          headers: { 'content-type': 'image/png' },
          body: cutoutPng,
        }),
      );
    }
    const putResults = await Promise.all(puts);
    if (putResults.some((r) => !r.ok)) return null;

    const finRes = await fetch(`/api/gl/uploads/${encodeURIComponent(sign.uploadId)}/finalize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent, cutoutSkipped: cutoutPng === null }),
    });
    if (!finRes.ok) return null;
    const fin = (await finRes.json()) as { qualityWarning?: boolean };
    return { uploadId: sign.uploadId, qualityWarning: Boolean(fin.qualityWarning) };
  } catch {
    return null;
  }
}

import type { FaceBox } from '@gl/constructor';

/**
 * Browser face detection (MediaPipe BlazeFace short-range, ~230 KB model). Everything
 * is served from OUR origin (/public/models/face) — the photo never leaves the browser
 * here. Two jobs:
 *  1. count people — a figurine carries ONE face, so photos with several people are
 *     rejected with a clear message before any upload;
 *  2. give the face bounding box, so the constructor can auto-centre the WHOLE head
 *     in the face zone (instead of the raw cover-fit that crops tall photos).
 *
 * Fail-open by design: if the model cannot load or the image cannot be decoded the
 * caller gets `null` and continues without the guard — a broken detector must never
 * block ordering (photos are re-checked by a human before print anyway).
 */
export interface FaceScan {
  count: number;
  /** the single detected face box (source-photo px); null when count !== 1 */
  box: FaceBox | null;
  imgW: number;
  imgH: number;
}

type Detector = {
  detect: (img: ImageBitmap | HTMLCanvasElement) => {
    detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }>;
  };
};

let detectorPromise: Promise<Detector | null> | null = null;

function getDetector(): Promise<Detector | null> {
  detectorPromise ??= (async () => {
    try {
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/models/face/wasm');
      return (await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/models/face/blaze_face_short_range.tflite' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      })) as unknown as Detector;
    } catch {
      return null; // fail-open — see the module comment
    }
  })();
  return detectorPromise;
}

/** Pre-warm the model in the background (called when the photo step opens). */
export function warmFaceDetector(): void {
  void getDetector();
}

/**
 * One detector pass over a rectangle of the photo, answered in SOURCE pixels.
 *
 * The model squeezes whatever it is given into a small square input, so a hit depends
 * on how much of the FRAME the face fills, not on how many pixels it has. That is why
 * `scanFaces` re-asks on a crop instead of just handing over a larger image.
 */
function detectIn(
  detector: Detector,
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): { count: number; box: FaceBox | null } {
  const k = Math.min(1.6, 640 / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * k));
  canvas.height = Math.max(1, Math.round(sh * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { count: 0, box: null };
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const { detections } = detector.detect(canvas);
  const boxes = (detections ?? [])
    .map((d) => d.boundingBox)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  if (boxes.length !== 1) return { count: boxes.length, box: null };
  const b = boxes[0]!;
  return { count: 1, box: { x: sx + b.originX / k, y: sy + b.originY / k, w: b.width / k, h: b.height / k } };
}

export async function scanFaces(photo: Blob): Promise<FaceScan | null> {
  const detector = await getDetector();
  if (!detector) return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(photo);
    const w = bitmap.width;
    const h = bitmap.height;
    // A selfie fills the frame and lands on the first pass. A full-height holiday photo
    // puts the head at ~10% of the frame, where the short-range model sees nothing — so
    // ask again on the top of the picture, where heads live. Several faces on any pass
    // still means several people, and the guard upstream rejects the photo.
    const passes: Array<[number, number, number, number]> = [
      [0, 0, w, h],
      [0, 0, w, Math.round(h * 0.55)],
      [Math.round(w * 0.15), 0, Math.round(w * 0.7), Math.round(h * 0.4)],
    ];
    for (const [sx, sy, sw, sh] of passes) {
      if (sw < 24 || sh < 24) continue;
      const hit = detectIn(detector, bitmap, sx, sy, sw, sh);
      if (hit.count > 1) return { count: hit.count, box: null, imgW: w, imgH: h };
      if (hit.count === 1) return { count: 1, box: hit.box, imgW: w, imgH: h };
    }
    return { count: 0, box: null, imgW: w, imgH: h };
  } catch {
    return null; // undecodable (e.g. HEIC in Chrome) — the cutout pipeline handles it
  } finally {
    bitmap?.close();
  }
}

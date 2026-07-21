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
  detect: (img: ImageBitmap) => {
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

export async function scanFaces(photo: Blob): Promise<FaceScan | null> {
  const detector = await getDetector();
  if (!detector) return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(photo);
    const { detections } = detector.detect(bitmap);
    const boxes = (detections ?? [])
      .map((d) => d.boundingBox)
      .filter((b): b is NonNullable<typeof b> => Boolean(b));
    const scan: FaceScan = { count: boxes.length, box: null, imgW: bitmap.width, imgH: bitmap.height };
    if (boxes.length === 1) {
      const b = boxes[0]!;
      scan.box = { x: b.originX, y: b.originY, w: b.width, h: b.height };
    }
    return scan;
  } catch {
    return null; // undecodable (e.g. HEIC in Chrome) — the cutout pipeline handles it
  } finally {
    bitmap?.close();
  }
}

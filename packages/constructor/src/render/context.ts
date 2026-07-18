/**
 * The subset of the Canvas 2D API that `drawScene` uses. Both the browser's
 * `CanvasRenderingContext2D` and `@napi-rs/canvas`'s context satisfy this structurally,
 * so the SAME draw code runs in both places — the mechanism behind the fidelity guarantee.
 */

export interface ImageLike {
  width: number;
  height: number;
}

export interface Ctx2D {
  fillStyle: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalCompositeOperation: string;

  save(): void;
  restore(): void;
  scale(x: number, y: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  fillText(text: string, x: number, y: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
}

/** An offscreen surface: a context to draw into and a handle to draw the result FROM. */
export interface OffscreenSurface {
  ctx: Ctx2D;
  /** pass to another context's drawImage */
  drawable: unknown;
}

export type MakeCanvas = (w: number, h: number) => OffscreenSurface;

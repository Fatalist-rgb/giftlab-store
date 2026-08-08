/**
 * The six poses the shop sells, in the order the approved design lists them.
 *
 * Only presentation data lives here: the flat preview each card shows and its native
 * aspect. What the CONSTRUCTOR can build still comes from the published ProductSchema —
 * this list must never become a second source of truth for the product itself.
 * `w`/`h` are the baked preview's pixel size (see scripts that produce /photos/tpl).
 */
export type PoseId = 'stoi' | 'stoi-piwo' | 'kieszen' | 'kufel' | 'lezy' | 'lezy-piwo';

export const POSES: { id: PoseId; src: string; w: number; h: number }[] = [
  { id: 'stoi', src: '/photos/tpl/stoi.webp', w: 450, h: 900 },
  { id: 'stoi-piwo', src: '/photos/tpl/stoi-piwo.webp', w: 479, h: 900 },
  { id: 'kieszen', src: '/photos/tpl/kieszen.webp', w: 457, h: 900 },
  { id: 'kufel', src: '/photos/tpl/kufel.webp', w: 536, h: 900 },
  { id: 'lezy', src: '/photos/tpl/lezy.webp', w: 900, h: 675 },
  { id: 'lezy-piwo', src: '/photos/tpl/lezy-piwo.webp', w: 900, h: 674 },
];

/** Fit a pose into a fixed-height box (`--sh`) while keeping its exact ratio.
 *  Width + aspect-ratio, never height + max-width: once both axes are constrained the
 *  ratio loses and the photo squashes. */
export const fitW = (p: { w: number; h: number }) => `min(100%, calc(var(--sh) * ${p.w} / ${p.h}))`;

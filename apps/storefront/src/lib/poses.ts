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

/* ---- the picker's mental model, from the approved design --------------------------
   Six variants are really 3 BODY POSES × a DRINK in hand. The customer picks the pose
   from image cards and toggles the drink separately — six flat pills made them read
   all six names to discover that. The registry maps that model onto the schema's flat
   variant ids; a schema whose ids don't all match (another catalogue product) falls
   back to the flat pills. */
export type DrinkId = 'none' | 'piwo' | 'kufel';

export const POSE_GROUPS: { id: 'stoi' | 'kieszen' | 'lezy'; opts: Partial<Record<DrinkId, PoseId>> }[] = [
  { id: 'stoi', opts: { none: 'stoi', piwo: 'stoi-piwo', kufel: 'kufel' } },
  { id: 'kieszen', opts: { none: 'kieszen' } },
  { id: 'lezy', opts: { none: 'lezy', piwo: 'lezy-piwo' } },
];
export const DRINK_ORDER: DrinkId[] = ['none', 'piwo', 'kufel'];

export const groupOf = (variantId: string) =>
  POSE_GROUPS.find((g) => Object.values(g.opts).includes(variantId as PoseId)) ?? POSE_GROUPS[0]!;
export const drinkOf = (variantId: string): DrinkId =>
  (Object.entries(groupOf(variantId).opts).find(([, v]) => v === variantId)?.[0] as DrinkId) ?? 'none';

/** True when the schema's variant set is exactly the six known poses. */
export const isPoseSchema = (variantIds: string[]) => {
  const known = new Set<string>(POSES.map((p) => p.id));
  return variantIds.length === known.size && variantIds.every((id) => known.has(id));
};

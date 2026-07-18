/**
 * Scene — the resolved, deterministic paint list that both the browser preview and the
 * server renderer consume. Same (schema, designState) always produces the same Scene, in
 * both environments (Constitution II / fidelity). Nodes are pre-sorted by paint order.
 */

export interface SceneImageNode {
  kind: 'image';
  /** R2 key of the artwork to draw */
  assetKey: string;
  zIndex: number;
}

export interface SceneFaceNode {
  kind: 'face';
  /** null while the photo is deferred — the renderer draws a placeholder */
  photoId: string | null;
  bounds: { x: number; y: number; w: number; h: number };
  maskAssetKey: string;
  transform: { x: number; y: number; scale: number; rotation: number };
  placeholder: boolean;
  zIndex: number;
}

export interface SceneTextNode {
  kind: 'text';
  value: string;
  font: string;
  color: string;
  placement: string;
  zIndex: number;
}

export type SceneNode = SceneImageNode | SceneFaceNode | SceneTextNode;

export interface Scene {
  /** paint order, ascending zIndex */
  nodes: SceneNode[];
}

export function nodeZ(node: SceneNode): number {
  return node.zIndex;
}

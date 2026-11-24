// Camera state + screen/world conversion, hand-written per VibeFather
// infinite-canvas-moodboard recipe. Framework-agnostic.
export interface Camera { x: number; y: number; k: number; }
export interface Viewport { width: number; height: number; }
export interface Point { x: number; y: number; }
export const MIN_K = 0.08;
export const MAX_K = 2.5;
export const createCamera = (): Camera => ({ x: 0, y: 0, k: 1 });
export function screenToWorld(cam: Camera, p: Point): Point {
  return { x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k };
}
export function worldToScreen(cam: Camera, p: Point): Point {
  return { x: p.x * cam.k + cam.x, y: p.y * cam.k + cam.y };
}
export function zoomAt(cam: Camera, viewport: Point, factor: number): Camera {
  const k = Math.min(MAX_K, Math.max(MIN_K, cam.k * factor));
  const wx = (viewport.x - cam.x) / cam.k;
  const wy = (viewport.y - cam.y) / cam.k;
  return { k, x: viewport.x - wx * k, y: viewport.y - wy * k };
}
export function fitCamera(cam: Camera, viewport: Viewport, world: { x: number; y: number; w: number; h: number }): Camera {
  const pad = 48;
  const k = Math.min(MAX_K, Math.max(MIN_K, Math.min((viewport.width - pad * 2) / world.w, (viewport.height - pad * 2) / world.h)));
  return { k, x: viewport.width / 2 - (world.x + world.w / 2) * k, y: viewport.height / 2 - (world.y + world.h / 2) * k };
}
export function clampCenter(cam: Camera, viewport: Viewport, margin = 1200): Camera {
  const cx = cam.x + viewport.width / 2, cy = cam.y + viewport.height / 2;
  const boundedX = Math.min(margin, Math.max(-margin, cx));
  const boundedY = Math.min(margin, Math.max(-margin, cy));
  return { ...cam, x: boundedX - viewport.width / 2, y: boundedY - viewport.height / 2 };
}
export function wheelZoomFactor(e: { deltaY: number; ctrlKey: boolean; metaKey: boolean; deltaMode: number; deltaX: number }): number {
  if (e.ctrlKey || e.metaKey) return Math.exp(-e.deltaY * 0.01);
  if (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && e.deltaX === 0)) return Math.exp(-e.deltaY * 0.0016);
  return 1;
}

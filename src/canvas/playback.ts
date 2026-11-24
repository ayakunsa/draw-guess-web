// Ported from ai-draw-guess/public/drawing-playback.mjs.
// NOTE: reduced-motion must NOT collapse a selected drawing process into an
// instant reveal; a separate skip button provides that behaviour.
import type { Shape } from './pen';

export function drawingTransition(previous: Shape[], next: Shape[]) {
  const signature = (s: Shape) => JSON.stringify(Object.keys(s).sort().map(key => [key, (s as unknown as Record<string, unknown>)[key]]));
  let keep = 0;
  while (keep < previous.length && keep < next.length && signature(previous[keep]) === signature(next[keep])) keep++;
  return { keep, remove: previous.length - keep, append: next.slice(keep) };
}
export function shapePath(s: Shape): [number, number][] {
  if (s.type === 'ellipse') return Array.from({ length: 65 }, (_, i) => [s.x + Math.cos(i * Math.PI / 32) * s.rx, s.y + Math.sin(i * Math.PI / 32) * s.ry] as [number, number]);
  if (s.type === 'rect') return [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h], [s.x, s.y]];
  return s.type === 'polygon' ? [...s.points, s.points[0]] : s.points;
}
export function pathLength(points: [number, number][]): number {
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
}
export const playbackFactor = (speed: string) => ({ slow: 1, normal: 0.6, fast: 0.25 })[speed] ?? 0.6;
export function strokeDuration(shape: Shape, speed = 'normal'): number {
  return Math.min(900, Math.max(180, pathLength(shapePath(shape)) * 1.4)) * playbackFactor(speed);
}
export const STROKE_GAP = 70;
export async function animateProgress(duration: number, {
  draw, isActive = () => true, frame = () => new Promise<number>(requestAnimationFrame), now = () => performance.now(),
}: {
  draw: (p: number) => void;
  isActive?: () => boolean;
  frame?: () => Promise<number>;
  now?: () => number;
}): Promise<boolean> {
  let elapsed = 0, previous = now();
  if (!isActive()) return false;
  draw(0);
  while (elapsed < duration) {
    const time = await frame();
    if (!isActive()) return false;
    elapsed += Math.max(0, Math.min(64, time - previous));
    previous = time;
    draw(Math.min(1, elapsed / duration));
  }
  return true;
}
export function partialStroke(shape: Shape, progress: number): Shape {
  if (progress >= 1) return shape;
  const path = shapePath(shape), points: [number, number][] = [path[0]];
  let remaining = pathLength(path) * Math.max(0, progress);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining >= length) { points.push(b); remaining -= length; }
    else { const t = length ? remaining / length : 0; points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); break; }
  }
  return { type: 'line', points, color: shape.color === 'none' ? shape.fill : shape.color, width: shape.width };
}

// Parsing/validation helpers shared by AI guess and AI sketch.
// Extract a JSON object or array from fenced/plain model output.
export function extractJson(text: string): unknown | null {
  let s = String(text || '').trim();
  const fence = s.match(/\x60{3}(?:json)?\s*([\s\S]*?)\x60{3}/i);
  if (fence) s = fence[1].trim();
  const first = s.search(/[[{]/);
  if (first < 0) return null;
  const open = s[first];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inString = false, escaped = false;
  for (let i = first; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try { return JSON.parse(s.slice(first, i + 1)); }
      catch { return null; }
    }
  }
  return null;
}

export interface AiGuess { guess: string; confidence: number | null; reason: string }
export function parseAiGuess(text: string): AiGuess | null {
  const data = extractJson(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const guess = typeof obj.guess === 'string' ? obj.guess.trim() : (typeof obj.answer === 'string' ? obj.answer.trim() : '');
  if (!guess) return null;
  const rawConfidence = typeof obj.confidence === 'number' ? obj.confidence : Number(obj.confidence);
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(100, Math.round(rawConfidence))) : null;
  const reason = typeof obj.reason === 'string' ? obj.reason.slice(0, 160) : '';
  return { guess: guess.slice(0, 60), confidence, reason };
}

import { W, H, type Shape } from '../canvas/pen';

const MAX_STROKES = 20;
const MAX_POINTS = 200;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const baseStyle = (o: Record<string, unknown>) => ({
  color: typeof o.color === 'string' && /^#[0-9a-fA-F]{3,8}$|^none$/.test(o.color) ? o.color : '#202633',
  fill: typeof o.fill === 'string' && /^#[0-9a-fA-F]{3,8}$|^none$/.test(o.fill) ? o.fill : 'none',
  width: finite(o.width) ? clamp(o.width, 1, 40) : 5,
});

// Only accept the exact Shape[] schema used by canvas/pen.ts; drop bad items.
export function parseShapes(text: string): Shape[] | null {
  const data = extractJson(text);
  if (!Array.isArray(data)) return null;
  const shapes: Shape[] = [];
  for (const raw of data) {
    if (shapes.length >= MAX_STROKES) break;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const o = raw as Record<string, unknown>;
    const style = baseStyle(o);
    if ((o.type === 'line' || o.type === 'polygon') && Array.isArray(o.points)) {
      const points: [number, number][] = [];
      for (const p of o.points.slice(0, MAX_POINTS)) {
        if (!Array.isArray(p) || p.length < 2 || !finite(p[0]) || !finite(p[1])) continue;
        points.push([clamp(p[0], 0, W), clamp(p[1], 0, H)]);
      }
      if (points.length >= 2) shapes.push({ type: o.type, points, ...style });
    } else if (o.type === 'rect' && finite(o.x) && finite(o.y) && finite(o.w) && finite(o.h)) {
      const x = clamp(o.x, 0, W), y = clamp(o.y, 0, H);
      shapes.push({ type: 'rect', x, y, w: clamp(o.w, -W, W), h: clamp(o.h, -H, H), ...style });
    } else if (o.type === 'ellipse' && finite(o.x) && finite(o.y) && finite(o.rx) && finite(o.ry)) {
      shapes.push({ type: 'ellipse', x: clamp(o.x, 0, W), y: clamp(o.y, 0, H), rx: clamp(o.rx, 1, W), ry: clamp(o.ry, 1, H), ...style });
    }
  }
  return shapes.length ? shapes : null;
}

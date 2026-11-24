// Ported from ai-draw-guess/public/drawing.mjs (framework-agnostic pure logic).
// Data contract: Shape JSON with type 'line'|'polygon'|'rect'|'ellipse', points/color/fill/width.
export const W = 1000, H = 650;
export type Shape =
  | { type: 'line' | 'polygon'; points: [number, number][]; color?: string; fill?: string; width?: number }
  | { type: 'rect'; x: number; y: number; w: number; h: number; color?: string; fill?: string; width?: number }
  | { type: 'ellipse'; x: number; y: number; rx: number; ry: number; color?: string; fill?: string; width?: number };

export class DrawingHistory {
  operations: { type: string; length?: number; shapes?: Shape[] }[] = [];
  reset() { this.operations = []; }
  stroke(length: number) { this.operations.push({ type: 'stroke', length }); }
  clear(shapes: Shape[]): Shape[] { if (shapes.length) this.operations.push({ type: 'clear', shapes: structuredClone(shapes) }); return []; }
  undo(shapes: Shape[]): Shape[] {
    const op = this.operations.pop();
    if (!op) return shapes;
    return op.type === 'clear' ? (op.shapes ?? shapes) : shapes.slice(0, op.length ?? shapes.length);
  }
}

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  ctx.save();
  ctx.strokeStyle = s.color || '#202633';
  ctx.fillStyle = s.fill || 'transparent';
  ctx.lineWidth = s.width || 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (s.type === 'ellipse') ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
  else if (s.type === 'rect') ctx.rect(s.x, s.y, s.w, s.h);
  else {
    (s.points || []).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (s.type === 'polygon') ctx.closePath();
  }
  if (s.fill && s.fill !== 'none') ctx.fill();
  if (s.color !== 'none') ctx.stroke();
  ctx.restore();
}

export function paint(canvas: HTMLCanvasElement, shapes: Shape[]): void {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.scale(canvas.width / W, canvas.height / H);
  shapes.forEach(s => drawShape(c, s));
  c.restore();
}

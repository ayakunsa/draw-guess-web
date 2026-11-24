// PNG export. Ported from ai-draw-guess/public/drawing.mjs.
import { W, H, paint, type Shape } from './pen';

export function png(shapes: Shape[]): string {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  paint(c, shapes);
  return c.toDataURL('image/png');
}

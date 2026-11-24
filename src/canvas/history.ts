// Thin React-friendly wrapper around the ported DrawingHistory.
// Source: ai-draw-guess/public/drawing.mjs
import { DrawingHistory, type Shape } from './pen';

export class History {
  private inner = new DrawingHistory();
  reset() { this.inner.reset(); }
  addStroke(length: number) { this.inner.stroke(length); }
  clear(shapes: Shape[]): Shape[] { return this.inner.clear(shapes); }
  undo(shapes: Shape[]): Shape[] { return this.inner.undo(shapes); }
}

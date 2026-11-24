// Ported from ai-draw-guess/public/guess-confidence.mjs.
// The value is a self-rated confidence, not a correctness probability.
export const CONFIDENCE_RULE = 'confidence 填你仅根据画面线索对本次答案的主观把握，0 到 100 的整数；线索明确就高，犹豫就中，瞎蒙就低。';
export function normalizeConfidence(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
}
export function submittedExpression(confidence: unknown, seed = ''): 'confident' | 'uncertain' | 'random' {
  const value = normalizeConfidence(confidence);
  if (value !== null) return value >= 75 ? 'confident' : value >= 40 ? 'uncertain' : 'random';
  let hash = 0;
  for (const c of String(seed)) hash = (Math.imul(hash, 31) + (c.codePointAt(0) ?? 0)) >>> 0;
  return (['confident', 'uncertain', 'random'] as const)[hash % 3];
}
export function submittedLabel(confidence: unknown): string {
  if (normalizeConfidence(confidence) === null) return '已提交 · 等待揭晓';
  return { confident: '已提交 · 很有把握', uncertain: '已提交 · 有点犹豫', random: '已提交 · 把握不大' }[submittedExpression(confidence)];
}

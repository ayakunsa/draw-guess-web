// Pure scoring & matching rules. Ported from ai-draw-guess/lib/game.mjs
// (scorePending) and lib/words.mjs (normalize/judgeGuess). No session, no model.
export interface Word { answer: string; category: string; aliases?: string[]; }
export interface Judgement { correct: boolean; match: 'exact' | 'alias' | 'idiom-order' | 'idiom-three' | null; }
export const normalize = (value: string) => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
export function judgeGuess(word: Word, value: string): Judgement {
  const guess = normalize(value), answer = normalize(word.answer);
  if (guess === answer) return { correct: true, match: 'exact' };
  if ((word.aliases || []).some(a => normalize(a) === guess)) return { correct: true, match: 'alias' };
  if (word.category === '成语' && /^\p{Script=Han}{4}$/u.test(answer) && /^\p{Script=Han}{4}$/u.test(guess)) {
    const a = Array.from(answer), g = Array.from(guess);
    if ([...a].sort().join('') === [...g].sort().join('')) return { correct: true, match: 'idiom-order' };
    if (a.filter((c, i) => c === g[i]).length >= 3) return { correct: true, match: 'idiom-three' };
  }
  return { correct: false, match: null };
}
// Correct on turn n earns 4-n points, clamped to at least 1.
export const pointsFor = (turn: number, correct: boolean) => (correct ? Math.max(1, 4 - turn) : 0);

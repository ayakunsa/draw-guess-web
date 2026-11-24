// Per-round memory-only records for the review screen. Source: local design.
// Snapshots are taken at handoff; guesses are appended as they arrive.
import type { Word } from '../content';
import type { Shape } from '../canvas/pen';
import type { Judgement } from './rules';

export interface GuessRecord { value: string; confidence: number | null; judgement: Judgement; }
export interface RoundRecord {
  round: number; word: Word; shapes: Shape[]; guesses: GuessRecord[];
  wrongCount: number; wrongLimit: number;
  result: 'pending' | 'correct' | 'wrong-limit' | 'timeout'; timestamp: number;
}

export function createRoundRecord(round: number, word: Word, shapes: Shape[], wrongLimit: number): RoundRecord {
  return { round, word, shapes: structuredClone(shapes), guesses: [], wrongCount: 0, wrongLimit, result: 'pending', timestamp: Date.now() };
}
export function addGuess(rec: RoundRecord, value: string, confidence: number | null, judgement: Judgement): RoundRecord {
  return { ...rec, guesses: [...rec.guesses, { value, confidence, judgement }], wrongCount: judgement.correct ? rec.wrongCount : rec.wrongCount + 1 };
}
export function finalizeRecord(rec: RoundRecord, result: RoundRecord['result'], wrongCount: number): RoundRecord {
  return { ...rec, result, wrongCount };
}
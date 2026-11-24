// Local hot-seat game loop state machine. No session, no backend, no AI.
// Phases: idle -> wordReveal (drawer sees word) -> drawing -> handoff -> guessing -> revealed -> (next round wordReveal | finished)
import type { Word } from '../content';
import { judgeGuess, pointsFor, type Judgement } from './rules';
import { normalizeConfidence, submittedLabel } from './confidence';

export type Phase = 'idle' | 'wordReveal' | 'drawing' | 'handoff' | 'guessing' | 'revealed' | 'finished';
export interface GameState {
  phase: Phase; round: number; words: Word[];
  scores: { drawer: number; guesser: number };
  timer: number; duration: number; // duration = current phase total seconds
  wrongCount: number; wrongLimit: number; // wrong guesses this round / allowed limit
  confidence: number | null; guess: string;
  judgement: Judgement | null; feedback: string;
}
export type Action =
  | { type: 'start'; words: Word[]; drawSeconds: number; guessSeconds: number; wrongLimit?: number }
  | { type: 'beginDraw'; seconds?: number }
  | { type: 'handoff' }
  | { type: 'beginGuess'; seconds?: number }
  | { type: 'tick' }
  | { type: 'guess'; value: string; confidence?: number | null }
  | { type: 'newRound' }
  | { type: 'reset' };

export function initialState(): GameState {
  return { phase: 'idle', round: 0, words: [], scores: { drawer: 0, guesser: 0 }, timer: 0, duration: 0, wrongCount: 0, wrongLimit: 3, confidence: null, guess: '', judgement: null, feedback: '' };
}
export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start':
      return { ...initialState(), phase: 'wordReveal', round: 1, words: action.words, timer: action.drawSeconds, duration: action.drawSeconds, wrongLimit: action.wrongLimit ?? 3 };
    case 'beginDraw': {
      const duration = action.seconds ?? state.duration;
      return state.phase === 'wordReveal' ? { ...state, phase: 'drawing', timer: duration, duration, feedback: '' } : state;
    }
    case 'handoff':
      return state.phase === 'drawing' ? { ...state, phase: 'handoff' } : state;
    case 'beginGuess': {
      const duration = action.seconds ?? state.duration;
      return state.phase === 'handoff' ? { ...state, phase: 'guessing', timer: duration, duration, feedback: '' } : state;
    }
    case 'tick': {
      if (state.phase !== 'drawing' && state.phase !== 'guessing') return state;
      const timer = Math.max(0, state.timer - 1);
      if (timer > 0) return { ...state, timer };
      if (state.phase === 'drawing') return { ...state, timer: 0, phase: 'handoff', feedback: '作画时间到，交给猜者' };
      return { ...state, timer: 0, phase: 'revealed', feedback: '时间到，答案揭晓' };
    }
    case 'guess': {
      if (state.phase !== 'guessing' || !action.value.trim()) return state;
      const word = state.words[state.round - 1];
      if (!word) return state;
      const judgement = judgeGuess(word, action.value);
      const confidence = normalizeConfidence(action.confidence ?? null);
      const label = submittedLabel(action.confidence ?? null);
      if (judgement.correct) {
        const gained = pointsFor(state.round, true);
        return {
          ...state, phase: 'revealed', guess: action.value, confidence, judgement,
          feedback: '猜中了！' + ' · ' + label,
          scores: { ...state.scores, guesser: state.scores.guesser + gained },
        };
      }
      const wrongCount = state.wrongCount + 1;
      if (wrongCount >= state.wrongLimit) {
        return {
          ...state, phase: 'revealed', guess: action.value, confidence, judgement, wrongCount,
          feedback: '猜错 ' + wrongCount + ' 次，机会用尽，答案揭晓' + ' · ' + label,
        };
      }
      return {
        ...state, guess: action.value, confidence, judgement, wrongCount,
        feedback: '没猜中，还剩 ' + (state.wrongLimit - wrongCount) + ' 次机会' + ' · ' + label,
      };
    }
    case 'newRound': {
      const next = state.round + 1;
      if (next > state.words.length) return { ...state, phase: 'finished' };
      return { ...state, round: next, phase: 'wordReveal', timer: state.duration, wrongCount: 0, guess: '', confidence: null, judgement: null, feedback: '' };
    }
    case 'reset': return initialState();
    default: return state;
  }
}
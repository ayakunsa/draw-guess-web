// Range hint for the guesser: category + answer length. Never reveals the word itself.
import type { Word } from '../content';

const CN: string[] = ['零','一','二','三','四','五','六','七','八','九','十'];
export function countLabel(word: Word): string {
  const n = Array.from(word.answer || '').length;
  return n <= 10 ? CN[n] : String(n);
}
export function hintFor(word: Word | undefined): string {
  if (!word || !word.answer) return '准备开始';
  return (word.category || '谜题') + ' · 打' + countLabel(word) + '字';
}
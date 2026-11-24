import React from 'react';
import type { Word } from '../content';
export const WordCard: React.FC<{ word: Word | undefined; round: number; total: number; revealed?: boolean; hint?: string }> = ({ word, round, total, revealed, hint }) => (
  <div className="bg-paper/95 rounded-2xl px-5 py-3 shadow-lg border border-ink/10">
    <div className="font-mono text-[10px] text-ink-soft">{'ROUND ' + round + '/' + total + ' · ' + (word?.category || '—')}</div>
    {hint && <div className="font-mono text-[10px] text-[#0A5C4B]">{'提示：' + hint}</div>}
    <div className="font-display text-2xl tracking-tight text-ink">{revealed || !word ? (word?.answer || '准备开始') : '•••'}</div>
  </div>
);

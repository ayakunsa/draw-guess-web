import React from 'react';
import type { Word } from '../content';
import { V, COPY } from '../content';
// Full-screen opaque cover: only the drawer should be looking at this screen.
export const WordReveal: React.FC<{ word: Word | undefined; round: number; total: number; onBegin: () => void }> = ({ word, round, total, onBegin }) => (
  <div className="absolute inset-0 z-40 bg-mat-deep flex flex-col items-center justify-center gap-8 px-6 text-center">
    <div className="font-mono text-paper/70 text-xs">{'ROUND ' + round + '/' + total + ' · ' + COPY.revealHint}</div>
    <div className="bg-paper rounded-3xl px-10 py-8 shadow-2xl border-4 border-marigold max-w-xl">
      <div className="font-mono text-ink-soft text-sm mb-2">{word?.category || V.WORD_LIST}</div>
      <div className="font-display text-6xl text-ink break-all">{word?.answer || '准备开始'}</div>
    </div>
    <button className="rounded-2xl bg-marigold text-ink px-8 py-4 font-display text-xl shadow" onClick={onBegin}>{COPY.beginDraw}</button>
  </div>
);

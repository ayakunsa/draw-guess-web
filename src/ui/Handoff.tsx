import React from 'react';
import { COPY } from '../content';
// Full-screen opaque cover between drawer and guesser on the same device.
export const Handoff: React.FC<{ onBegin: () => void }> = ({ onBegin }) => (
  <div className="absolute inset-0 z-40 bg-mat-deep flex flex-col items-center justify-center gap-8 px-6 text-center">
    <div className="text-6xl">🤝</div>
    <div className="font-display text-4xl text-paper">{COPY.handoffTitle}</div>
    <div className="font-mono text-paper/70 text-sm max-w-md">{COPY.handoffHint}</div>
    <button className="rounded-2xl bg-sky text-ink px-8 py-4 font-display text-xl shadow" onClick={onBegin}>{COPY.beginGuess}</button>
  </div>
);

import React from 'react';
import { Avatar } from './Avatar';
export const Scoreboard: React.FC<{ scores: { drawer: number; guesser: number }; activeRole: 'drawer' | 'guesser' }> = ({ scores, activeRole }) => (
  <div className="flex items-center gap-6 bg-mat-deep/80 rounded-2xl px-4 py-2 border border-paper/10">
    <div className="font-mono text-paper text-xs">得分<br /><b className="text-lg text-marigold">{scores.drawer}</b> : <b className="text-lg text-sky">{scores.guesser}</b></div>
    <Avatar role="drawer" active={activeRole === 'drawer'} />
    <Avatar role="guesser" active={activeRole === 'guesser'} />
  </div>
);

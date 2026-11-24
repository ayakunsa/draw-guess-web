import React from 'react';
// No Live2D / Cubism. Role identity is a CSS/SVG badge + emoji + text label.
const ROLE_STYLE: Record<string, { emoji: string; ring: string; label: string }> = {
  drawer: { emoji: '✏️', ring: 'ring-marigold', label: '画师' },
  guesser: { emoji: '🔎', ring: 'ring-sky', label: '猜者' },
};
export const Avatar: React.FC<{ role: 'drawer' | 'guesser'; active?: boolean; name?: string }> = ({ role, active, name }) => {
  const s = ROLE_STYLE[role];
  const cls = 'w-10 h-10 rounded-full bg-paper grid place-items-center text-xl ring-2 ' + s.ring + ' ' + (active ? 'scale-110' : 'opacity-60');
  return (
    <div className="flex items-center gap-2">
      <div className={cls}>{s.emoji}</div>
      <div className="font-mono text-xs text-paper">{(name || s.label) + (active ? ' · 当前' : '')}</div>
    </div>
  );
};

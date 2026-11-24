import React, { useState } from 'react';
import { CONFIDENCE_RULE } from '../game/confidence';
interface Props { disabled?: boolean; compact?: boolean; onSubmit: (value: string, confidence: number | null) => void; }
export const GuessInput: React.FC<Props> = ({ disabled, compact, onSubmit }) => {
  const [value, setValue] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  return (
    <form className={compact ? 'flex flex-wrap items-center gap-3 w-full' : 'flex flex-col gap-2 w-80'} onSubmit={e => { e.preventDefault(); if (value.trim()) { onSubmit(value.trim(), confidence); setValue(''); } }}>
      <input
        className={(compact ? 'flex-1 min-w-[180px] ' : 'w-full ') + 'rounded-xl bg-paper px-4 py-3 text-ink outline-none ring-2 ring-transparent focus:ring-mat/60'}
        placeholder="输入你猜的词，回车提交…" value={value} disabled={disabled}
        onChange={e => setValue(e.target.value)}
      />
      <label className={(compact ? 'w-40 shrink-0 ' : '') + 'text-paper font-mono text-[11px]'} title={CONFIDENCE_RULE}>
        {'把握 ' + (confidence ?? '—') + '/100'}
        <input className="w-full mt-1" type="range" min={0} max={100} value={confidence ?? 50} disabled={disabled}
          onChange={e => setConfidence(Number(e.target.value))} />
      </label>
      <button className="shrink-0 rounded-xl bg-vermilion text-paper px-4 py-2 font-display disabled:opacity-40" disabled={disabled}>提交猜测</button>
    </form>
  );
};

import React, { useEffect, useRef, useState } from 'react';

// Expanded palette: 12 original tones + 12 common drawing colours.
export const PRESET_COLORS: { name: string; value: string }[] = [
  { name: '墨黑', value: '#202633' }, { name: '朱红', value: '#FF4A1C' }, { name: '翠绿', value: '#0A5C4B' }, { name: '天蓝', value: '#86D2FF' },
  { name: '金黄', value: '#FFC21F' }, { name: '樱粉', value: '#FF9CC7' }, { name: '深青', value: '#074537' }, { name: '草绿', value: '#4F7942' },
  { name: '薄荷', value: '#7CCDB5' }, { name: '石板灰', value: '#6B7A75' }, { name: '紫罗兰', value: '#8A5CF0' }, { name: '巧克力', value: '#7A4B2A' },
  { name: '深红', value: '#8B0000' }, { name: '橙橘', value: '#FF8C00' }, { name: '柠檬黄', value: '#FFF44F' }, { name: '青柠', value: '#32CD32' },
  { name: '青蓝', value: '#00CED1' }, { name: '靛蓝', value: '#4B0082' }, { name: '品红', value: '#FF00FF' }, { name: '褐棕', value: '#A52A2A' },
  { name: '深灰', value: '#2F4F4F' }, { name: '银灰', value: '#C0C0C0' }, { name: '海军蓝', value: '#000080' }, { name: '桃粉', value: '#FFDAB9' },
];

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

interface Props { current: string; onPick: (color: string) => void; onClose: () => void; anchorRef?: React.RefObject<HTMLElement>; }

export const Palette: React.FC<Props> = ({ current, onPick, onClose, anchorRef }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState(current);
  const [error, setError] = useState(false);
  useEffect(() => {
    const onDown = (e: PointerEvent) => { const t = e.target as Node; if (!ref.current?.contains(t) && !anchorRef?.current?.contains(t)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose, anchorRef]);
  const pick = (c: string) => { onPick(c); setHex(c); setError(false); onClose(); };
  const applyHex = () => { if (isValidHex(hex)) pick(hex.trim().toLowerCase()); else setError(true); };
  return (
    <div ref={ref} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-mat-deep border-2 border-marigold/60 rounded-2xl shadow-2xl p-4 w-80" role="dialog" aria-label="调色板">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg text-paper">🎨 调色板</span>
        <button onClick={onClose} className="rounded-lg bg-paper/80 text-ink px-2 py-0.5 font-mono text-xs" aria-label="关闭调色板">✕</button>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {PRESET_COLORS.map(c => (
          <button key={c.value} title={c.name} aria-label={c.name} onClick={() => pick(c.value)}
            className={'w-7 h-7 rounded-md border-2 ' + (current.toLowerCase() === c.value.toLowerCase() ? 'ring-2 ring-marigold border-ink' : 'border-paper/50')}
            style={{ background: c.value }} />
        ))}
      </div>
      <div className="border-t border-paper/20 mt-3 pt-3 flex items-center gap-2">
        <input type="color" aria-label="自定义取色" value={isValidHex(hex) ? hex : '#202633'} onChange={e => { setHex(e.target.value); onPick(e.target.value); setError(false); }} className="w-9 h-9 rounded-md bg-transparent border-0 p-0 cursor-pointer" />
        <input aria-label="HEX 色值" value={hex} onChange={e => { setHex(e.target.value); setError(false); }} onKeyDown={e => { if (e.key === 'Enter') applyHex(); }}
          placeholder="#RRGGBB" className={'flex-1 rounded-lg bg-paper text-ink px-2 py-1 font-mono text-sm ' + (error ? 'ring-2 ring-vermilion' : '')} />
        <button onClick={applyHex} className="rounded-lg bg-marigold text-ink px-3 py-1 font-mono text-xs">应用</button>
      </div>
      {error && <div className="text-vermilion font-mono text-[10px] mt-1">请输入 6 位色值，如 #1E90FF</div>}
      <div className="font-mono text-[9px] text-paper/50 mt-2">点击色块或输入 HEX 选色，Esc / 点击外部关闭</div>
    </div>
  );
};
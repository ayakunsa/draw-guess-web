import React, { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_LEVELS, type Category, type Level } from '../game/words';
import { DEFAULT_SETTINGS, MODEL_PRESETS, type Settings } from '../game/settings';

// Modal z-30: below wordReveal/handoff (z-40), above the toolbar.
export const SettingsPanel: React.FC<{ value: Settings; onSave: (value: Settings) => void; onClose: () => void }> = ({ value, onSave, onClose }) => {
  const [draft, setDraft] = useState<Settings>(value);
  useEffect(() => setDraft(value), [value]);
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => setDraft(d => ({ ...d, [key]: val }));
  const category = CATEGORIES.includes(draft.category as Category) ? draft.category as Category : '成语';
  const levels = CATEGORY_LEVELS[category];
  const level = levels.some(l => l.id === draft.level) ? draft.level as Level : levels[0].id;

  const label = 'block font-mono text-[11px] text-paper/80 mb-1';
  const input = 'w-full rounded-lg bg-paper text-ink px-2 py-1 font-mono text-sm';
  return (
    <div className="absolute inset-0 z-30 bg-black/55 flex items-center justify-center p-4" role="dialog" aria-label="设置">
      <div className="bg-mat-deep rounded-3xl shadow-2xl border-2 border-marigold/60 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl text-paper">设置</div>
          <button onClick={onClose} className="rounded-lg bg-paper/80 text-ink px-3 py-1 font-mono text-xs" aria-label="关闭">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>猜词时间（秒）<input className={input} type="number" min={15} max={300} value={draft.guessSeconds} onChange={e => set('guessSeconds', Number(e.target.value))} /></label>
          <label className={label}>作画时间（秒）<input className={input} type="number" min={15} max={300} value={draft.drawSeconds} onChange={e => set('drawSeconds', Number(e.target.value))} /></label>
          <label className={label}>每局回合数<input className={input} type="number" min={1} max={8} value={draft.rounds} onChange={e => set('rounds', Number(e.target.value))} /></label>
          <label className={label} title="每回合猜错达到此次数即揭晓答案，控制权回到画师">每回合猜错上限<input className={input} type="number" min={1} max={10} value={draft.wrongLimit} onChange={e => set('wrongLimit', Number(e.target.value))} /></label>
          <label className={label}>回放速度
            <select className={input} value={draft.speed} onChange={e => set('speed', e.target.value)}><option value="slow">慢</option><option value="normal">标准</option><option value="fast">快</option></select>
          </label>
          <label className={label}>题库分类
            <select className={input} value={category} onChange={e => { set('category', e.target.value); set('level', CATEGORY_LEVELS[e.target.value as Category][0].id); }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}（{CATEGORY_LEVELS[c][CATEGORY_LEVELS[c].length - 1].count} 词）</option>)}
            </select>
          </label>
          <label className={label}>难度
            <select className={input} value={level} onChange={e => set('level', e.target.value)}>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name} · {l.count} 词</option>)}
            </select>
          </label>
        </div>

        <div className="border-t border-paper/20 pt-3">
          <div className="font-mono text-[11px] text-paper/60 mb-2">AI 出题人预留位（未启用 · 不会发起任何网络请求）</div>
          <label className={label + ' flex items-center gap-2'}>
            <input type="checkbox" checked={draft.ai.enabled} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, enabled: e.target.checked } }))} /> 启用（仅供配置，暂不生效）
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>显示名<input className={input} value={draft.ai.name} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, name: e.target.value } }))} /></label>
            <label className={label}>模型
              <select className={input} value={draft.ai.model} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, model: e.target.value } }))}>
                <option value="">（未选择）</option>{MODEL_PRESETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className={label}>Provider<input className={input} value={draft.ai.provider} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, provider: e.target.value } }))} /></label>
            <label className={label}>Base URL<input className={input} value={draft.ai.baseUrl} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, baseUrl: e.target.value } }))} /></label>
          </div>
          <label className={label}>API Key（仅存本机，不明文回显）<input className={input} type="password" autoComplete="off" value={draft.ai.apiKey} onChange={e => setDraft(d => ({ ...d, ai: { ...d.ai, apiKey: e.target.value } }))} /></label>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={() => setDraft({ ...DEFAULT_SETTINGS, ai: { ...DEFAULT_SETTINGS.ai } })} className="rounded-lg bg-paper/40 text-paper px-3 py-2 font-mono text-xs">恢复默认</button>
          <button onClick={onClose} className="rounded-lg bg-paper/80 text-ink px-3 py-2 font-mono text-xs">取消</button>
          <button onClick={() => onSave(draft)} className="rounded-lg bg-marigold text-ink px-4 py-2 font-display">保存</button>
        </div>
        <div className="font-mono text-[9px] text-paper/40">设置保存在本机浏览器 localStorage；AI 字段仅为未来方案占位，本版本不调用任何接口。</div>
      </div>
    </div>
  );
};

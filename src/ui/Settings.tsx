import React, { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_LEVELS, type Category, type Level } from '../game/words';
import { AI_PROVIDERS, AMD_MODEL_PRESETS, DEFAULT_SETTINGS, MODEL_PRESETS, type Settings } from '../game/settings';
import { testConnection } from '../ai/client';

// Modal z-30: below wordReveal/handoff (z-40), above the toolbar.
export const SettingsPanel: React.FC<{ value: Settings; onSave: (value: Settings) => void; onClose: () => void }> = ({ value, onSave, onClose }) => {
  const [draft, setDraft] = useState<Settings>(value);
  useEffect(() => setDraft(value), [value]);
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => setDraft(d => ({ ...d, [key]: val }));
  const setAi = (patch: Partial<Settings['ai']>) => setDraft(d => ({ ...d, ai: { ...d.ai, ...patch } }));
  const category = CATEGORIES.includes(draft.category as Category) ? draft.category as Category : '成语';
  const levels = CATEGORY_LEVELS[category];
  const level = levels.some(l => l.id === draft.level) ? draft.level as Level : levels[0].id;

  const [customModel, setCustomModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const isAmd = draft.ai.provider === 'amd';
  // AMD uses exact catalog IDs; other providers use the provider/model presets.
  const modelPresets: readonly string[] = isAmd ? AMD_MODEL_PRESETS : MODEL_PRESETS;
  const modelIsPreset = (modelPresets as readonly string[]).includes(draft.ai.model);
  const modelChoice = modelIsPreset ? draft.ai.model : '__custom__';
  useEffect(() => { if (!(modelPresets as readonly string[]).includes(draft.ai.model)) setCustomModel(draft.ai.model); }, [draft.ai.model, isAmd]);

  const runTest = async () => {
    setTesting(true); setTestResult(null);
    const result = await testConnection(draft);
    setTestResult(result); setTesting(false);
  };

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

        <div className="border-t border-paper/20 pt-3 flex flex-col gap-2">
          <div className="font-display text-lg text-paper">AI 辅助（添头 · 可选）</div>
          <label className={label + ' flex items-center gap-2'}><input type="checkbox" checked={draft.ai.enabled} onChange={e => setAi({ enabled: e.target.checked })} /> 启用 AI 辅助（关闭时 AI 功能只提示未配置，不联网）</label>
          <label className={label + ' flex items-center gap-2'}><input type="checkbox" checked={draft.ai.assistGuess} onChange={e => setAi({ assistGuess: e.target.checked })} /> 猜题时允许 AI 辅助猜</label>
          <label className={label + ' flex items-center gap-2'}><input type="checkbox" checked={draft.ai.assistDraw} onChange={e => setAi({ assistDraw: e.target.checked })} /> 画画时允许 AI 起稿</label>
          {draft.ai.assistGuess && draft.ai.assistDraw && <div className="rounded-lg bg-marigold/10 border border-marigold/30 px-2 py-1 font-mono text-[10px] text-paper/80 leading-relaxed">提示：同时开启「辅助猜」和「AI 起稿」会叠加 API 请求；AMD TokenLab 限制每分钟 20 次连接，建议一次只使用一项。</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>服务商
              <select className={input} value={draft.ai.provider} onChange={e => {
                const p = AI_PROVIDERS.find(x => x.id === e.target.value);
                if (p) setAi({ provider: p.id, name: p.name, baseUrl: p.baseUrl || draft.ai.baseUrl });
              }}>
                {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className={label}>显示名<input className={input} value={draft.ai.name} onChange={e => setAi({ name: e.target.value })} /></label>
            <label className={label}>模型
              <select className={input} value={modelChoice} onChange={e => {
                if (e.target.value === '__custom__') setAi({ model: '' });
                else setAi({ model: e.target.value });
              }}>
                <option value="">（未选择）</option>
                {modelPresets.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom__">自定义（下方输入模型 ID）</option>
              </select>
            </label>
            <label className={label}>自定义模型 ID
              <input className={input} value={customModel} placeholder="例如 provider/model-name"
                onChange={e => { setCustomModel(e.target.value); setAi({ model: e.target.value }); }}
                disabled={modelIsPreset && !!draft.ai.model} />
            </label>
            <label className={label + ' col-span-2'}>Base URL<input className={input} value={draft.ai.baseUrl} onChange={e => setAi({ baseUrl: e.target.value })} /></label>
          </div>
          {isAmd && <div className="rounded-lg bg-sk/10 border border-sk/30 px-2 py-1 font-mono text-[10px] text-paper/80 leading-relaxed">
            AMD TokenLab：模型 ID 必须与 AMD LAB 目录完全一致（大小写敏感，如 Gemma-4-31B-IT）。浏览器直连可能被 CORS 拦截；此时双击项目根目录「启动 AI 代理.cmd」，把 Base URL 改为 http://127.0.0.1:8787/v1，模型与 Key 不变。代理不启动不影响游戏，未配置 Key 时 AI 只提示未配置。
          </div>}
          <label className={label}>API Key（仅存本机，不明文回显）<input className={input} type="password" autoComplete="off" value={draft.ai.apiKey} onChange={e => setAi({ apiKey: e.target.value })} /></label>
          <div className="flex items-center gap-2">
            <button onClick={runTest} disabled={testing} className="rounded-lg bg-sky text-ink px-3 py-1 font-mono text-xs disabled:opacity-50">{testing ? '测试中…' : '测试连接'}</button>
            {testResult && <span className={'font-mono text-[11px] ' + (testResult.ok ? 'text-[#0A5C4B]' : 'text-vermilion')}>{testResult.message}</span>}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={() => { setDraft({ ...DEFAULT_SETTINGS, ai: { ...DEFAULT_SETTINGS.ai } }); setCustomModel(''); setTestResult(null); }} className="rounded-lg bg-paper/40 text-paper px-3 py-2 font-mono text-xs">恢复默认</button>
          <button onClick={onClose} className="rounded-lg bg-paper/80 text-ink px-3 py-2 font-mono text-xs">取消</button>
          <button onClick={() => onSave(draft)} className="rounded-lg bg-marigold text-ink px-4 py-2 font-display">保存</button>
        </div>
        <div className="font-mono text-[9px] text-paper/40">设置保存在本机浏览器 localStorage。未填 Key 或未启用时 AI 功能只给出「未配置模型」提示，不发起任何网络请求；Key 明文保存在本机浏览器，请勿在公用设备使用。</div>
      </div>
    </div>
  );
};

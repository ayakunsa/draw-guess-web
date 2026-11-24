import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Camera, createCamera, fitCamera, clampCenter, zoomAt, wheelZoomFactor } from './camera';
import { History } from './canvas/history';
import { W, H, drawShape, type Shape } from './canvas/pen';
import { png } from './canvas/export';
import { animateProgress, partialStroke, strokeDuration, STROKE_GAP } from './canvas/playback';
import { V, COPY } from './content';
import { reducer, initialState } from './game/engine';
import { judgeGuess } from './game/rules';
import { aiGuess, aiSketch } from './ai/assist';
import { AiError } from './ai/client';
import type { AiGuess } from './ai/parse';
import { hintFor } from './game/hints';
import { createRoundRecord, addGuess, finalizeRecord, type RoundRecord } from './game/records';
import { pickWords, type Category, type Level } from './game/words';
import { loadSettings, saveSettings, type Settings } from './game/settings';
import { WordReveal } from './ui/WordReveal';
import { Handoff } from './ui/Handoff';
import { Minimap } from './ui/Minimap';
import { WordCard } from './ui/WordCard';
import { GuessInput } from './ui/GuessInput';
import { Scoreboard } from './ui/Scoreboard';
import { SettingsPanel } from './ui/Settings';
import { Palette, PRESET_COLORS } from './ui/Palette';
import { Review } from './ui/Review';

type Tool = 'pen' | 'line' | 'rect' | 'ellipse' | 'pan';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState());
  const [camera, setCamera] = useState<Camera>(createCamera);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const recordsRef = useRef<RoundRecord[]>([]);
  const paletteAnchorRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<Shape[]>(shapes);
  shapesRef.current = shapes;
  const [playing, setPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState('');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef(new History());
  const draftRef = useRef<Shape | null>(null);
  const panRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const camRef = useRef(camera);
  camRef.current = camera;
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;
  const [aiBusy, setAiBusy] = useState<'guess' | 'sketch' | null>(null);
  const [aiAnimating, setAiAnimating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiGuess | null>(null);
  const [aiNotice, setAiNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const aiTokenRef = useRef(0);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiAnimRef = useRef({ active: false, canceled: false });
  const aiAssistedRoundRef = useRef<number | null>(null);
  const configureAi = (capability: 'guess' | 'draw'): boolean => {
    const ai = settingsRef.current.ai;
    if (!ai.enabled || !ai.apiKey.trim() || !ai.model.trim()) {
      setAiNotice({ kind: 'error', text: '未配置模型：请到设置中填写 API Key、模型，并勾选“启用 AI 辅助”。' });
      return false;
    }
    if (!ai[capability === 'guess' ? 'assistGuess' : 'assistDraw']) {
      setAiNotice({ kind: 'error', text: '未配置模型：请到设置中勾选“' + (capability === 'guess' ? '猜题时允许 AI 辅助猜' : '画画时允许 AI 起稿') + '”。' });
      return false;
    }
    return true;
  };

  const drawFrame = useCallback((visible: Shape[], draft: Shape | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / W, canvas.height / H);
    const all = draft ? [...visible, draft] : visible;
    all.forEach(s => drawShape(context, s));
    context.restore();
  }, []);
  const draw = useCallback(() => drawFrame(shapes, draftRef.current), [drawFrame, shapes]);
  const replayRef = useRef({ active: false, canceled: false });

  useEffect(() => { draw(); }, [draw, shapes]);
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Per-round records: snapshot shapes at handoff, append guesses, finalize on reveal.
  useEffect(() => {
    if (state.phase === 'handoff') {
      const w = state.words[state.round - 1];
      if (w && !recordsRef.current.some(r => r.round === state.round)) {
        recordsRef.current = [...recordsRef.current, createRoundRecord(state.round, w, shapesRef.current, state.wrongLimit, aiAssistedRoundRef.current === state.round)];
      }
    } else if (state.phase === 'revealed' || state.phase === 'finished') {
      const rec = recordsRef.current.find(r => r.round === state.round);
      if (rec) {
        const result = state.feedback.includes('猜中') ? 'correct' : state.feedback.includes('机会用尽') ? 'wrong-limit' : state.feedback.includes('时间到') ? 'timeout' : 'pending';
        recordsRef.current = recordsRef.current.map(r => r.round === state.round ? finalizeRecord(r, result, state.wrongCount) : r);
      }
    }
  }, [state.phase, state.round, state.words, state.wrongLimit, state.wrongCount, state.feedback]);
  useEffect(() => {
    if (state.phase === 'drawing' || state.phase === 'guessing') {
      const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
      return () => window.clearInterval(id);
    }
  }, [state.phase]);

  const submitGuess = (value: string, confidence: number | null, source: 'human' | 'ai' = 'human') => {
    const w = state.words[state.round - 1];
    const rec = recordsRef.current.find(r => r.round === state.round);
    if (w && rec && value.trim()) {
      const judgement = judgeGuess(w, value);
      recordsRef.current = recordsRef.current.map(r => r.round === state.round ? addGuess(r, value, confidence, judgement, source) : r);
    }
    dispatch({ type: 'guess', value, confidence });
  };
  const localFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.phase !== 'drawing' || replayRef.current.active || aiAnimRef.current.active) return;
    if (e.button === 1 || e.altKey || tool === 'pan') {
      panRef.current = { sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const p = localFromEvent(e);
    const base = { color, fill: 'none', width: 5 };
    draftRef.current = tool === 'pen' || tool === 'line' ? { type: 'line', points: [[p.x, p.y]], ...base } : tool === 'rect' ? { type: 'rect', x: p.x, y: p.y, w: 0, h: 0, ...base } : { type: 'ellipse', x: p.x, y: p.y, rx: 0, ry: 0, ...base };
    e.currentTarget.setPointerCapture(e.pointerId);
    draw();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      const pan = panRef.current;
      setCamera(c => ({ ...c, x: pan.cx + e.clientX - pan.sx, y: pan.cy + e.clientY - pan.sy }));
      return;
    }
    if (!draftRef.current || state.phase !== 'drawing') return;
    const p = localFromEvent(e);
    const d = draftRef.current;
    if (d.type === 'line' || d.type === 'polygon') d.points.push([p.x, p.y]);
    else if (d.type === 'rect') { d.w = p.x - d.x; d.h = p.y - d.y; }
    else if (d.type === 'ellipse') { d.rx = Math.abs(p.x - d.x); d.ry = Math.abs(p.y - d.y); }
    draw();
  };
  const onPointerUp = () => {
    panRef.current = null;
    if (!draftRef.current) return;
    const finished = draftRef.current;
    draftRef.current = null;
    const valid = finished.type === 'line' || finished.type === 'polygon' ? finished.points.length > 1 : (finished.type === 'rect' ? Math.abs(finished.w) > 4 && Math.abs(finished.h) > 4 : finished.type === 'ellipse' ? finished.rx > 4 && finished.ry > 4 : false);
    if (valid) {
      historyRef.current.addStroke(shapes.length + 1);
      setShapes(s => [...s, finished]);
    }
    draw();
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const f = wheelZoomFactor(e.nativeEvent);
    if (f !== 1) setCamera(c => clampCenter(zoomAt(c, { x: e.clientX, y: e.clientY }, f), viewport));
  };
  const undo = () => setShapes(s => historyRef.current.undo(s));
  const clear = () => setShapes(s => historyRef.current.clear(s));
  const fit = () => setCamera(c => fitCamera(c, viewport, { x: 0, y: 0, w: W, h: H }));
  const replay = async () => {
    if (!shapes.length || replayRef.current.active) return;
    replayRef.current = { active: true, canceled: false };
    setPlaying(true);
    setReplayProgress('0/' + shapes.length);
    draftRef.current = null;
    drawFrame([], null);
    try {
      for (let i = 0; i < shapes.length; i++) {
        if (replayRef.current.canceled) break;
        const sh = shapes[i];
        setReplayProgress((i + 1) + '/' + shapes.length);
        const done = await animateProgress(strokeDuration(sh, settingsRef.current.speed), {
          draw: p => drawFrame(shapes.slice(0, i), p >= 1 ? null : partialStroke(sh, p)),
          isActive: () => replayRef.current.active && !replayRef.current.canceled,
        });
        drawFrame(shapes.slice(0, i + 1), null);
        if (!done || replayRef.current.canceled) break;
        if (i < shapes.length - 1 && !replayRef.current.canceled) await new Promise(r => setTimeout(r, STROKE_GAP));
      }
    } finally {
      replayRef.current.active = false;
      replayRef.current.canceled = false;
      setPlaying(false);
      setReplayProgress('');
      draw();
    }
  };
  const skipReplay = () => { replayRef.current.canceled = true; };

  // ---- AI add-on: every request is user-triggered; no Key => no fetch ----
  const requestAiGuess = async () => {
    if (aiBusy || !configureAi('guess')) return;
    const token = aiTokenRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiBusy('guess'); setAiSuggestion(null); setAiNotice(null);
    try {
      const result = await aiGuess(settingsRef.current, shapesRef.current, hint, controller.signal);
      if (token !== aiTokenRef.current) return;
      setAiSuggestion(result);
    } catch (err) {
      if (token !== aiTokenRef.current) return;
      setAiNotice({ kind: 'error', text: err instanceof AiError && err.kind === 'network' ? err.message + '（可能是浏览器跨域限制，换支持 CORS 的接口或加本地代理）' : err instanceof Error ? err.message : 'AI 辅助猜失败' });
    } finally {
      if (token === aiTokenRef.current) setAiBusy(null);
    }
  };
  const adoptAiGuess = () => {
    if (!aiSuggestion) return;
    submitGuess(aiSuggestion.guess, aiSuggestion.confidence, 'ai');
    setAiSuggestion(null); setAiNotice(null);
  };
  const requestAiSketch = async () => {
    if (aiBusy || aiAnimRef.current.active || !configureAi('draw')) return;
    const word = state.words[state.round - 1];
    if (!word) return;
    const token = aiTokenRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiBusy('sketch'); setAiNotice(null);
    let generated: Shape[] = [];
    let baseLen = 0;
    try {
      generated = await aiSketch(settingsRef.current, word, controller.signal);
      if (token !== aiTokenRef.current) return;
      const base = shapesRef.current.slice();
      baseLen = base.length;
      aiAssistedRoundRef.current = state.round;
      aiAnimRef.current = { active: true, canceled: false };
      setAiAnimating(true);
      setAiNotice({ kind: 'info', text: 'AI 已起稿 · 接下来由你完成' });
      for (let i = 0; i < generated.length; i++) {
        if (aiAnimRef.current.canceled || token !== aiTokenRef.current || phaseRef.current !== 'drawing') break;
        const sh = generated[i];
        const done = await animateProgress(strokeDuration(sh, settingsRef.current.speed), {
          draw: p => drawFrame(base, p >= 1 ? null : partialStroke(sh, p)),
          isActive: () => aiAnimRef.current.active && !aiAnimRef.current.canceled && token === aiTokenRef.current && phaseRef.current === 'drawing',
        });
        drawFrame([...base, ...generated.slice(0, i + 1)], null);
        if (!done) break;
        if (i < generated.length - 1) await new Promise(r => setTimeout(r, STROKE_GAP));
      }
    } catch (err) {
      if (token !== aiTokenRef.current) return;
      setAiNotice({ kind: 'error', text: err instanceof AiError && err.kind === 'network' ? err.message + '（可能是浏览器跨域限制，换支持 CORS 的接口或加本地代理）' : err instanceof Error ? err.message : 'AI 起稿失败' });
    } finally {
      if (generated.length && baseLen >= 0 && token === aiTokenRef.current) {
        setShapes(s => [...s, ...generated]);
        historyRef.current.addStroke(baseLen + generated.length); // one undo unit for the whole sketch
      }
      aiAnimRef.current.active = false;
      setAiAnimating(false);
      if (token === aiTokenRef.current) setAiBusy(null);
      draw();
    }
  };
  const takeOverSketch = () => { aiAnimRef.current.canceled = true; setAiAnimating(false); };

  useEffect(() => {
    aiTokenRef.current++;
    aiAbortRef.current?.abort();
    aiAnimRef.current.canceled = true;
    setAiAnimating(false);
    setAiSuggestion(null); setAiNotice(null);
  }, [state.round, state.phase]);

  const startGame = () => {
    recordsRef.current = [];
    aiAssistedRoundRef.current = null;
    setPaletteOpen(false);
    const cfg = settingsRef.current;
    const cfgCategory = (cfg.category as Category) || '成语';
    const cfgLevel = (cfg.level as Level) || 'easy';
    dispatch({ type: 'start', words: pickWords(cfg.rounds, cfgCategory, cfgLevel), drawSeconds: cfg.drawSeconds, guessSeconds: cfg.guessSeconds, wrongLimit: cfg.wrongLimit });
  };
  const applySettings = (value: Settings) => { setSettings(saveSettings(value)); setSettingsOpen(false); };
  const activeRole = state.phase === 'handoff' || state.phase === 'guessing' ? 'guesser' : 'drawer';
  const currentWord = state.words[state.round - 1];
  const hint = hintFor(currentWord);
  const answerVisible = state.phase === 'revealed' || state.phase === 'finished';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-mat">
      <div className="grid-layer absolute inset-0" style={{ transform: `translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.k})`, transformOrigin: '0 0' }} />
      <div className="vignette absolute inset-0" />

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <div className="font-display text-3xl text-paper drop-shadow">{V.BRAND}</div>
        <div className="font-mono text-[11px] text-paper/80">{COPY.tagline}</div>
        <WordCard word={currentWord} round={state.round} total={state.words.length || settings.rounds} revealed={state.phase === 'wordReveal' || answerVisible} hint={hint} />
        <Scoreboard scores={state.scores} activeRole={activeRole} />
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        <div className="font-mono text-xs text-paper">
          {'⏱ ' + state.timer + 's / ' + state.duration + 's · ' + state.phase}
          {(state.phase === 'guessing' || state.phase === 'revealed') && (' · 猜错 ' + state.wrongCount + '/' + state.wrongLimit)}
        </div>
        {state.feedback && <div className="bg-vermilion text-paper rounded-xl px-4 py-2 font-display shadow">{state.feedback + (currentWord && answerVisible ? ' · ' + currentWord.answer : '')}</div>}
        {state.phase === 'idle' && <button className="rounded-xl bg-marigold text-ink px-4 py-2 font-display" onClick={startGame}>开始游戏</button>}
        {state.phase === 'drawing' && <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={() => dispatch({ type: 'handoff' })}>{COPY.handoff}</button>}
        {state.phase === 'drawing' && (
          <div className="flex gap-1">
            <button className="rounded-xl bg-sky text-ink px-3 py-2 font-mono text-xs disabled:opacity-50" disabled={aiBusy !== null || aiAnimating} onClick={requestAiSketch}>{aiBusy === 'sketch' ? '起稿中…' : '🤖 AI 起稿'}</button>
            {aiAnimating && <button className="rounded-xl bg-vermilion text-paper px-3 py-2 font-mono text-xs" onClick={takeOverSketch}>🙋 我来接手</button>}
          </div>
        )}
        {state.phase === 'guessing' && <button className="rounded-xl bg-sky text-ink px-3 py-2 font-mono text-xs disabled:opacity-50" disabled={aiBusy !== null} onClick={requestAiGuess}>{aiBusy === 'guess' ? 'AI 思考中…' : '🤖 AI 辅助猜'}</button>}
        {aiNotice && <div className={'rounded-lg px-3 py-1 font-mono text-[11px] max-w-[240px] ' + (aiNotice.kind === 'error' ? 'bg-vermilion text-paper' : 'bg-paper text-ink')}>{aiNotice.text} <button className="underline" onClick={() => setAiNotice(null)}>关闭</button></div>}
        {state.phase === 'revealed' && <button className="rounded-xl bg-marigold text-ink px-4 py-2 font-display" onClick={() => dispatch({ type: 'newRound' })}>{COPY.newRound}</button>}
        {state.phase === 'finished' && <button className="rounded-xl bg-marigold text-ink px-4 py-2 font-display" onClick={() => { recordsRef.current = []; dispatch({ type: 'reset' }); }}>再来一局</button>}
        <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={() => setReviewOpen(true)}>📖 复盘</button>
        <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={() => setSettingsOpen(true)}>⚙ 设置</button>
        <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={() => setCamera(c => zoomAt(c, { x: viewport.width / 2, y: viewport.height / 2 }, 1.2))}>＋</button>
        <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={() => setCamera(c => zoomAt(c, { x: viewport.width / 2, y: viewport.height / 2 }, 1 / 1.2))}>－</button>
        <button className="rounded-xl bg-paper/90 text-ink px-4 py-2 font-mono text-xs" onClick={fit}>适应画桌</button>
      </div>

      <canvas
        ref={canvasRef} width={W} height={H}
        className="canvas-surface absolute inset-0 w-full h-full z-[5] cursor-crosshair"
        style={{ transform: `translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.k})`, transformOrigin: '0 0' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-wrap gap-2 items-center bg-mat-deep/80 rounded-2xl px-3 py-2">
        {(['pen', 'line', 'rect', 'ellipse'] as Tool[]).map(t => (
          <button key={t} onClick={() => setTool(t)} className={`rounded-lg px-3 py-1 font-mono text-xs ${tool === t ? 'bg-marigold text-ink' : 'bg-paper/80 text-ink'}`}>{t}</button>
        ))}
        <div ref={paletteAnchorRef} className="relative">
          <button title="调色板" aria-label="打开调色板" onClick={() => { if (!settingsOpen) setPaletteOpen(o => !o); }} className="w-7 h-7 rounded-full border-2 border-ink/60 shadow" style={{ background: color }} />
          <button onClick={() => { if (!settingsOpen) setPaletteOpen(o => !o); }} className="rounded-lg bg-marigold text-ink px-2 py-1 font-mono text-xs">🎨 调色板</button>
          {paletteOpen && <Palette current={color} onPick={setColor} onClose={() => setPaletteOpen(false)} anchorRef={paletteAnchorRef} />}
        </div>
        <button onClick={undo} disabled={playing} className="rounded-lg bg-paper/80 text-ink px-3 py-1 font-mono text-xs">{COPY.undo}</button>
        <button onClick={clear} disabled={playing} className="rounded-lg bg-paper/80 text-ink px-3 py-1 font-mono text-xs">{COPY.clear}</button>
        <button onClick={() => { const a = document.createElement('a'); a.href = png(shapes); a.download = 'drawing.png'; a.click(); }} className="rounded-lg bg-paper/80 text-ink px-3 py-1 font-mono text-xs">{COPY.exportPng}</button>
        <button onClick={replay} disabled={playing} className="rounded-lg bg-sky text-ink px-3 py-1 font-mono text-xs">{playing ? '回放中…' : COPY.playback}</button>
        {playing && <span className="font-mono text-[10px] text-paper">{replayProgress}</span>}
        {playing && <button onClick={skipReplay} className="rounded-lg bg-vermilion text-paper px-3 py-1 font-mono text-xs">{COPY.skipReveal}</button>}
      </div>

      {state.phase === 'wordReveal' && (
        <WordReveal word={currentWord} round={state.round} total={state.words.length || settings.rounds} onBegin={() => dispatch({ type: 'beginDraw', seconds: settingsRef.current.drawSeconds })} />
      )}
      {state.phase === 'handoff' && <Handoff onBegin={() => dispatch({ type: 'beginGuess', seconds: settingsRef.current.guessSeconds })} />}
      {state.phase === 'guessing' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
          <div className="rounded-lg bg-mat-deep/80 text-paper px-3 py-1 font-mono text-[11px]">{'提示：' + hint + '（猜错不揭晓谜底，猜中才显示）'}</div>
          {aiSuggestion && (
            <div className="rounded-xl bg-paper text-ink px-3 py-2 font-mono text-xs shadow max-w-md">
              <div>{'🤖 建议：' + aiSuggestion.guess + '（把握 ' + aiSuggestion.confidence + '%）'}</div>
              {aiSuggestion.reason && <div className="text-[10px] opacity-70">{aiSuggestion.reason}</div>}
              <button className="mt-1 rounded-lg bg-marigold px-2 py-1" onClick={adoptAiGuess}>采用并提交</button>
            </div>
          )}
          <GuessInput onSubmit={submitGuess} />
        </div>
      )}
      <Minimap camera={camera} viewport={viewport} world={{ x: 0, y: 0, w: W, h: H }} />
      {settingsOpen && <SettingsPanel value={settings} onSave={applySettings} onClose={() => setSettingsOpen(false)} />}
      {reviewOpen && <Review records={recordsRef.current} onClose={() => setReviewOpen(false)} />}
      <div className="absolute bottom-1 left-2 z-10 font-mono text-[9px] text-paper/50">{V.CREDIT}</div>
    </div>
  );
}

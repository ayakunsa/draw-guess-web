import React, { useEffect, useRef, useState } from 'react';
import { W, H, paint, type Shape } from '../canvas/pen';
import { animateProgress, partialStroke, strokeDuration, STROKE_GAP } from '../canvas/playback';
import type { RoundRecord } from '../game/records';
import { submittedLabel } from '../game/confidence';

interface Props { records: RoundRecord[]; onClose: () => void; }

export const Review: React.FC<Props> = ({ records, onClose }) => {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canceledRef = useRef(false);
  const rec = records[selected];
  const RESULT: Record<string, string> = { pending: '未结束', correct: '猜中', 'wrong-limit': '机会用尽', timeout: '猜词超时' };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    canceledRef.current = true; setPlaying(false);
    const canvas = canvasRef.current;
    if (canvas && rec) paint(canvas, rec.shapes);
  }, [selected, rec]);

  const replay = async () => {
    if (!rec || !canvasRef.current || playing) return;
    canceledRef.current = false; setPlaying(true);
    const canvas = canvasRef.current, shapes = rec.shapes;
    const frame = (visible: Shape[], draft: Shape | null) => { paint(canvas, draft ? [...visible, draft] : visible); };
    try {
      frame([], null);
      for (let i = 0; i < shapes.length; i++) {
        if (canceledRef.current) return;
        const sh = shapes[i];
        const done = await animateProgress(strokeDuration(sh), {
          draw: p => frame(shapes.slice(0, i), p >= 1 ? null : partialStroke(sh, p)),
          isActive: () => !canceledRef.current,
        });
        if (!done) return;
        frame(shapes.slice(0, i + 1), null);
        if (i < shapes.length - 1) await new Promise(r => setTimeout(r, STROKE_GAP));
      }
    } finally { if (!canceledRef.current) setPlaying(false); }
  };
  const stop = () => { canceledRef.current = true; setPlaying(false); if (rec && canvasRef.current) paint(canvasRef.current, rec.shapes); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
      <div className="w-full max-w-5xl bg-paper rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
          <span className="font-display text-xl text-ink">📖 回合复盘</span>
          <button onClick={onClose} className="rounded-lg bg-ink text-paper px-3 py-1 font-mono text-xs">关闭 ✕</button>
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-44 shrink-0 border-r border-ink/10 overflow-y-auto bg-paper/60 p-2 space-y-1">
            {records.length === 0 && <div className="font-mono text-xs text-ink/50 p-2">暂无回合记录</div>}
            {records.map((r, i) => (
              <button key={r.round} onClick={() => setSelected(i)}
                className={'w-full text-left rounded-lg px-2 py-2 font-mono text-xs ' + (i === selected ? 'bg-marigold/30 ring-1 ring-marigold' : 'hover:bg-ink/5')}>
                <div className="text-ink font-bold">第 {r.round} 回合</div>
                <div className="text-ink/60 truncate">{r.word.answer}</div>
                <div className="text-[10px] text-ink/50">{RESULT[r.result] || r.result}</div>
              </button>
            ))}
          </div>
          <div className="flex-1 flex flex-col min-w-0 p-4 gap-3 overflow-y-auto">
            {rec ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-ink">题目：<b>{rec.word.answer}</b> · {rec.word.category} · {RESULT[rec.result] || rec.result} · 猜错 {rec.wrongCount}/{rec.wrongLimit}</div>
                  <div className="flex gap-2">
                    <button onClick={playing ? stop : replay} className="rounded-lg bg-ink text-paper px-3 py-1 font-mono text-xs">{playing ? '⏹ 停止' : '▶ 重播绘制'}</button>
                  </div>
                </div>
                <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-lg border border-ink/20 bg-white" />
                <div className="font-mono text-xs text-ink">猜谜记录（{rec.guesses.length} 次）</div>
                <div className="border border-ink/10 rounded-lg overflow-hidden">
                  <table className="w-full font-mono text-xs text-ink">
                    <thead className="bg-ink/5"><tr><th className="text-left p-1.5">#</th><th className="text-left p-1.5">猜测</th><th className="text-left p-1.5">结果</th><th className="text-left p-1.5">把握</th></tr></thead>
                    <tbody>
                      {rec.guesses.map((g, i) => (
                        <tr key={i} className="border-t border-ink/10">
                          <td className="p-1.5">{i + 1}</td><td className="p-1.5">{g.value}</td>
                          <td className={'p-1.5 ' + (g.judgement.correct ? 'text-[#0A5C4B]' : 'text-vermilion')}>{g.judgement.correct ? '✅ 猜中' : '❌ 未中'}</td>
                          <td className="p-1.5">{g.confidence == null ? '—' : submittedLabel(g.confidence)}</td>
                        </tr>
                      ))}
                      {rec.guesses.length === 0 && <tr><td colSpan={4} className="p-2 text-ink/50">本回合无猜谜记录</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="font-mono text-sm text-ink/50">请选择左侧回合</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
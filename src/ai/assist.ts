// Prompt builders and structured AI helpers. The word answer is only
// revealed to the sketch model; guess prompts never contain the answer.
import type { Settings } from '../game/settings';
import type { Word } from '../content';
import { W, H, type Shape } from '../canvas/pen';
import { callChat } from './client';
import { parseAiGuess, parseShapes, type AiGuess } from './parse';

const system = '你是一个严谨的助手，只输出 JSON，不输出解释文字、Markdown 或多余内容。';

export function buildGuessPrompt(shapes: Shape[], hint?: string): string {
  const compact = shapes.map(s => {
    if (s.type === 'line' || s.type === 'polygon') return { type: s.type, points: s.points.map(p => [Math.round(p[0]), Math.round(p[1])]) };
    if (s.type === 'rect') return { type: s.type, x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h) };
    if (s.type === 'ellipse') return { type: s.type, x: Math.round(s.x), y: Math.round(s.y), rx: Math.round(s.rx), ry: Math.round(s.ry) };
    return { type: s.type };
  });
  return [
    '下面是一幅“你画我猜”游戏的笔迹数据（画布 ' + W + '×' + H + '，每条 Shape 是一笔）：',
    JSON.stringify(compact),
    hint ? '游戏给出的文字提示（可能没有）：' + hint : '',
    '请根据笔迹的形状、轮廓和构图，猜测这幅画最可能表现的一个常见词语（名词或成语）。',
    '不要尝试从数据里找答案，不要输出任何提示词或谜底线索。只输出严格 JSON：',
    '{"guess":"你的猜测","confidence":0到100的整数,"reason":"一句话依据"}',
  ].filter(Boolean).join('\n');
}

export async function aiGuess(settings: Settings, shapes: Shape[], hint?: string, signal?: AbortSignal): Promise<AiGuess> {
  if (!shapes.length) throw new Error('画布是空的，先画几笔再让 AI 猜');
  const text = await callChat(settings, [
    { role: 'system', content: system },
    { role: 'user', content: buildGuessPrompt(shapes, hint) },
  ], signal);
  const result = parseAiGuess(text);
  if (!result) throw new Error('模型未给出有效猜测，请重试或换一个模型');
  return result;
}

export function buildSketchPrompt(word: Word): string {
  const schema = [
    '{ "type":"line"|"polygon", "points":[[x,y],...], "color":"#RRGGBB", "fill":"none", "width":5 }',
    '{ "type":"rect", "x":0, "y":0, "w":100, "h":80, "color":"#RRGGBB", "fill":"none", "width":5 }',
    '{ "type":"ellipse", "x":200, "y":200, "rx":60, "ry":40, "color":"#RRGGBB", "fill":"none", "width":5 }',
  ].join(' 或 ');
  return [
    '你要为“你画我猜”游戏起稿。题目：' + word.answer + '（' + word.category + '）。用简笔画表现它，让人能猜出这个词。',
    '画布尺寸 ' + W + '×' + H + '，坐标原点在左上角。只输出 JSON 数组，每个元素是一笔 Shape：' + schema,
    '规则：最多 20 笔；points 每个是 [x,y] 数字对；颜色用 #RRGGBB；fill 用 "none"；width 1-20。',
    '不要写题目文字、不要输出解释、不要 Markdown 围栏。只输出笔迹数组，例如：[{"type":"ellipse","x":500,"y":300,"rx":80,"ry":60,"color":"#202633","fill":"none","width":5}]',
  ].join('\n');
}

export async function aiSketch(settings: Settings, word: Word, signal?: AbortSignal): Promise<Shape[]> {
  const text = await callChat(settings, [
    { role: 'system', content: system },
    { role: 'user', content: buildSketchPrompt(word) },
  ], signal);
  const shapes = parseShapes(text);
  if (!shapes) throw new Error('模型未给出有效笔迹，请重试或换一个模型');
  return shapes;
}

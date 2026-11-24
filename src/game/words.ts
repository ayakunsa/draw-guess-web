// Word banks & random drawing — ported from ai-draw-guess/lib/words.mjs
// Sources: data/idioms.json + data/category-words.json (see data/SOURCES.md).
// Rule helpers (normalize/judgeGuess) stay in game/rules.ts — one source only.
import idioms from '../data/idioms.json';
import categoryWords from '../data/category-words.json';
import type { Word } from '../content';

export type Level = 'easy' | 'normal' | 'challenge';
export const LEVEL_NAMES: Record<Level, string> = { easy: '入门', normal: '进阶', challenge: '挑战' };
export const CATEGORIES = ['成语', '动物', '食物', '物品', '职业', '动作', '故事'] as const;
export type Category = typeof CATEGORIES[number];

const aliases: Record<string, string[]> = {
  '风中残烛': ['风烛残年'], '自行车': ['单车', '脚踏车'], '猫': ['小猫', '猫咪'], '狗': ['小狗', '狗狗'],
  '熊猫': ['大熊猫'], '冰淇淋': ['冰激凌'], '西瓜': ['watermelon'], '兔子': ['兔'],
  '锅碗瓢盆': ['鍋碗瓢盆'], '眼花缭乱': ['眼花繚亂'],
};
const entries = (answers: string[], category: string): Word[] =>
  answers.map(answer => ({ answer, category, aliases: aliases[answer] || [] }));

const idiomPools: Record<Level, Word[]> = {
  easy: entries(idioms.easy as string[], '成语'),
  normal: entries(idioms.normal as string[], '成语'),
  challenge: entries(idioms.challenge as string[], '成语'),
};
const categoryPools = Object.fromEntries(
  Object.entries(categoryWords).map(([category, levels]) => [
    category,
    Object.fromEntries(Object.entries(levels).map(([level, answers]) => [level, entries(answers as string[], category)])),
  ])
) as Record<string, Record<Level, Word[]>>;

export const CATEGORY_LEVELS: Record<Category, { id: Level; name: string; count: number }[]> =
  Object.fromEntries(CATEGORIES.map(category => {
    const counts = category === '成语' ? idiomPools : categoryPools[category];
    const levels: { id: Level; name: string; count: number }[] = (['easy', 'normal', 'challenge'] as Level[])
      .map(id => ({ id, name: LEVEL_NAMES[id], count: counts[id].length }));
    return [category, levels];
  })) as Record<Category, { id: Level; name: string; count: number }[]>;

export function getWordPool(category: Category, level: Level = 'easy'): Word[] {
  return category === '成语' ? idiomPools[level] : (categoryPools[category]?.[level] ?? []);
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Draw count distinct words at random each time; never repeats within a game.
export function pickWords(count: number, category: Category = '动物', level: Level = 'easy', rng: () => number = Math.random): Word[] {
  const n = Math.max(1, Math.min(Math.floor(count), 8));
  const pool = getWordPool(category, level);
  if (!pool.length) return [];
  return shuffle(pool, rng).slice(0, Math.min(n, pool.length));
}

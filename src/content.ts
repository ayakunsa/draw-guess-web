// Single source of truth for copy, variables and local word subset.
// Variables: [BRAND] / [WORD_LIST] / [ROUNDS] / [TIMER] / [CREDIT]
export const V = {
  BRAND: 'Meadowmint Draw',
  WORD_LIST: '动物 · 食物 · 物品',
  ROUNDS: 5,
  TIMER: 60,
  CREDIT: '模板 VibeFather · 玩法内核 ai-draw-guess · 均为本地素材改写',
};
export const COPY = {
  tagline: '画出来，让别人猜。只在本机运行。',
  roleDrawer: '你画', roleGuesser: '你猜',
  wordCard: '轮到你画',
  drawHint: '画桌：拖动画笔或选择形状；滚轮/双指缩放；空白处拖动平移。',
  guessPlaceholder: '输入你猜的词，回车提交…',
  submit: '提交猜测', confidence: '你对这次猜测的把握',
  score: '本局得分', round: '回合', switchRole: '切换角色', newRound: '下一回合',
  undo: '撤销', clear: '清空', exportPng: '导出 PNG',
  playback: '回放绘制', skipReveal: '跳过回放', timeLeft: '剩余时间',
  revealHint: '画师请看词，猜者请暂时回避屏幕', beginDraw: '记住了，开始画',
  handoff: '画完了，交给猜者', handoffTitle: '请把设备交给猜者',
  handoffHint: '猜者接手后点下面的按钮开始猜，画师请先不要看屏幕。', beginGuess: '我是猜者，开始猜',
  guessed: '猜中了！', missed: '没猜中', reveal: '答案揭晓', idle: '等待开始',
};
// Small, real subsets from ai-draw-guess/data/category-words.json. Full dictionary stays upstream.
export type Word = { answer: string; category: string; aliases: string[] };
export const WORDS: Word[] = [
  { answer: '猫', category: '动物', aliases: ['猫咪', '小猫'] },
  { answer: '狗', category: '动物', aliases: ['小狗', '狗狗'] },
  { answer: '兔子', category: '动物', aliases: ['小白兔'] },
  { answer: '仓鼠', category: '动物', aliases: [] },
  { answer: '刺猬', category: '动物', aliases: [] },
  { answer: '熊猫', category: '动物', aliases: ['大熊猫'] },
  { answer: '长颈鹿', category: '动物', aliases: [] },
  { answer: '苹果', category: '食物', aliases: ['红富士'] },
  { answer: '香蕉', category: '食物', aliases: [] },
  { answer: '披萨', category: '食物', aliases: ['比萨'] },
  { answer: '汉堡', category: '食物', aliases: ['汉堡包'] },
  { answer: '冰淇淋', category: '食物', aliases: ['雪糕'] },
  { answer: '雨伞', category: '物品', aliases: ['伞'] },
  { answer: '自行车', category: '物品', aliases: ['单车'] },
  { answer: '台灯', category: '物品', aliases: ['灯'] },
  { answer: '钥匙', category: '物品', aliases: [] },
  { answer: '眼镜', category: '物品', aliases: [] },
  { answer: '咖啡杯', category: '物品', aliases: ['杯子'] },
];
export function pickWords(rounds: number, offset = 0): Word[] {
  const n = Math.max(1, Math.min(rounds, 8));
  return Array.from({ length: n }, (_, i) => WORDS[(offset + i * 3) % WORDS.length]);
}